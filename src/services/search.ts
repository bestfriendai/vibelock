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
      const { data: extensions } = await supabase.from("pg_extension").select("extname").eq("extname", "pg_trgm");

      if (!extensions || extensions.length === 0) {
        console.warn("pg_trgm extension may not be enabled. Consider enabling it for better search performance.");
      }
    } catch (error) {
      console.warn("Could not check pg_trgm extension status:", error);
    }
  }

  /**
   * Basic text search using ILIKE (case-insensitive LIKE)
   */
  async basicSearch(query: string, table: string, columns: string[]): Promise<any[]> {
    const orConditions = columns.map((col) => `${col}.ilike.%${query}%`).join(",");

    const { data, error } = await supabase.from(table).select("*").or(orConditions).limit(SEARCH_CONFIG.maxResults);

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
    try {
      // Use custom similarity_search function
      const { data, error } = await supabase.rpc("similarity_search", {
        search_query: query,
        search_table: table,
        search_column: column,
        similarity_threshold: threshold,
      });

      if (error) {
        console.warn("Similarity search failed, falling back to basic search:", error);
        return this.basicSearch(query, table, [column]);
      }

      // Transform the RPC response to match expected format
      return (data || []).map((item: any) => ({
        ...item.content,
        similarity: item.similarity_score,
      }));
    } catch (error) {
      console.warn("Similarity search not available, using basic search:", error);
      return this.basicSearch(query, table, [column]);
    }
  }

  /**
   * Enhanced full-text search using PostgreSQL's tsvector
   */
  async enhancedFullTextSearch(query: string, table: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc("enhanced_text_search", {
        search_query: query,
        search_table: table,
        limit_count: SEARCH_CONFIG.maxResults,
      });

      if (error) {
        console.warn("Enhanced full-text search failed:", error);
        return [];
      }

      // Transform the RPC response to match expected format
      return (data || []).map((item: any) => ({
        ...item.content,
        rank_score: item.rank_score,
      }));
    } catch (error) {
      console.warn("Enhanced full-text search not available:", error);
      return [];
    }
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

    try {
      const { data, error } = await supabase.rpc("hybrid_search", {
        search_query: query,
        search_table: table,
        similarity_weight: similarityWeight,
        fts_weight: ftsWeight,
        limit_count: limit,
      });

      if (error) {
        console.warn("Hybrid search failed:", error);
        return [];
      }

      // Transform the RPC response to match expected format
      return (data || []).map((item: any) => ({
        ...item.content,
        combined_score: item.combined_score,
        similarity_score: item.similarity_score,
        fts_score: item.fts_score,
      }));
    } catch (error) {
      console.warn("Hybrid search not available:", error);
      return [];
    }
  }

  /**
   * Full-text search using PostgreSQL's built-in FTS
   */
  async fullTextSearch(query: string, table: string, textColumn: string): Promise<any[]> {
    try {
      // Use PostgreSQL's full-text search
      const { data, error } = await supabase
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
      return (data || []).map(mapFieldsToCamelCase);
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
    } = {},
  ): Promise<SearchResults> {
    return withRetry(async () => {
      const { useFullText = false, useSimilarity = false, sortBy = "date" } = options;

      let reviewData: any[] = [];

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

  /**
   * Get search suggestions based on historical search data
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
    try {
      if (partialQuery.length < 2) return [];

      const { data, error } = await supabase.rpc("get_search_suggestions", {
        partial_query: partialQuery,
        limit_count: limit,
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
