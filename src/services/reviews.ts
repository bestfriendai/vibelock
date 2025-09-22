import supabase from "../config/supabase";
import { Review, Comment, MediaItem, SocialMediaHandles } from "../types";
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from "../utils/fieldMapping";
import { withRetry } from "../utils/retryLogic";
import { mapDatabaseReviewToReview, mapReviewToDatabase } from "../utils/databaseMapping";

interface ReviewsFilter {
  userId?: string;
  roomId?: string;
  category?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

// Helper function to transform database review to app Review type
function transformDatabaseReview(dbReview: any): Review {
  const camelCased = mapFieldsToCamelCase(dbReview);
  return {
    ...camelCased,
    createdAt: dbReview.created_at ? new Date(dbReview.created_at) : null,
    updatedAt: dbReview.updated_at ? new Date(dbReview.updated_at) : null,
    reviewedPersonLocation: dbReview.reviewed_person_location
      ? typeof dbReview.reviewed_person_location === "object" && dbReview.reviewed_person_location !== null
        ? (dbReview.reviewed_person_location as {
            city: string;
            state: string;
            coordinates?: { latitude: number; longitude: number };
          })
        : { city: "", state: "" }
      : { city: "", state: "" },
    media: dbReview.media
      ? Array.isArray(dbReview.media)
        ? (dbReview.media as unknown as MediaItem[])
        : []
      : undefined,
    socialMedia: dbReview.social_media as SocialMediaHandles | undefined,
  } as Review;
}

// Helper function to transform app Review to database format
function transformReviewToDatabase(review: Partial<Omit<Review, "id" | "createdAt" | "updatedAt">>): any {
  const snakeCased: any = mapFieldsToSnakeCase(review);

  // Convert dates to strings if needed
  if ("createdAt" in review && review.createdAt) {
    snakeCased.created_at = review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt;
  }
  if ("updatedAt" in review && review.updatedAt) {
    snakeCased.updated_at = review.updatedAt instanceof Date ? review.updatedAt.toISOString() : review.updatedAt;
  }

  // Convert media to JSON format
  if (review.media) {
    snakeCased.media = review.media as any;
  }

  // Convert socialMedia to JSON format
  if (review.socialMedia) {
    snakeCased.social_media = review.socialMedia as any;
  }

  // Convert reviewedPersonLocation to JSON format
  if (review.reviewedPersonLocation) {
    snakeCased.reviewed_person_location = review.reviewedPersonLocation as any;
  }

  return snakeCased;
}

export class ReviewsService {
  async getReviews(filter: ReviewsFilter = {}): Promise<PaginatedResponse<Review>> {
    return withRetry(
      async () => {
        try {
          // Query with foreign key join (now that constraint is properly set up)
          let query = supabase
            .from("reviews_firebase")
            .select("*, author:users!author_id(id, username)", { count: "exact" });

          if (filter.userId) {
            query = query.eq("author_id", filter.userId);
          }

          if (filter.roomId) {
            // reviews_firebase doesn't have room_id, skip this filter
            console.warn("Room filtering not supported for reviews_firebase table");
          }

          if (filter.category) {
            query = query.eq("category", filter.category);
          }

          if (filter.searchQuery) {
            query = query.or(
              `reviewed_person_name.ilike.%${filter.searchQuery}%,review_text.ilike.%${filter.searchQuery}%`,
            );
          }

          const limit = filter.limit || 20;
          const offset = filter.offset || 0;

          query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

          const { data, error, count } = await query;

          if (error) throw error;

          // Get comments count for each review separately (for now, we'll set to 0)
          const reviews = (data || []).map((item) => {
            const camelCased = mapFieldsToCamelCase(item);
            return {
              ...camelCased,
              commentsCount: 0, // TODO: Implement proper comments count
              createdAt: item.created_at ? new Date(item.created_at) : null,
              updatedAt: item.updated_at ? new Date(item.updated_at) : null,
              reviewedPersonLocation: item.reviewed_person_location
                ? typeof item.reviewed_person_location === "object" && item.reviewed_person_location !== null
                  ? (item.reviewed_person_location as {
                      city: string;
                      state: string;
                      coordinates?: { latitude: number; longitude: number };
                    })
                  : { city: "", state: "" }
                : { city: "", state: "" },
              media: item.media ? (Array.isArray(item.media) ? (item.media as unknown as MediaItem[]) : []) : undefined,
              socialMedia: item.social_media as SocialMediaHandles | undefined,
            };
          });

          return {
            data: reviews as Review[],
            count: count || 0,
            hasMore: (count || 0) > offset + limit,
          };
        } catch (error: any) {
          console.error("Error fetching reviews:", error);
          throw error;
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableErrors: ["NETWORK", "TIMEOUT", "SERVER_ERROR"],
      },
    );
  }

  async getReview(reviewId: string): Promise<Review | null> {
    const { data, error } = await supabase
      .from("reviews_firebase")
      .select("*, author:users!author_id(id, username)")
      .eq("id", reviewId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    // Use the new mapping utility for consistent field mapping
    return mapDatabaseReviewToReview(data);
  }

  async createReview(review: Omit<Review, "id" | "createdAt" | "updatedAt">): Promise<Review> {
    const dbReview = transformReviewToDatabase(review);

    const { data, error } = await supabase
      .from("reviews_firebase")
      .insert(dbReview)
      .select("*, author:users!author_id(id, username)")
      .single();

    if (error) throw error;
    return transformDatabaseReview(data);
  }

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<Review> {
    const dbUpdates = transformReviewToDatabase(updates);

    const { data, error } = await supabase
      .from("reviews_firebase")
      .update(dbUpdates)
      .eq("id", reviewId)
      .select("*, author:users!author_id(id, username)")
      .single();

    if (error) throw error;
    return transformDatabaseReview(data);
  }

  async deleteReview(reviewId: string): Promise<void> {
    const { error } = await supabase.from("reviews_firebase").delete().eq("id", reviewId);

    if (error) throw error;
  }

  async likeReview(reviewId: string, userId: string): Promise<void> {
    // TODO: review_likes table missing
    // const { error } = // TODO: review_likes table missing - await supabase.from("review_likes").insert({
    //   review_id: reviewId,
    //   user_id: userId,
    // });
    // if (error && !error.message.includes("duplicate")) throw error;

    console.warn("likeReview: review_likes table not implemented yet");
  }

  async unlikeReview(reviewId: string, userId: string): Promise<void> {
    // TODO: review_likes table missing
    // const { error } = // TODO: review_likes table missing - await supabase.from("review_likes").delete().eq("review_id", reviewId).eq("user_id", userId);
    // if (error) throw error;

    console.warn("unlikeReview: review_likes table not implemented yet");
  }

  async getReviewComments(reviewId: string, limit: number = 50): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("comments_firebase")
      .select("*, author:users!author_id(id, username)")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((item) => mapFieldsToCamelCase(item) as Comment);
  }

  async createComment(comment: Omit<Comment, "id" | "createdAt" | "updatedAt">): Promise<Comment> {
    const snakeCaseComment: any = mapFieldsToSnakeCase(comment);

    // Ensure author_name is set if not provided
    if (!snakeCaseComment.author_name && comment.authorName) {
      snakeCaseComment.author_name = comment.authorName;
    } else if (!snakeCaseComment.author_name) {
      snakeCaseComment.author_name = "Anonymous";
    }

    const { data, error } = await supabase
      .from("comments_firebase")
      .insert(snakeCaseComment)
      .select("*, author:users!author_id(id, username)")
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data) as Comment;
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from("comments_firebase").delete().eq("id", commentId);

    if (error) throw error;
  }

  async reportReview(reviewId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabase.from("reports").insert({
      reported_item_id: reviewId,
      reported_item_type: "review",
      reporter_id: userId,
      reason,
    });

    if (error) throw error;
  }
}

export const reviewsService = new ReviewsService();
