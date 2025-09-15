import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Comment, CommentState } from "../types";
import { supabaseReviews } from "../services/supabase";
import { supabase } from "../config/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { notificationService } from "../services/notificationService";
import useAuthStore from "./authStore";
import { requireAuthentication, getUserDisplayName } from "../utils/authUtils";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

// Constants for data limits
const MAX_PERSISTED_COMMENTS_PER_REVIEW = 20;

// Sanitize comments for persistence - remove sensitive content
const sanitizeCommentsForPersistence = (comments: {
  [reviewId: string]: Comment[];
}): { [reviewId: string]: Comment[] } => {
  const sanitized: { [reviewId: string]: Comment[] } = {};

  Object.entries(comments).forEach(([reviewId, reviewComments]) => {
    // Limit number of comments per review
    const limitedComments = reviewComments.slice(0, MAX_PERSISTED_COMMENTS_PER_REVIEW);

    sanitized[reviewId] = limitedComments.map((comment) => ({
      ...comment,
      // Anonymize author information
      authorName: comment.authorName ? comment.authorName.substring(0, 1) + "***" : "Anonymous",
      authorId: comment.authorId ? "anon_" + comment.authorId.substring(0, 8) : "anonymous",
      // Limit content length
      content: comment.content
        ? comment.content.substring(0, 100) + (comment.content.length > 100 ? "..." : "")
        : comment.content,
      // Remove media references
      mediaId: undefined,
    }));
  });

  return sanitized;
};

interface CommentsStore extends CommentState {
  // Actions
  loadComments: (reviewId: string) => Promise<void>;
  createComment: (reviewId: string, content: string, mediaId?: string) => Promise<void>;
  likeComment: (reviewId: string, commentId: string) => Promise<void>;
  dislikeComment: (reviewId: string, commentId: string) => Promise<void>;
  deleteComment: (reviewId: string, commentId: string) => Promise<void>;

  // Real-time subscriptions
  subscribeToComments: (reviewId: string) => () => void;
  unsubscribeFromComments: (reviewId: string) => void;

  // State management
  setLoading: (isLoading: boolean) => void;
  setPosting: (isPosting: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const useCommentsStore = create<CommentsStore>()(
  persist(
    (set, get) => {
      // Store real-time subscriptions
      const subscriptions = new Map<string, RealtimeChannel>();

      return {
        // State
        comments: {},
        commentThreads: {},
        mediaComments: {},
        isLoading: false,
        isPosting: false,
        error: null,

        // Actions
        loadComments: async (reviewId: string) => {
          try {
            set({ isLoading: true, error: null });

            const { reviewsService } = await import("../services/reviews");
            const comments = await reviewsService.getReviewComments(reviewId);

            set((state) => ({
              comments: {
                ...state.comments,
                [reviewId]: comments,
              },
              isLoading: false,
            }));
          } catch (error) {
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set({
              error: appError.userMessage,
              isLoading: false,
            });
          }
        },

        createComment: async (reviewId: string, content: string, mediaId?: string) => {
          try {
            set({ isPosting: true, error: null });

            // Simple, safe authentication check - prefer store state
            const storeState = useAuthStore.getState();
            if (!storeState.isAuthenticated || !storeState.user) {
              throw new Error("Must be signed in to comment");
            }

            const user = storeState.user;
            console.log("💬 Creating comment for user:", user.id);

            const commentData: Omit<Comment, "id" | "createdAt" | "updatedAt"> = {
              reviewId,
              authorId: user.id,
              authorName: getUserDisplayName(user),
              content: content.trim(),
              likeCount: 0,
              dislikeCount: 0,
              ...(mediaId && { mediaId }),
            };

            // Create the comment with timestamp for optimistic update
            const optimisticComment: Comment = {
              ...commentData,
              id: `temp_${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Optimistically add to local state
            set((state) => ({
              comments: {
                ...state.comments,
                [reviewId]: [...(state.comments[reviewId] || []), optimisticComment],
              },
              isPosting: false,
            }));

            // Save to Supabase and then create notifications
            try {
              const { reviewsService } = await import("../services/reviews");
              const createdComment = await reviewsService.createComment(commentData);

              // Replace optimistic comment with server comment
              set((state) => ({
                comments: {
                  ...state.comments,
                  [reviewId]: (state.comments[reviewId] || []).map((c) =>
                    c.id === optimisticComment.id ? createdComment : c,
                  ),
                },
              }));

              // Notify review author about new comment (if not self)
              const review = await supabaseReviews.getReview(reviewId);
              const currentUser = useAuthStore.getState().user;
              if (review?.authorId && review.authorId !== currentUser?.id) {
                await notificationService.createNotification(review.authorId, {
                  type: "new_comment",
                  title: "New comment on your review",
                  body: commentData.content.slice(0, 100),
                  data: { reviewId, commentId: createdId },
                });
              }

              // If replying to a comment, also notify parent comment author (if different)
              if ((commentData as any).parentCommentId) {
                const { data: parent, error: parentErr } = await supabase
                  .from("comments_firebase")
                  .select("author_id")
                  .eq("id", (commentData as any).parentCommentId)
                  .single();
                if (
                  !parentErr &&
                  parent?.author_id &&
                  parent.author_id !== currentUser?.id &&
                  parent.author_id !== review?.authorId
                ) {
                  await notificationService.createNotification(parent.author_id, {
                    type: "new_comment",
                    title: "Someone replied to your comment",
                    body: commentData.content.slice(0, 100),
                    data: { reviewId, parentCommentId: (commentData as any).parentCommentId, commentId: createdId },
                  });
                }
              }
            } catch (persistErr) {
              console.warn("Failed to save comment or create notifications:", persistErr);
              // Rollback optimistic comment on failure
              set((state) => ({
                comments: {
                  ...state.comments,
                  [reviewId]: (state.comments[reviewId] || []).filter((c) => c.id !== optimisticComment.id),
                },
              }));
            }
          } catch (error) {
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set({
              error: appError.userMessage,
              isPosting: false,
            });
          }
        },

        likeComment: async (reviewId: string, commentId: string) => {
          try {
            const currentComments = get().comments[reviewId] || [];
            const comment = currentComments.find((c) => c.id === commentId);

            if (comment) {
              const newLikeCount = comment.likeCount + 1;
              const wasDisliked = comment.isDisliked;
              const newDislikeCount = wasDisliked ? comment.dislikeCount - 1 : comment.dislikeCount;

              // Update local state optimistically
              set((state) => ({
                comments: {
                  ...state.comments,
                  [reviewId]:
                    state.comments[reviewId]?.map((c) =>
                      c.id === commentId
                        ? {
                            ...c,
                            likeCount: newLikeCount,
                            dislikeCount: newDislikeCount,
                            isLiked: true,
                            isDisliked: false,
                          }
                        : c,
                    ) || [],
                },
              }));

              // Update in Supabase - Note: This functionality needs to be implemented in reviewsService
              // For now, we'll skip the database update as the service doesn't support comment updates
              console.warn("Comment like/dislike update not implemented in reviewsService");
            }
          } catch (error) {
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set({
              error: appError.userMessage,
            });
          }
        },

        dislikeComment: async (reviewId: string, commentId: string) => {
          try {
            const currentComments = get().comments[reviewId] || [];
            const comment = currentComments.find((c) => c.id === commentId);

            if (comment) {
              const newDislikeCount = comment.dislikeCount + 1;
              const wasLiked = comment.isLiked;
              const newLikeCount = wasLiked ? comment.likeCount - 1 : comment.likeCount;

              // Update local state optimistically
              set((state) => ({
                comments: {
                  ...state.comments,
                  [reviewId]:
                    state.comments[reviewId]?.map((c) =>
                      c.id === commentId
                        ? {
                            ...c,
                            likeCount: newLikeCount,
                            dislikeCount: newDislikeCount,
                            isLiked: false,
                            isDisliked: true,
                          }
                        : c,
                    ) || [],
                },
              }));

              // Update in Supabase - Note: This functionality needs to be implemented in reviewsService
              // For now, we'll skip the database update as the service doesn't support comment updates
              console.warn("Comment like/dislike update not implemented in reviewsService");
            }
          } catch (error) {
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set({
              error: appError.userMessage,
            });
          }
        },

        deleteComment: async (reviewId: string, commentId: string) => {
          try {
            // Remove from local state optimistically
            set((state) => ({
              comments: {
                ...state.comments,
                [reviewId]: state.comments[reviewId]?.filter((c) => c.id !== commentId) || [],
              },
            }));

            // Delete from Supabase
            const { reviewsService } = await import("../services/reviews");
            await reviewsService.deleteComment(commentId);
          } catch (error) {
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set({
              error: appError.userMessage,
            });
            // Could reload comments here to restore state
          }
        },

        setLoading: (isLoading) => {
          set({ isLoading });
        },

        setPosting: (isPosting) => {
          set({ isPosting });
        },

        setError: (error) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // Real-time subscription methods
        subscribeToComments: (reviewId: string) => {
          // Don't create duplicate subscriptions
          if (subscriptions.has(reviewId)) {
            return subscriptions.get(reviewId)!.unsubscribe;
          }

          const mapRowToComment = (row: any): Comment => ({
            id: row.id,
            reviewId: row.review_id,
            authorId: row.author_id,
            authorName: row.author_name,
            content: row.content,
            likeCount: row.like_count || 0,
            dislikeCount: row.dislike_count || 0,
            parentCommentId: row.parent_comment_id,
            mediaId: row.media_id,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
            isDeleted: row.is_deleted,
            isReported: row.is_reported,
          });

          const channel = supabase
            .channel(`comments-${reviewId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "comments_firebase",
                filter: `review_id=eq.${reviewId}`,
              },
              (payload: any) => {
                console.log("Comment change received:", payload.eventType, payload.new?.id || payload.old?.id);

                if (payload.eventType === "INSERT") {
                  const newComment = mapRowToComment(payload.new);
                  set((state) => ({
                    comments: {
                      ...state.comments,
                      [reviewId]: [...(state.comments[reviewId] || []), newComment],
                    },
                  }));
                } else if (payload.eventType === "UPDATE") {
                  const updatedComment = mapRowToComment(payload.new);
                  set((state) => ({
                    comments: {
                      ...state.comments,
                      [reviewId]: (state.comments[reviewId] || []).map((comment) =>
                        comment.id === updatedComment.id ? updatedComment : comment,
                      ),
                    },
                  }));
                } else if (payload.eventType === "DELETE") {
                  const deletedId = payload.old?.id;
                  set((state) => ({
                    comments: {
                      ...state.comments,
                      [reviewId]: (state.comments[reviewId] || []).filter((comment) => comment.id !== deletedId),
                    },
                  }));
                }
              },
            )
            .subscribe();

          subscriptions.set(reviewId, channel);

          // Return unsubscribe function
          return () => {
            channel.unsubscribe();
            subscriptions.delete(reviewId);
          };
        },

        unsubscribeFromComments: (reviewId: string) => {
          const channel = subscriptions.get(reviewId);
          if (channel) {
            channel.unsubscribe();
            subscriptions.delete(reviewId);
          }
        },
      };
    },
    {
      name: "comments-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist sanitized comments, not loading states
      partialize: (state) => ({
        comments: sanitizeCommentsForPersistence(state.comments),
        commentThreads: state.commentThreads,
        mediaComments: state.mediaComments,
      }),
      // Add version for future migrations
      version: 1,
      migrate: (persistedState: any, _version: number) => {
        try {
          const ps = persistedState || {};
          return {
            comments: ps.comments ?? {},
            commentThreads: ps.commentThreads ?? {},
            mediaComments: ps.mediaComments ?? {},
          };
        } catch {
          return { comments: {}, commentThreads: {}, mediaComments: {} };
        }
      },
      // Add data cleanup on hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.comments) {
          // Clean up old persisted comments periodically
          const now = Date.now();
          const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

          // Remove comments older than two weeks
          Object.keys(state.comments).forEach((reviewId) => {
            if (state.comments[reviewId]) {
              state.comments[reviewId] = state.comments[reviewId].filter((comment) => {
                return new Date(comment.createdAt).getTime() > twoWeeksAgo;
              });
            }
          });

          if (__DEV__) {
            console.log("🧹 Comments store: Cleaned up old persisted data");
          }
        }
      },
    },
  ),
);

export default useCommentsStore;
