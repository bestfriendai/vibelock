// Supabase service layer for LockerRoom MVP
import { supabase, handleSupabaseError } from "../config/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, Review, ChatRoom, ChatMessage, Comment } from "../types";

// Authentication Services
export const supabaseAuth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, displayName?: string): Promise<SupabaseUser> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user");

      return data.user;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string): Promise<SupabaseUser> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to sign in");

      return data.user;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: SupabaseUser | null) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  },

  // Send password reset email
  resetPassword: async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<SupabaseUser | null> => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error: any) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // Get current session
  getCurrentSession: async (): Promise<Session | null> => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error: any) {
      console.error("Error getting current session:", error);
      return null;
    }
  },

  // Update user profile
  updateProfile: async (updates: { display_name?: string; avatar_url?: string }): Promise<SupabaseUser> => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to update profile");

      return data.user;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },
};

// User Profile Services
export const supabaseUsers = {
  // Create user profile document
  createUserProfile: async (userId: string, userData: Partial<User>): Promise<void> => {
    try {
      // Map camelCase to snake_case for database
      const dbData: any = {
        id: userId,
        email: userData.email,
        anonymous_id: userData.anonymousId,
        city: userData.location?.city,
        state: userData.location?.state,
        gender_preference: userData.genderPreference,
        gender: userData.gender,
        is_blocked: userData.isBlocked || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("users").insert(dbData);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get user profile
  getUserProfile: async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return null;
        }
        throw error;
      }

      // Map snake_case to camelCase for TypeScript interface
      return {
        id: data.id,
        email: data.email,
        anonymousId: data.anonymous_id,
        location: {
          city: data.city || "Unknown",
          state: data.state || "Unknown",
        },
        genderPreference: data.gender_preference || "all",
        gender: data.gender,
        isBlocked: data.is_blocked || false,
        createdAt: new Date(data.created_at),
      } as User;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      // Map camelCase to snake_case for database
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.email) dbUpdates.email = updates.email;
      if (updates.anonymousId) dbUpdates.anonymous_id = updates.anonymousId;
      if (updates.location?.city) dbUpdates.city = updates.location.city;
      if (updates.location?.state) dbUpdates.state = updates.location.state;
      if (updates.genderPreference) dbUpdates.gender_preference = updates.genderPreference;
      if (updates.gender) dbUpdates.gender = updates.gender;
      if (updates.isBlocked !== undefined) dbUpdates.is_blocked = updates.isBlocked;

      const { error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", userId);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Delete user profile
  deleteUserProfile: async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Check if user exists
  userExists: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from("users").select("id").eq("id", userId).single();

      if (error) {
        if (error.code === "PGRST116") {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error: any) {
      console.error("Error checking if user exists:", error);
      return false;
    }
  },
};

// Reviews Services
export const supabaseReviews = {
  // Create a review
  createReview: async (reviewData: Omit<Review, "id" | "createdAt" | "updatedAt" | "authorId">): Promise<string> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      // Allow anonymous review creation for now - use null for author_id if not authenticated
      const authorId = user?.id || null;

      const { data, error } = await supabase
        .from("reviews_firebase")
        .insert({
          author_id: authorId,
          reviewer_anonymous_id: reviewData.reviewerAnonymousId,
          reviewed_person_name: reviewData.reviewedPersonName,
          reviewed_person_location: reviewData.reviewedPersonLocation,
          category: reviewData.category,
          profile_photo: reviewData.profilePhoto,
          green_flags: reviewData.greenFlags,
          red_flags: reviewData.redFlags,
          sentiment: reviewData.sentiment,
          review_text: reviewData.reviewText,
          media: reviewData.media,
          social_media: reviewData.socialMedia,
          status: reviewData.status,
          like_count: reviewData.likeCount || 0,
          dislike_count: reviewData.dislikeCount || 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get reviews with pagination
  getReviews: async (limit: number = 20, offset: number = 0): Promise<Review[]> => {
    try {
      const { data, error } = await supabase
        .from("reviews_firebase")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map((item) => ({
        id: item.id,
        authorId: item.author_id,
        reviewerAnonymousId: item.reviewer_anonymous_id,
        reviewedPersonName: item.reviewed_person_name,
        reviewedPersonLocation: item.reviewed_person_location,
        category: item.category,
        profilePhoto: item.profile_photo,
        greenFlags: item.green_flags || [],
        redFlags: item.red_flags || [],
        sentiment: item.sentiment,
        reviewText: item.review_text,
        media: item.media || [],
        socialMedia: item.social_media,
        status: item.status,
        likeCount: item.like_count || 0,
        dislikeCount: item.dislike_count || 0,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      })) as Review[];
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get review by ID
  getReview: async (reviewId: string): Promise<Review | null> => {
    try {
      const { data, error } = await supabase.from("reviews_firebase").select("*").eq("id", reviewId).single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return {
        id: data.id,
        authorId: data.author_id,
        reviewerAnonymousId: data.reviewer_anonymous_id,
        reviewedPersonName: data.reviewed_person_name,
        reviewedPersonLocation: data.reviewed_person_location,
        category: data.category,
        profilePhoto: data.profile_photo,
        greenFlags: data.green_flags || [],
        redFlags: data.red_flags || [],
        sentiment: data.sentiment,
        reviewText: data.review_text,
        media: data.media || [],
        socialMedia: data.social_media,
        status: data.status,
        likeCount: data.like_count || 0,
        dislikeCount: data.dislike_count || 0,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as Review;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Update review
  updateReview: async (reviewId: string, updates: Partial<Review>): Promise<void> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error("Must be signed in to update review");

      const updateData: any = {};
      if (updates.reviewText) updateData.review_text = updates.reviewText;
      if (updates.greenFlags) updateData.green_flags = updates.greenFlags;
      if (updates.redFlags) updateData.red_flags = updates.redFlags;
      if (updates.sentiment) updateData.sentiment = updates.sentiment;
      if (updates.media) updateData.media = updates.media;
      if (updates.socialMedia) updateData.social_media = updates.socialMedia;
      if (updates.likeCount !== undefined) updateData.like_count = updates.likeCount;
      if (updates.dislikeCount !== undefined) updateData.dislike_count = updates.dislikeCount;

      const { error } = await supabase
        .from("reviews_firebase")
        .update(updateData)
        .eq("id", reviewId)
        .eq("author_id", user.id);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Delete review
  deleteReview: async (reviewId: string): Promise<void> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error("Must be signed in to delete review");

      const { error } = await supabase.from("reviews_firebase").delete().eq("id", reviewId).eq("author_id", user.id);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },
};

// Chat Services
export const supabaseChat = {
  // Get chat rooms
  getChatRooms: async (): Promise<ChatRoom[]> => {
    try {
      const { data, error } = await supabase
        .from("chat_rooms_firebase")
        .select("*")
        .eq("is_active", true)
        .order("last_activity", { ascending: false });

      if (error) throw error;

      return data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        category: item.category,
        memberCount: item.member_count || 0,
        onlineCount: item.online_count || 0,
        lastMessage: item.last_message,
        lastActivity: new Date(item.last_activity),
        isActive: item.is_active,
        location: item.location,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      })) as ChatRoom[];
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Listen to chat messages (real-time subscription)
  onMessagesSnapshot: (chatRoomId: string, callback: (messages: ChatMessage[]) => void) => {
    const subscription = supabase
      .channel(`chat_messages:${chatRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages_firebase",
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        async () => {
          // Fetch all messages for this room
          const { data, error } = await supabase
            .from("chat_messages_firebase")
            .select("*")
            .eq("chat_room_id", chatRoomId)
            .order("timestamp", { ascending: true });

          if (!error && data) {
            const messages = data.map((item) => ({
              id: item.id,
              chatRoomId: item.chat_room_id,
              senderId: item.sender_id,
              senderName: item.sender_name,
              senderAvatar: item.sender_avatar,
              content: item.content,
              messageType: item.message_type,
              timestamp: new Date(item.timestamp),
              isRead: item.is_read,
              replyTo: item.reply_to,
            })) as ChatMessage[];
            callback(messages);
          }
        },
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },

  // Send message
  sendMessage: async (chatRoomId: string, messageData: Omit<ChatMessage, "id" | "timestamp">): Promise<void> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error("Must be signed in to send messages");

      // Insert message
      const { error: messageError } = await supabase.from("chat_messages_firebase").insert({
        chat_room_id: chatRoomId,
        sender_id: user.id,
        sender_name: messageData.senderName,
        sender_avatar: messageData.senderAvatar,
        content: messageData.content,
        message_type: messageData.messageType || "text",
        is_read: false,
        reply_to: messageData.replyTo,
      });

      if (messageError) throw messageError;

      // Update chat room last activity
      const { error: roomError } = await supabase
        .from("chat_rooms_firebase")
        .update({
          last_activity: new Date().toISOString(),
          last_message: {
            content: messageData.content,
            senderName: messageData.senderName,
            timestamp: new Date().toISOString(),
          },
        })
        .eq("id", chatRoomId);

      if (roomError) throw roomError;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },
};

// Comments Services
export const supabaseComments = {
  // Create a comment
  createComment: async (
    reviewId: string,
    commentData: Omit<Comment, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error("Must be signed in to comment");

      const { data, error } = await supabase
        .from("comments_firebase")
        .insert({
          review_id: reviewId,
          author_id: user.id,
          author_name: commentData.authorName,
          content: commentData.content,
          like_count: commentData.likeCount || 0,
          dislike_count: commentData.dislikeCount || 0,
          parent_comment_id: commentData.parentCommentId,
          media_id: commentData.mediaId,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get comments for a review
  getComments: async (reviewId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from("comments_firebase")
        .select("*")
        .eq("review_id", reviewId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data.map((item) => ({
        id: item.id,
        reviewId: item.review_id,
        authorId: item.author_id,
        authorName: item.author_name,
        content: item.content,
        likeCount: item.like_count || 0,
        dislikeCount: item.dislike_count || 0,
        parentCommentId: item.parent_comment_id,
        mediaId: item.media_id,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        isDeleted: item.is_deleted,
        isReported: item.is_reported,
      })) as Comment[];
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Update comment
  updateComment: async (commentId: string, updates: Partial<Comment>): Promise<void> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error("Must be signed in to update comment");

      const updateData: any = {};
      if (updates.content) updateData.content = updates.content;
      if (updates.likeCount !== undefined) updateData.like_count = updates.likeCount;
      if (updates.dislikeCount !== undefined) updateData.dislike_count = updates.dislikeCount;

      const { error } = await supabase
        .from("comments_firebase")
        .update(updateData)
        .eq("id", commentId)
        .eq("author_id", user.id);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Delete comment (soft delete)
  deleteComment: async (commentId: string): Promise<void> => {
    try {
      const user = await supabaseAuth.getCurrentUser();
      if (!user) throw new Error("Must be signed in to delete comment");

      const { error } = await supabase
        .from("comments_firebase")
        .update({ is_deleted: true })
        .eq("id", commentId)
        .eq("author_id", user.id);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Listen to comments changes (real-time subscription)
  onCommentsSnapshot: (reviewId: string, callback: (comments: Comment[]) => void) => {
    const subscription = supabase
      .channel(`comments:${reviewId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments_firebase",
          filter: `review_id=eq.${reviewId}`,
        },
        async () => {
          // Fetch all comments for this review
          const comments = await supabaseComments.getComments(reviewId);
          callback(comments);
        },
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },
};

// Storage Services
export const supabaseStorage = {
  // Upload file
  uploadFile: async (bucket: string, path: string, file: File | Blob): Promise<string> => {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get file URL
  getFileUrl: (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  },
};

// Export helper functions
export { handleSupabaseError };
export { supabase };
