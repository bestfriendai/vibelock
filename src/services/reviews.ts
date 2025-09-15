import { supabase } from '../config/supabase';
import { Review, Comment } from '../types';
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from '../utils/fieldMapping';
import { withRetry } from '../utils/retryLogic';

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

export class ReviewsService {
  async getReviews(filter: ReviewsFilter = {}): Promise<PaginatedResponse<Review>> {
    return withRetry(async () => {
      let query = supabase
        .from('reviews')
        .select('*, user:users(*), comments(count)', { count: 'exact' });

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.roomId) {
        query = query.eq('room_id', filter.roomId);
      }

      if (filter.category) {
        query = query.eq('category', filter.category);
      }

      if (filter.searchQuery) {
        query = query.or(`title.ilike.%${filter.searchQuery}%,content.ilike.%${filter.searchQuery}%`);
      }

      const limit = filter.limit || 20;
      const offset = filter.offset || 0;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const reviews = (data || []).map(item => ({
        ...mapFieldsToCamelCase(item),
        commentsCount: item.comments?.[0]?.count || 0,
      }));

      return {
        data: reviews,
        count: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    });
  }

  async getReview(reviewId: string): Promise<Review | null> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, user:users(*)')
      .eq('id', reviewId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return mapFieldsToCamelCase(data);
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    const snakeCaseReview = mapFieldsToSnakeCase(review);

    const { data, error } = await supabase
      .from('reviews')
      .insert(snakeCaseReview)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<Review> {
    const snakeCaseUpdates = mapFieldsToSnakeCase(updates);

    const { data, error } = await supabase
      .from('reviews')
      .update(snakeCaseUpdates)
      .eq('id', reviewId)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async deleteReview(reviewId: string): Promise<void> {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;
  }

  async likeReview(reviewId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('review_likes')
      .insert({
        review_id: reviewId,
        user_id: userId,
      });

    if (error && !error.message.includes('duplicate')) throw error;
  }

  async unlikeReview(reviewId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getReviewComments(reviewId: string, limit: number = 50): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:users(*)')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapFieldsToCamelCase);
  }

  async createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const snakeCaseComment = mapFieldsToSnakeCase(comment);

    const { data, error } = await supabase
      .from('comments')
      .insert(snakeCaseComment)
      .select('*, user:users(*)')
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }

  async reportReview(reviewId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .insert({
        review_id: reviewId,
        reporter_id: userId,
        reason,
        type: 'review',
      });

    if (error) throw error;
  }
}

export const reviewsService = new ReviewsService();