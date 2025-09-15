import { supabase } from "../config/supabase";
import { SearchResults, Profile } from "../types";
import { mapFieldsToCamelCase } from "../utils/fieldMapping";
import { withRetry } from "../utils/retryLogic";

export class SearchService {
  async searchProfiles(query: string, filters?: any): Promise<Profile[]> {
    return withRetry(async () => {
      let searchQuery = supabase
        .from("users")
        .select("*")
        .or(`first_name.ilike.%${query}%,display_name.ilike.%${query}%,username.ilike.%${query}%`);

      // Apply filters if provided
      if (filters?.location) {
        searchQuery = searchQuery.eq("location->city", filters.location.city);
        searchQuery = searchQuery.eq("location->state", filters.location.state);
      }

      if (filters?.category) {
        searchQuery = searchQuery.eq("category", filters.category);
      }

      if (filters?.limit) {
        searchQuery = searchQuery.limit(filters.limit);
      } else {
        searchQuery = searchQuery.limit(20);
      }

      const { data, error } = await searchQuery;

      if (error) throw error;
      return (data || []).map(mapFieldsToCamelCase);
    });
  }

  async searchReviews(query: string): Promise<SearchResults> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, user:users(*)")
        .or(`reviewed_person_name.ilike.%${query}%,review_text.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const reviews = (data || []).map((item) => ({
        id: item.id,
        type: "review" as const,
        title: item.reviewed_person_name,
        content: item.review_text,
        snippet: item.review_text.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          reviewId: item.id,
          authorName: item.user?.display_name || "Anonymous",
          location: `${item.reviewed_person_location?.city}, ${item.reviewed_person_location?.state}`,
        },
      }));

      return {
        reviews,
        comments: [],
        messages: [],
        total: reviews.length,
      };
    });
  }

  async searchAll(query: string): Promise<SearchResults> {
    return withRetry(async () => {
      // Search reviews
      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .select("*, user:users(*)")
        .or(`reviewed_person_name.ilike.%${query}%,review_text.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(25);

      if (reviewError) throw reviewError;

      // Search comments
      const { data: commentData, error: commentError } = await supabase
        .from("comments")
        .select("*, user:users(*), review:reviews(*)")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(25);

      if (commentError) throw commentError;

      // Search messages
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*, user:users(*), chat_room:chat_rooms(*)")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(25);

      if (messageError) throw messageError;

      const reviews = (reviewData || []).map((item) => ({
        id: item.id,
        type: "review" as const,
        title: item.reviewed_person_name,
        content: item.review_text,
        snippet: item.review_text.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          reviewId: item.id,
          authorName: item.user?.display_name || "Anonymous",
          location: `${item.reviewed_person_location?.city}, ${item.reviewed_person_location?.state}`,
        },
      }));

      const comments = (commentData || []).map((item) => ({
        id: item.id,
        type: "comment" as const,
        title: `Comment on ${item.review?.reviewed_person_name || "Review"}`,
        content: item.content,
        snippet: item.content.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          commentId: item.id,
          reviewId: item.review_id,
          authorName: item.user?.display_name || "Anonymous",
        },
      }));

      const messages = (messageData || []).map((item) => ({
        id: item.id,
        type: "message" as const,
        title: `Message in ${item.chat_room?.name || "Chat"}`,
        content: item.content,
        snippet: item.content.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          messageId: item.id,
          roomId: item.room_id,
          roomName: item.chat_room?.name,
          authorName: item.user?.display_name || "Anonymous",
        },
      }));

      return {
        reviews,
        comments,
        messages,
        total: reviews.length + comments.length + messages.length,
      };
    });
  }

  async searchMessages(roomId: string, query: string, limit: number = 20): Promise<SearchResults> {
    const { data, error } = await supabase
      .from("messages")
      .select("*, user:users(*), chat_room:chat_rooms(*)")
      .eq("room_id", roomId)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const messages = (data || []).map((item) => ({
      id: item.id,
      type: "message" as const,
      title: `Message in ${item.chat_room?.name || "Chat"}`,
      content: item.content,
      snippet: item.content.substring(0, 150),
      createdAt: new Date(item.created_at),
      metadata: {
        messageId: item.id,
        roomId: item.room_id,
        roomName: item.chat_room?.name,
        authorName: item.user?.display_name || "Anonymous",
      },
    }));

    return {
      reviews: [],
      comments: [],
      messages,
      total: messages.length,
    };
  }
}

export const searchService = new SearchService();
