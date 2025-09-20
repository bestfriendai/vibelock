import { supabase } from "../config/supabase";
import { SearchResults, Profile } from "../types";
import { mapFieldsToCamelCase } from "../utils/fieldMapping";
import { withRetry } from "../utils/retryLogic";

// Search configuration
const SEARCH_CONFIG = {
  similarityThreshold: 0.3, // Default pg_trgm similarity threshold
  wordSimilarityThreshold: 0.6, // Word similarity threshold
  maxResults: 50,
  defaultResultsPerType: 25,
};

export class SearchService {
  /**
   * Initialize search indexes and extensions if needed
   * This should be called once during app initialization
   */
  async initializeSearchExtensions(): Promise<void> {
    try {
      // Check if pg_trgm extension is enabled
      // TODO: Check pg_trgm extension when pg_extension table is accessible
      // const { data: extensions } = await supabase.from("pg_extension").select("extname").eq("extname", "pg_trgm");
      // if (!extensions || extensions.length === 0) {
      //   console.warn("pg_trgm extension may not be enabled. Consider enabling it for better search performance.");
      // }
    } catch (error) {
      console.warn("Could not check pg_trgm extension status:", error);
    }
  }

  /**
   * Basic text search using ILIKE (case-insensitive LIKE)
   */
  async basicSearch(query: string, table: string, columns: string[]): Promise<any[]> {
    const orConditions = columns.map((col) => `${col}.ilike.%${query}%`).join(",");

    const { data, error } = await (supabase as any).from(table).select("*").or(orConditions).limit(SEARCH_CONFIG.maxResults);

    if (error) throw error;
    return data || [];
  }

  /**
   * Similarity search using pg_trgm extension
   * Requires pg_trgm extension to be enabled
   */
  async similaritySearch(
    query: string,
    table: string,
    column: string,
    threshold: number = SEARCH_CONFIG.similarityThreshold,
  ): Promise<any[]> {
    // TODO: Implement similarity search when RPC function is available
    // For now, fall back to basic search
    return this.basicSearch(query, table, [column]);
  }

  /**
   * Enhanced full-text search using PostgreSQL's tsvector
   */
  async enhancedFullTextSearch(query: string, table: string): Promise<any[]> {
    // TODO: Implement enhanced full-text search when RPC function is available
    // For now, fall back to basic search
    return this.basicSearch(query, table, ['content']);
  }

  /**
   * Hybrid search combining similarity and full-text search
   */
  async hybridSearch(
    query: string,
    table: string,
    options: {
      similarityWeight?: number;
      ftsWeight?: number;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    const { similarityWeight = 0.4, ftsWeight = 0.6, limit = SEARCH_CONFIG.maxResults } = options;

    // TODO: Implement hybrid search when RPC function is available
    // For now, fall back to basic search
    return this.basicSearch(query, table, ['content']);
  }

  /**
   * Full-text search using PostgreSQL's built-in FTS
   */
  async fullTextSearch(query: string, table: string, textColumn: string): Promise<any[]> {
    try {
      // Use PostgreSQL's full-text search
      const { data, error } = await (supabase as any)
        .from(table)
        .select("*")
        .textSearch(textColumn, query, {
          type: "websearch",
          config: "english",
        })
        .limit(SEARCH_CONFIG.maxResults);

      if (error) {
        console.warn("Full-text search failed, falling back to basic search:", error);
        return this.basicSearch(query, table, [textColumn]);
      }

      return data || [];
    } catch (error) {
      console.warn("Full-text search not available, using basic search:", error);
      return this.basicSearch(query, table, [textColumn]);
    }
  }
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
      return (data || []).map(mapFieldsToCamelCase) as Profile[];
    });
  }

  /**
   * Enhanced review search with multiple search strategies
   */
  async searchReviews(
    query: string,
    options: {
      useFullText?: boolean;
      useSimilarity?: boolean;
      sortBy?: "relevance" | "date";
      searchMode?: "basic" | "similarity" | "fts" | "hybrid";
    } = {},
  ): Promise<SearchResults> {
    return withRetry(async () => {
      const { useFullText = false, useSimilarity = false, sortBy = "date", searchMode } = options;

      let reviewData: any[] = [];

      // Handle searchMode parameter
      if (searchMode) {
        try {
          switch (searchMode) {
            case "similarity":
              reviewData = await this.similaritySearch(query, "reviews_firebase", "review_text");
              break;
            case "fts":
              reviewData = await this.fullTextSearch(query, "reviews_firebase", "review_text");
              break;
            case "hybrid":
              reviewData = await this.hybridSearch(query, "reviews_firebase");
              break;
            case "basic":
            default:
              reviewData = await this.basicSearch(query, "reviews_firebase", ["reviewed_person_name", "review_text"]);
              break;
          }
        } catch (error) {
          console.warn(`${searchMode} search failed:`, error);
        }
      } else {
        // Legacy behavior with useFullText and useSimilarity flags
        if (useFullText) {
          // Try full-text search first
          try {
            reviewData = await this.fullTextSearch(query, "reviews_firebase", "review_text");
          } catch (error) {
            console.warn("Full-text search failed:", error);
          }
        }

        if (useSimilarity && reviewData.length === 0) {
          // Try similarity search
          try {
            reviewData = await this.similaritySearch(query, "reviews_firebase", "review_text");
          } catch (error) {
            console.warn("Similarity search failed:", error);
          }
        }
      }

      if (reviewData.length === 0) {
        // Fall back to basic search
        const { data, error } = await supabase
          .from("reviews_firebase")
          .select("*, author:users!author_id(id, username, display_name)")
          .or(`reviewed_person_name.ilike.%${query}%,review_text.ilike.%${query}%`)
          .order("created_at", { ascending: false })
          .limit(SEARCH_CONFIG.maxResults);

        if (error) throw error;
        reviewData = data || [];
      }

      const reviews = reviewData.map((item) => ({
        id: item.id,
        type: "review" as const,
        title: item.reviewed_person_name,
        content: item.review_text,
        snippet: item.review_text?.substring(0, 150) || "",
        createdAt: new Date(item.created_at),
        metadata: {
          reviewId: item.id,
          authorName: item.author?.display_name || item.author?.username || "Anonymous",
          location: item.reviewed_person_location
            ? `${item.reviewed_person_location?.city || ""}, ${item.reviewed_person_location?.state || ""}`
                .trim()
                .replace(/^,|,$/, "")
            : "Unknown location",
          similarity: item.similarity || null,
          rankScore: item.rank_score || null,
          combinedScore: item.combined_score || null,
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

  /**
   * Enhanced search across all content types
   */
  async searchAll(
    query: string,
    options: {
      useAdvancedSearch?: boolean;
      filters?: {
        dateRange?: string;
        location?: string;
        category?: string;
      };
    } = {},
  ): Promise<SearchResults> {
    return withRetry(async () => {
      const { useAdvancedSearch = false, filters = {} } = options;

      // Search reviews with enhanced capabilities
      let reviewQuery = supabase
        .from("reviews_firebase")
        .select("*, author:users!author_id(id, username, display_name)")
        .or(`reviewed_person_name.ilike.%${query}%,review_text.ilike.%${query}%`);

      // Apply filters if provided
      if (filters.category) {
        reviewQuery = reviewQuery.eq("category", filters.category);
      }

      if (filters.location) {
        reviewQuery = reviewQuery.ilike("reviewed_person_location->city", `%${filters.location}%`);
      }

      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // No date filter
        }

        if (filters.dateRange !== "all") {
          reviewQuery = reviewQuery.gte("created_at", startDate.toISOString());
        }
      }

      const { data: reviewData, error: reviewError } = await reviewQuery
        .order("created_at", { ascending: false })
        .limit(SEARCH_CONFIG.defaultResultsPerType);

      if (reviewError) throw reviewError;

      // Search comments
      const { data: commentData, error: commentError } = await supabase
        .from("comments")
        .select("*, user:users(*), review:reviews(*)")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(25);

      if (commentError) throw commentError;

      // Search messages (basic search in chat_messages_firebase)
      const { data: messageData, error: messageError } = await supabase
        .from("chat_messages_firebase")
        .select("*, chat_rooms_firebase(name)")
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
          authorName: item.author?.display_name || item.author?.username || "Anonymous",
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
        title: `Message in ${item.chat_rooms_firebase?.name || "Chat"}`,
        content: item.content,
        snippet: item.content.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          messageId: item.id,
          roomId: item.chat_room_id,
          roomName: item.chat_rooms_firebase?.name,
          senderId: item.sender_id,
          senderName: item.sender_name || "Anonymous",
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

  /**
   * Search messages within a specific room using RPC
   */
  async searchMessages(roomId: string, query: string, limit: number = 50, offset: number = 0): Promise<SearchResults> {
    try {
      const { data, error } = await supabase.rpc("search_messages_in_room", {
        p_room_id: roomId,
        p_query: query,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.warn("RPC search failed, falling back to basic search:", error);
        // Fallback to basic search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("chat_messages_firebase")
          .select("*, chat_rooms_firebase(name)")
          .eq("chat_room_id", roomId)
          .ilike("content", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (fallbackError) throw fallbackError;

        const messages = (fallbackData || []).map((item) => ({
          id: item.id,
          type: "message" as const,
          title: `Message in ${item.chat_rooms_firebase?.name || "Chat"}`,
          content: item.content,
          snippet: item.content.substring(0, 150),
          createdAt: new Date(item.created_at),
          metadata: {
            messageId: item.id,
            roomId: item.chat_room_id,
            roomName: item.chat_rooms_firebase?.name,
            senderId: item.sender_id,
            senderName: item.sender_name || "Anonymous",
          },
        }));

        return {
          reviews: [],
          comments: [],
          messages,
          total: messages.length,
        };
      }

      // Map RPC results to SearchResults format
      const messages = (data || []).map((item) => ({
        id: item.message_id,
        type: "message" as const,
        title: `Message from ${item.sender_name}`,
        content: item.content,
        snippet: item.snippet || item.content.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          messageId: item.message_id,
          roomId: roomId,
          roomName: "Current Room",
          senderId: item.sender_id,
          senderName: item.sender_name || "Anonymous",
          rank: item.rank,
        },
      }));

      return {
        reviews: [],
        comments: [],
        messages,
        total: messages.length,
      };
    } catch (error) {
      console.error("Search messages failed:", error);
      throw error;
    }
  }

  /**
   * Search messages globally across all accessible rooms
   */
  async searchMessagesGlobal(query: string, userId: string, limit: number = 50, offset: number = 0): Promise<SearchResults> {
    try {
      const { data, error } = await supabase.rpc("search_messages_global", {
        p_user_id: userId,
        p_query: query,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.warn("Global RPC search failed, falling back to basic search:", error);
        // Fallback to basic search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("chat_messages_firebase")
          .select("*, chat_rooms_firebase(name)")
          .ilike("content", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (fallbackError) throw fallbackError;

        const messages = (fallbackData || []).map((item) => ({
          id: item.id,
          type: "message" as const,
          title: `Message in ${item.chat_rooms_firebase?.name || "Chat"}`,
          content: item.content,
          snippet: item.content.substring(0, 150),
          createdAt: new Date(item.created_at),
          metadata: {
            messageId: item.id,
            roomId: item.chat_room_id,
            roomName: item.chat_rooms_firebase?.name || "Unknown Room",
            senderId: item.sender_id,
            senderName: item.sender_name || "Anonymous",
          },
        }));

        return {
          reviews: [],
          comments: [],
          messages,
          total: messages.length,
        };
      }

      // Map RPC results to SearchResults format
      const messages = (data || []).map((item) => ({
        id: item.message_id,
        type: "message" as const,
        title: `Message in ${item.room_name}`,
        content: item.content,
        snippet: item.snippet || item.content.substring(0, 150),
        createdAt: new Date(item.created_at),
        metadata: {
          messageId: item.message_id,
          roomId: item.room_id,
          roomName: item.room_name || "Unknown Room",
          senderId: item.sender_id,
          senderName: item.sender_name || "Anonymous",
          rank: item.rank,
        },
      }));

      return {
        reviews: [],
        comments: [],
        messages,
        total: messages.length,
      };
    } catch (error) {
      console.error("Global search messages failed:", error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on historical search data
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
    try {
      if (partialQuery.length < 2) return [];

      const { data, error } = await supabase.rpc("get_search_suggestions", {
        p_prefix: partialQuery,
        p_limit: limit,
      });

      if (error) {
        console.warn("Search suggestions failed:", error);
        return [];
      }

      return (data || []).map((item: any) => item.suggestion);
    } catch (error) {
      console.warn("Search suggestions not available:", error);
      return [];
    }
  }

  /**
   * Log search analytics for monitoring and improvement
   */
  private async logSearchAnalytics(
    query: string,
    searchType: string,
    resultCount: number,
    executionTime: number,
  ): Promise<void> {
    try {
      // Only log in production or when analytics is enabled
      if (process.env.NODE_ENV !== "production") return;

      await supabase.from("search_analytics").insert({
        search_query: query.substring(0, 100), // Truncate long queries
        search_type: searchType,
        results_count: resultCount,
        execution_time_ms: executionTime,
      });
    } catch (error) {
      // Silently fail analytics logging to not impact user experience
      console.warn("Failed to log search analytics:", error);
    }
  }
}

export const searchService = new SearchService();
