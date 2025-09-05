import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Comment, CommentState } from "../types";
import { supabaseComments } from "../services/supabase";
import { RealtimeChannel } from '@supabase/supabase-js';

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

          const comments = await supabaseComments.getComments(reviewId);

          set((state) => ({
            comments: {
              ...state.comments,
              [reviewId]: comments,
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load comments",
            isLoading: false,
          });
        }
      },

      createComment: async (reviewId: string, content: string, mediaId?: string) => {
        try {
          set({ isPosting: true, error: null });

          const commentData: Omit<Comment, "id" | "createdAt" | "updatedAt"> = {
            reviewId,
            authorId: `anon_${Date.now()}`,
            authorName: `Anonymous ${Math.floor(Math.random() * 1000)}`,
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

          // Save to Supabase in background
          supabaseComments.createComment(reviewId, commentData).catch((error) => {
            console.warn("Failed to save comment to Supabase:", error);
            // Could remove the optimistic comment here if needed
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to create comment",
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

            // Update in Supabase
            await supabaseComments.updateComment(commentId, {
              likeCount: newLikeCount,
              dislikeCount: newDislikeCount,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to like comment",
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

            // Update in Supabase
            await supabaseComments.updateComment(commentId, {
              likeCount: newLikeCount,
              dislikeCount: newDislikeCount,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to dislike comment",
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
          await supabaseComments.deleteComment(commentId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete comment",
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

        const channel = supabaseComments.supabase
          .channel(`comments-${reviewId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'comments_firebase',
              filter: `review_id=eq.${reviewId}`,
            },
            (payload) => {
              console.log('Comment change received:', payload);

              if (payload.eventType === 'INSERT') {
                const newComment = payload.new as Comment;
                set((state) => ({
                  comments: {
                    ...state.comments,
                    [reviewId]: [...(state.comments[reviewId] || []), newComment],
                  },
                }));
              } else if (payload.eventType === 'UPDATE') {
                const updatedComment = payload.new as Comment;
                set((state) => ({
                  comments: {
                    ...state.comments,
                    [reviewId]: (state.comments[reviewId] || []).map((comment) =>
                      comment.id === updatedComment.id ? updatedComment : comment
                    ),
                  },
                }));
              } else if (payload.eventType === 'DELETE') {
                const deletedComment = payload.old as Comment;
                set((state) => ({
                  comments: {
                    ...state.comments,
                    [reviewId]: (state.comments[reviewId] || []).filter(
                      (comment) => comment.id !== deletedComment.id
                    ),
                  },
                }));
              }
            }
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
      // Only persist comments, not loading states
      partialize: (state) => ({
        comments: state.comments,
        commentThreads: state.commentThreads,
        mediaComments: state.mediaComments,
      }),
    }
  )
);

export default useCommentsStore;
