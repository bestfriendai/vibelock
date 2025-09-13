// Supabase service layer for LockerRoom MVP
import { supabase, handleSupabaseError } from "../config/supabase";
import { requireAuthentication, getUserDisplayName } from "../utils/authUtils";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, Review, ChatRoom, ChatMessage, Comment, Profile } from "../types";
import { searchCache, userCache } from "./cacheService";

// Helper function for retry logic
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors (400, 401, 403)
      if (error?.status && [400, 401, 403, 422].includes(error.status)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Authentication Services
export const supabaseAuth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, displayName?: string): Promise<SupabaseUser> => {
    try {
      const result = await retryWithBackoff(async () => {
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
      });

      return result;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string): Promise<SupabaseUser> => {
    try {
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Failed to sign in");

        return data.user;
      });

      return result;
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
    return supabase.auth.onAuthStateChange((_event, session) => {
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
      // Use the session method which now includes proper expiry checks
      const session = await supabaseAuth.getCurrentSession();
      return session?.user ?? null;
    } catch (error: any) {
      console.warn("Error getting current user:", error);
      return null;
    }
  },

  // Get current session
  getCurrentSession: async (): Promise<Session | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // No session exists, try to refresh
        try {
          await supabase.auth.refreshSession();
        } catch {
          // Ignore refresh errors
        }
        const { data: refreshed } = await supabase.auth.getSession();
        return refreshed?.session ?? null;
      }

      // Check if session is expired or about to expire (within 5 minutes)
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000); // Convert to milliseconds
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow) {
          console.log("🔄 Session expires soon, refreshing token");
          try {
            const { data: refreshed } = await supabase.auth.refreshSession();
            return refreshed?.session ?? session;
          } catch (error) {
            console.warn("Failed to refresh session:", error);
            // Return existing session even if refresh failed
            return session;
          }
        }
      }

      return session;
    } catch (error: any) {
      console.warn("Error getting current session:", error);
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
        latitude: userData.location?.coordinates?.latitude,
        longitude: userData.location?.coordinates?.longitude,
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
          coordinates:
            data.latitude && data.longitude
              ? {
                  latitude: parseFloat(data.latitude),
                  longitude: parseFloat(data.longitude),
                }
              : undefined,
          type: data.location_type as "city" | "college" | undefined,
          fullName: data.location_full_name,
          institutionType: data.institution_type,
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
      if (updates.location?.coordinates?.latitude) dbUpdates.latitude = updates.location.coordinates.latitude;
      if (updates.location?.coordinates?.longitude) dbUpdates.longitude = updates.location.coordinates.longitude;
      if (updates.location?.type) dbUpdates.location_type = updates.location.type;
      if (updates.location?.fullName) dbUpdates.location_full_name = updates.location.fullName;
      if (updates.location?.institutionType) dbUpdates.institution_type = updates.location.institutionType;
      if (updates.genderPreference) dbUpdates.gender_preference = updates.genderPreference;
      if (updates.gender) dbUpdates.gender = updates.gender;
      if (updates.isBlocked !== undefined) dbUpdates.is_blocked = updates.isBlocked;

      const { error } = await supabase.from("users").update(dbUpdates).eq("id", userId);

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
      console.warn("Error checking if user exists:", error);
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
          ...(reviewData.sentiment && { sentiment: reviewData.sentiment }),
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

  // Get reviews with pagination and filtering
  getReviews: async (
    limit: number = 20,
    offset: number = 0,
    filters?: {
      category?: string;
      city?: string;
      state?: string;
      radiusMiles?: number;
    },
  ): Promise<Review[]> => {
    try {
      if (__DEV__) {
        console.log("📡 supabase.getReviews called:", { limit, offset, filters });
      }
      let query = supabase.from("reviews_firebase").select("*").eq("status", "approved");

      // Apply category filter
      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      // Apply location filters - use proper escaping for JSON field queries
      if (filters?.state && typeof filters.state === "string") {
        // Sanitize state input to prevent injection
        const sanitizedState = filters.state.replace(/['"\\]/g, "");
        query = query.eq("reviewed_person_location->>state", sanitizedState);
      }

      if (filters?.city && typeof filters.city === "string") {
        // Sanitize city input to prevent injection
        const sanitizedCity = filters.city.replace(/['"\\]/g, "");
        query = query.eq("reviewed_person_location->>city", sanitizedCity);
      }

      // Apply ordering and pagination
      query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      if (__DEV__) {
        console.log("✅ supabase.getReviews returned:", { count: data?.length ?? 0 });
      }

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
        sentiment: item.sentiment || undefined,
        reviewText: item.review_text,
        media: (item.media || []).map((mediaItem: any, index: number) => ({
          id: `${item.id}_media_${index}`,
          uri: mediaItem.uri,
          type: mediaItem.type || "image",
          thumbnailUri: mediaItem.thumbnail || mediaItem.thumbnailUri,
          width: mediaItem.width,
          height: mediaItem.height,
          duration: mediaItem.duration,
        })),
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
        sentiment: data.sentiment || undefined,
        reviewText: data.review_text,
        media: (data.media || []).map((mediaItem: any, index: number) => ({
          id: `${data.id}_media_${index}`,
          uri: mediaItem.uri,
          type: mediaItem.type || "image",
          thumbnailUri: mediaItem.thumbnail || mediaItem.thumbnailUri,
          width: mediaItem.width,
          height: mediaItem.height,
          duration: mediaItem.duration,
        })),
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
      const { user } = await requireAuthentication("update review");

      const updateData: any = {};
      if (updates.reviewText) updateData.review_text = updates.reviewText;
      if (updates.greenFlags) updateData.green_flags = updates.greenFlags;
      if (updates.redFlags) updateData.red_flags = updates.redFlags;
      if (updates.sentiment !== undefined) updateData.sentiment = updates.sentiment;
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
      const { user } = await requireAuthentication("delete review");

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
      const { user } = await requireAuthentication("send messages");

      // Insert message
      const { error: messageError } = await supabase.from("chat_messages_firebase").insert({
        chat_room_id: chatRoomId,
        sender_id: user.id,
        sender_name: messageData.senderName ?? getUserDisplayName(user),
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

  // Get messages with pagination
  getMessages: async (chatRoomId: string, limit: number = 20, beforeTimestamp?: Date): Promise<ChatMessage[]> => {
    try {
      let query = supabase
        .from("chat_messages_firebase")
        .select("*")
        .eq("chat_room_id", chatRoomId)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (beforeTimestamp) {
        query = query.lt("timestamp", beforeTimestamp.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform and reverse to get chronological order
      return (data || [])
        .map((msg: any) => ({
          id: msg.id,
          chatRoomId: msg.chat_room_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          senderAvatar: msg.sender_avatar,
          content: msg.content,
          messageType: msg.message_type || "text",
          timestamp: new Date(msg.timestamp),
          isRead: msg.is_read,
          replyTo: msg.reply_to,
        }))
        .reverse();
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
      const { user } = await requireAuthentication("comment");

      const { data, error } = await supabase
        .from("comments_firebase")
        .insert({
          review_id: reviewId,
          author_id: user.id, // ✅ Reverted back to author_id (matches actual DB schema)
          author_name: commentData.authorName || getUserDisplayName(user),
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
        authorId: item.author_id, // ✅ Reverted back to author_id (matches actual DB schema)
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
      const { user } = await requireAuthentication("update comment");

      const updateData: any = {};
      if (updates.content) updateData.content = updates.content;
      if (updates.likeCount !== undefined) updateData.like_count = updates.likeCount;
      if (updates.dislikeCount !== undefined) updateData.dislike_count = updates.dislikeCount;

      const { error } = await supabase
        .from("comments_firebase")
        .update(updateData)
        .eq("id", commentId)
        .eq("author_id", user.id); // ✅ Reverted back to author_id (matches actual DB schema)

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Delete comment (soft delete)
  deleteComment: async (commentId: string): Promise<void> => {
    try {
      const { user } = await requireAuthentication("delete comment");

      const { error } = await supabase
        .from("comments_firebase")
        .update({ is_deleted: true })
        .eq("id", commentId)
        .eq("author_id", user.id); // ✅ Reverted back to author_id (matches actual DB schema)

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
  // Upload file (supports ArrayBuffer or Blob). Always upsert by default and set contentType when provided
  uploadFile: async (
    bucket: string,
    path: string,
    file: ArrayBuffer | Blob,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<string> => {
    try {
      // Check authentication first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn("❌ Authentication required for storage upload:", authError);
        throw new Error("Authentication required. Please sign in and try again.");
      }

      const isBlob = typeof Blob !== "undefined" && file instanceof Blob;
      const size = isBlob ? (file as Blob).size : (file as ArrayBuffer).byteLength;
      const type = isBlob ? (file as Blob).type : options?.contentType;

      console.log(`🗄️ Uploading to Supabase Storage:`, {
        bucket,
        path,
        fileSize: size,
        fileType: type,
        upsert: options?.upsert ?? true,
        userId: user.id,
        userEmail: user.email,
      });

      const uploadOptions: any = { upsert: options?.upsert ?? true };
      if (type) uploadOptions.contentType = type;

      const { data, error } = await supabase.storage.from(bucket).upload(path, file as any, uploadOptions);

      if (error) {
        console.warn(`❌ Supabase Storage upload error:`, error);
        throw error;
      }

      console.log(`✅ Upload successful:`, data);

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      console.log(`🔗 Public URL generated:`, urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error: any) {
      console.warn(`💥 Upload failed:`, error);
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get file URL
  getFileUrl: (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  },
};

// Utility: sanitize user input for LIKE queries (escape % _ ' " \ and cap length)
const sanitizeLikeQuery = (query: string): string =>
  query
    .trim()
    .slice(0, 100)
    .replace(/[%_'"\\]/g, "\\$&");

// Search Services
export const supabaseSearch = {
  // Search for profiles by name with optional location filtering
  searchProfiles: async (
    query: string,
    filters?: {
      city?: string;
      state?: string;
      category?: string;
      radius?: number;
    },
  ): Promise<Profile[]> => {
    try {
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        return [];
      }

      // Generate cache key
      const cacheKey = `profiles:${query}:${JSON.stringify(filters || {})}`;

      // Try to get from cache first
      const cached = await searchCache.get<Profile[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Sanitize search query to prevent SQL injection
      const sanitizedQuery = query
        .trim()
        .replace(/[%_'"\\]/g, "\\$&")
        .slice(0, 100);

      // Aggregate results by person name and location
      const profileMap = new Map<
        string,
        {
          firstName: string;
          location: { city: string; state: string };
          reviews: any[];
          greenFlagCount: number;
          redFlagCount: number;
          totalRating: number;
          createdAt: Date;
          updatedAt: Date;
        }
      >();

      // Get detailed review data for aggregation with filters
      let detailedQuery = supabase
        .from("reviews_firebase")
        .select("*")
        .eq("status", "approved")
        .ilike("reviewed_person_name", `${sanitizedQuery}%`);

      // Apply filters
      if (filters?.category && filters.category !== "all") {
        detailedQuery = detailedQuery.eq("category", filters.category);
      }

      if (filters?.state) {
        detailedQuery = detailedQuery.eq("reviewed_person_location->>state", filters.state);
      }

      if (filters?.city) {
        detailedQuery = detailedQuery.eq("reviewed_person_location->>city", filters.city);
      }

      const { data: detailedData, error: detailedError } = await detailedQuery;
      if (detailedError) throw detailedError;

      detailedData?.forEach((review) => {
        const key = `${review.reviewed_person_name}-${review.reviewed_person_location?.city}-${review.reviewed_person_location?.state}`;

        if (!profileMap.has(key)) {
          profileMap.set(key, {
            firstName: review.reviewed_person_name,
            location: review.reviewed_person_location || { city: "Unknown", state: "Unknown" },
            reviews: [],
            greenFlagCount: 0,
            redFlagCount: 0,
            totalRating: 0,
            createdAt: new Date(review.created_at),
            updatedAt: new Date(review.updated_at),
          });
        }

        const profile = profileMap.get(key)!;
        profile.reviews.push(review);
        profile.greenFlagCount += (review.green_flags || []).length;
        profile.redFlagCount += (review.red_flags || []).length;

        // Simple rating calculation based on green/red flags ratio
        const greenFlags = (review.green_flags || []).length;
        const redFlags = (review.red_flags || []).length;
        const totalFlags = greenFlags + redFlags;

        if (totalFlags > 0) {
          // Rating from 1-5 based on green flag percentage
          const greenRatio = greenFlags / totalFlags;
          profile.totalRating += Math.max(1, Math.min(5, Math.round(1 + greenRatio * 4)));
        } else {
          profile.totalRating += 3; // neutral if no flags
        }

        // Update dates
        const reviewDate = new Date(review.updated_at);
        if (reviewDate > profile.updatedAt) {
          profile.updatedAt = reviewDate;
        }
      });

      // Convert to Profile array
      const profiles: Profile[] = Array.from(profileMap.values()).map((profile, index) => ({
        id: `${profile.firstName.toLowerCase().replace(/\s+/g, "-")}-${profile.location.city.toLowerCase().replace(/\s+/g, "-")}-${profile.location.state.toLowerCase()}`,
        firstName: profile.firstName,
        location: profile.location,
        totalReviews: profile.reviews.length,
        greenFlagCount: profile.greenFlagCount,
        redFlagCount: profile.redFlagCount,
        averageRating: profile.reviews.length > 0 ? profile.totalRating / profile.reviews.length : undefined,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      }));

      // Sort by total reviews (most reviewed first)
      const sortedProfiles = profiles.sort((a, b) => b.totalReviews - a.totalReviews);

      // Cache the results
      await searchCache.set(cacheKey, sortedProfiles, {
        ttl: 2 * 60 * 1000, // 2 minutes for search results
        tags: ["profiles", "search"],
      });

      return sortedProfiles;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get trending/popular names (most reviewed)
  getTrendingNames: async (limit: number = 10): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from("reviews_firebase")
        .select("reviewed_person_name")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100); // Get recent reviews

      if (error) throw error;

      // Count occurrences and get most common names
      const nameCount = new Map<string, number>();
      data?.forEach((review) => {
        const name = review.reviewed_person_name;
        nameCount.set(name, (nameCount.get(name) || 0) + 1);
      });

      // Sort by count and return top names
      return Array.from(nameCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name]) => name);
    } catch (error: any) {
      console.warn("Error getting trending names:", error);
      return [];
    }
  },

  // Search reviews by content, name, and location
  searchReviews: async (
    query: string,
    filters?: {
      category?: string;
      city?: string;
      state?: string;
    },
  ): Promise<any[]> => {
    try {
      // Generate cache key
      const cacheKey = `reviews:${query}:${JSON.stringify(filters || {})}`;

      // Try to get from cache first
      const cached = await searchCache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const sanitized = sanitizeLikeQuery(query);
      let queryBuilder = supabase
        .from("reviews_firebase")
        .select("*")
        .eq("status", "approved")
        .or(
          `review_text.ilike.%${sanitized}%,reviewed_person_name.ilike.%${sanitized}%,reviewed_person_location->>city.ilike.%${sanitized}%,reviewed_person_location->>state.ilike.%${sanitized}%`,
        )
        .order("created_at", { ascending: false })
        .limit(20);

      // Apply filters
      if (filters?.category && filters.category !== "all") {
        queryBuilder = queryBuilder.eq("category", filters.category);
      }
      if (filters?.city) {
        queryBuilder = queryBuilder.eq("reviewed_person_location->>city", filters.city);
      }
      if (filters?.state) {
        queryBuilder = queryBuilder.eq("reviewed_person_location->>state", filters.state);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      const results = data || [];

      // Cache the results
      await searchCache.set(cacheKey, results, {
        ttl: 2 * 60 * 1000, // 2 minutes for search results
        tags: ["reviews", "search"],
      });

      return results;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Search comments by content
  searchComments: async (query: string): Promise<any[]> => {
    try {
      const sanitized = sanitizeLikeQuery(query);
      const { data, error } = await supabase
        .from("comments_firebase")
        .select("*, reviews_firebase!inner(id, reviewed_person_name)")
        .ilike("content", `%${sanitized}%`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Search chat messages by content
  searchMessages: async (query: string): Promise<any[]> => {
    try {
      const sanitized = sanitizeLikeQuery(query);
      const { data, error } = await supabase
        .from("chat_messages_firebase")
        // Use the correct related table name that matches DB schema
        .select("*, chat_rooms_firebase(id, name)")
        .ilike("content", `%${sanitized}%`)
        .order("timestamp", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Combined search across all entities
  searchAll: async (
    query: string,
    filters?: {
      category?: string;
      city?: string;
      state?: string;
    },
  ): Promise<{
    reviews: any[];
    comments: any[];
    messages: any[];
  }> => {
    try {
      const sanitized = sanitizeLikeQuery(query);
      const [reviews, comments, messages] = await Promise.all([
        supabaseSearch.searchReviews(sanitized, filters),
        supabaseSearch.searchComments(sanitized),
        supabaseSearch.searchMessages(sanitized),
      ]);

      return {
        reviews,
        comments,
        messages,
      };
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },
};

// Reports Services
export const supabaseReports = {
  // Create a new report
  createReport: async (reportData: {
    reporterId: string;
    reportedItemId: string;
    reportedItemType: "review" | "profile" | "comment" | "message";
    reason: "inappropriate_content" | "fake_profile" | "harassment" | "spam" | "other";
    description?: string;
  }): Promise<string> => {
    try {
      // Validate and sanitize input data to prevent SQL injection
      const sanitizedData = {
        reporter_id: typeof reportData.reporterId === "string" ? reportData.reporterId.slice(0, 36) : "",
        reported_item_id: typeof reportData.reportedItemId === "string" ? reportData.reportedItemId.slice(0, 36) : "",
        reported_item_type: reportData.reportedItemType,
        reason: reportData.reason,
        description: reportData.description ? reportData.description.slice(0, 1000) : undefined,
        status: "pending" as const,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("reports").insert(sanitizedData).select("id").single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Get reports by reporter
  getReportsByReporter: async (reporterId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_id", reporterId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },

  // Update report status (for admin use)
  updateReportStatus: async (
    reportId: string,
    status: "pending" | "reviewed" | "resolved" | "dismissed",
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error));
    }
  },
};

// Export helper functions
export { handleSupabaseError };
export { supabase };
