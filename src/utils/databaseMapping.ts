// Database field mapping utilities for Supabase integration
// Maps between snake_case database fields and camelCase TypeScript interfaces

import { Review, MediaItem } from "../types";

/**
 * Maps a raw database review record to the Review interface
 * Handles both snake_case (database) and camelCase (legacy) formats
 */
export function mapDatabaseReviewToReview(dbReview: any): Review | null {
  if (!dbReview) return null;

  try {
    // Handle media field - can be JSON string or object
    let media: MediaItem[] = [];
    if (dbReview.media) {
      if (typeof dbReview.media === "string") {
        try {
          media = JSON.parse(dbReview.media);
        } catch {
          media = [];
        }
      } else if (Array.isArray(dbReview.media)) {
        media = dbReview.media;
      }
    }

    // Handle location field - prioritize structured location over string
    let reviewedPersonLocation = {
      city: "Unknown",
      state: "",
      coordinates: undefined as { latitude: number; longitude: number } | undefined,
    };

    // Check for structured location first (both snake_case and camelCase)
    const structuredLocation = dbReview.reviewed_person_location || dbReview.reviewedPersonLocation;
    if (structuredLocation) {
      if (typeof structuredLocation === "string") {
        try {
          const parsed = JSON.parse(structuredLocation);
          reviewedPersonLocation = {
            city: parsed.city || "Unknown",
            state: parsed.state || "",
            coordinates: parsed.coordinates,
          };
        } catch {
          // If parsing fails, treat as city name
          reviewedPersonLocation.city = structuredLocation;
        }
      } else if (typeof structuredLocation === "object") {
        reviewedPersonLocation = {
          city: structuredLocation.city || "Unknown",
          state: structuredLocation.state || "",
          coordinates: structuredLocation.coordinates,
        };
      }
    }
    // Fall back to location string field
    else if (dbReview.location) {
      reviewedPersonLocation.city = dbReview.location;
    }

    // Handle social media - database stores as JSON
    let socialMedia = undefined;
    const socialMediaField = dbReview.social_media || dbReview.socialMedia;
    if (socialMediaField) {
      if (typeof socialMediaField === "string") {
        try {
          socialMedia = JSON.parse(socialMediaField);
        } catch {
          socialMedia = undefined;
        }
      } else if (typeof socialMediaField === "object") {
        socialMedia = socialMediaField;
      }
    }

    // Map database fields to Review interface
    // Support both snake_case (from database) and camelCase (legacy)
    return {
      id: dbReview.id,
      authorId: dbReview.author_id || dbReview.authorId || null,
      reviewerAnonymousId: dbReview.reviewer_anonymous_id || dbReview.reviewerAnonymousId || "anonymous",
      reviewedPersonName: dbReview.reviewed_person_name || dbReview.reviewedPersonName || "Unknown",
      reviewedPersonLocation,
      category: dbReview.category || null,
      profilePhoto: dbReview.profile_photo || dbReview.profilePhoto || "",
      greenFlags: dbReview.green_flags || dbReview.greenFlags || [],
      redFlags: dbReview.red_flags || dbReview.redFlags || [],
      sentiment: dbReview.sentiment || null,
      reviewText: dbReview.review_text || dbReview.reviewText || "",
      media: media.length > 0 ? media : undefined,
      socialMedia,
      status: dbReview.status || null,
      likeCount: dbReview.like_count ?? dbReview.likeCount ?? 0,
      dislikeCount: dbReview.dislike_count ?? dbReview.dislikeCount ?? 0,
      createdAt: dbReview.created_at || dbReview.createdAt ? new Date(dbReview.created_at || dbReview.createdAt) : null,
      updatedAt: dbReview.updated_at || dbReview.updatedAt ? new Date(dbReview.updated_at || dbReview.updatedAt) : null,
      isAnonymous: dbReview.is_anonymous ?? dbReview.isAnonymous ?? false,
      location: dbReview.location || null,
    };
  } catch (error) {
    console.error("Error mapping database review:", error, dbReview);
    return null;
  }
}

/**
 * Maps a Review interface to database fields (snake_case)
 */
export function mapReviewToDatabase(review: Partial<Review>): any {
  const dbReview: any = {};

  if (review.id !== undefined) dbReview.id = review.id;
  if (review.authorId !== undefined) dbReview.author_id = review.authorId;
  if (review.reviewerAnonymousId !== undefined) dbReview.reviewer_anonymous_id = review.reviewerAnonymousId;
  if (review.reviewedPersonName !== undefined) dbReview.reviewed_person_name = review.reviewedPersonName;

  // Handle location - store as JSON
  if (review.reviewedPersonLocation !== undefined) {
    dbReview.reviewed_person_location = review.reviewedPersonLocation;
  }

  if (review.category !== undefined) dbReview.category = review.category;
  if (review.profilePhoto !== undefined) dbReview.profile_photo = review.profilePhoto;
  if (review.greenFlags !== undefined) dbReview.green_flags = review.greenFlags;
  if (review.redFlags !== undefined) dbReview.red_flags = review.redFlags;
  if (review.sentiment !== undefined) dbReview.sentiment = review.sentiment;
  if (review.reviewText !== undefined) dbReview.review_text = review.reviewText;

  // Handle media - store as JSON
  if (review.media !== undefined) {
    dbReview.media = review.media;
  }

  // Handle social media - store as JSON
  if (review.socialMedia !== undefined) {
    dbReview.social_media = review.socialMedia;
  }

  if (review.status !== undefined) dbReview.status = review.status;
  if (review.likeCount !== undefined) dbReview.like_count = review.likeCount;
  if (review.dislikeCount !== undefined) dbReview.dislike_count = review.dislikeCount;
  if (review.isAnonymous !== undefined) dbReview.is_anonymous = review.isAnonymous;
  if (review.location !== undefined) dbReview.location = review.location;

  return dbReview;
}
