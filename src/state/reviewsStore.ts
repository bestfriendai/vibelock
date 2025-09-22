import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../utils/mmkvStorage";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { v4 as uuidv4 } from "uuid";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Review, FilterOptions, GreenFlag, RedFlag, MediaItem, SocialMediaHandles, Sentiment } from "../types";
import { filterReviewsByDistanceAsync } from "../utils/location";
import { reviewsService } from "../services/reviews";
import { storageService } from "../services/storageService";
import useAuthStore from "./authStore";
import { notificationService } from "../services/notificationService";
import { AppError, parseSupabaseError } from "../utils/errorHandling";
import { withMediaErrorHandling, handleMediaUploadError } from "../utils/mediaErrorHandling";

// Constants for data limits
const MAX_PERSISTED_REVIEWS = 100;
const MAX_MEDIA_ITEMS_PER_REVIEW = 3;

// Sanitize reviews for persistence - remove sensitive information
const sanitizeReviewsForPersistence = (reviews: Review[]): Partial<Review>[] => {
  // Limit number of reviews
  const limitedReviews = reviews.slice(0, MAX_PERSISTED_REVIEWS);

  return limitedReviews.map((review) => ({
    ...review,
    // Remove or anonymize sensitive author information
    authorId: review.authorId ? "anon_" + review.authorId.substring(0, 8) : "anonymous",
    reviewerAnonymousId: review.reviewerAnonymousId
      ? "anon_" + review.reviewerAnonymousId.substring(0, 8)
      : review.reviewerAnonymousId,
    // Limit media items and remove large media objects
    media: review.media
      ? review.media.slice(0, MAX_MEDIA_ITEMS_PER_REVIEW).map((mediaItem) => ({
          ...mediaItem,
          // Keep only essential media metadata, remove actual URIs for security
          uri: mediaItem.type === "image" ? "[Image]" : mediaItem.type === "video" ? "[Video]" : mediaItem.uri,
          thumbnailUri: undefined,
        }))
      : [],
    // Remove sensitive social media information
    socialMedia: undefined,
    // Keep essential review data but limit text length
    reviewText: review.reviewText
      ? review.reviewText.substring(0, 200) + (review.reviewText.length > 200 ? "..." : "")
      : review.reviewText,
  }));
};

interface ReviewsState {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  filters: FilterOptions;
  hasMore: boolean;
  lastVisible: any | null;
}

interface ReviewsActions {
  setReviews: (reviews: Review[]) => void;
  addReview: (review: Review) => void;
  updateReview: (id: string, updates: Partial<Review>) => void;
  deleteReview: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  loadReviews: (
    refresh?: boolean,
    overrideLocation?: { city: string; state: string; coordinates?: { latitude: number; longitude: number } },
  ) => Promise<void>;
  loadReview: (id: string) => Promise<Review | null>;
  createReview: (data: {
    reviewedPersonName: string;
    reviewedPersonLocation: { city: string; state: string };
    greenFlags?: GreenFlag[];
    redFlags?: RedFlag[];
    sentiment?: Sentiment;
    reviewText: string;
    media: MediaItem[];
    socialMedia?: SocialMediaHandles;
    category?: "men" | "women" | "lgbtq+" | "all";
    csrfToken?: string; // CSRF protection token
  }) => Promise<void>;
  likeReview: (id: string) => Promise<void>;
  dislikeReview: (id: string) => Promise<void>;
  clearError: () => void;
}

type ReviewsStore = ReviewsState & ReviewsActions;

// Mock data removed - using real Supabase data only

const useReviewsStore = create<ReviewsStore>()(
  persist(
    (set, get) => ({
      // State - Initialize with empty array to force loading from Supabase
      reviews: [],
      isLoading: false,
      error: null,
      filters: {
        category: "all",
        radius: 50,
        sortBy: "recent",
      },
      hasMore: true,
      lastVisible: null,

      // Actions
      setReviews: (reviews) => {
        set({ reviews, error: null });
      },

      addReview: (review) => {
        set((state) => ({
          reviews: [review, ...state.reviews],
        }));
      },

      updateReview: (id, updates) => {
        set((state) => ({
          reviews: state.reviews.map((review) => (review.id === id ? { ...review, ...updates } : review)),
        }));
      },

      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.id !== id),
        }));
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      loadReview: async (id: string): Promise<Review | null> => {
        try {
          console.log("🐛 loadReview called with id:", id);

          if (__DEV__) {
            console.log("🧭 Loading review by ID:", id);
          }

          // Use reviewsService to get the specific review
          const result = await reviewsService.getReview(id);

          if (__DEV__) {
            console.log("✅ Review loaded successfully:", result ? "Found" : "Not found");
          }

          return result;
        } catch (error) {
          console.warn("💥 Failed to load review:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          // Don't update store error state for individual review loading failures
          throw appError;
        }
      },

      loadReviews: async (
        refresh = false,
        overrideLocation?: { city: string; state: string; coordinates?: { latitude: number; longitude: number } },
      ) => {
        try {
          // Early return if already loading to prevent duplicate requests
          const currentState = get();
          if (currentState.isLoading && !refresh) {
            return;
          }

          set({ isLoading: true, error: null });
          const { filters } = currentState;

          // Get user preference and location from auth store if available, or use override
          let userPrefCategory: string | undefined;
          let userLocation:
            | { city: string; state: string; coordinates?: { latitude: number; longitude: number } }
            | undefined;

          if (overrideLocation) {
            // Use the provided location override (for immediate location changes)
            userLocation = overrideLocation;
          }

          try {
            // Get auth store state to avoid circular deps
            const authStore = useAuthStore.getState();
            userPrefCategory = authStore.user?.genderPreference;

            // Only use auth store location if no override provided
            if (!overrideLocation) {
              userLocation = authStore.user?.location;
            }
          } catch (error) {
            userPrefCategory = undefined;
            if (!overrideLocation) {
              userLocation = undefined;
            }
          }

          // Build server-side filters
          const serverFilters: {
            category?: string;
            city?: string;
            state?: string;
            radiusMiles?: number;
          } = {};

          // Apply category filter
          const categoryToFilter = filters.category || userPrefCategory || "all";
          if (categoryToFilter && categoryToFilter !== "all") {
            serverFilters.category = categoryToFilter;
          }

          // Decide strategy based on radius filter
          const radiusFilteringActive = typeof filters.radius === "number" && filters.radius > 0 && !!userLocation;
          const showAllActive = filters.radius === null || filters.radius === undefined;

          // Apply location filters based on strategy
          if (showAllActive) {
            // "Show all" mode: no location filtering at all
            console.log("🌐 Show all mode - no location filtering");
          } else if (userLocation?.city && userLocation?.state) {
            if (radiusFilteringActive) {
              // For radius filtering: don't apply server-side location filters
              // Let client-side distance filtering handle geographic boundaries worldwide
              // This allows cross-city, cross-state, and international results within the radius
              console.log("🌍 Radius filtering active - using worldwide search with distance filtering");
            } else {
              // For non-radius filtering: filter by exact city+state
              serverFilters.city = userLocation.city;
              serverFilters.state = userLocation.state;
            }
          }

          if (__DEV__) {
            console.log("🧭 Reviews load filters:", {
              categoryToFilter,
              serverFilters,
              userLocation,
              radius: filters.radius,
              offset: refresh ? 0 : currentState.reviews.length,
              radiusFilteringActive,
              showAllActive,
            });
          }

          // Load from Supabase with fallback strategy
          let newReviews: Review[] = [];

          if (showAllActive) {
            // "Show all" mode: get reviews from anywhere without location filtering
            const offset = refresh ? 0 : currentState.reviews.length;
            const globalFilters = { category: serverFilters.category };
            const result = await reviewsService.getReviews({ ...globalFilters, limit: 50, offset });
            newReviews = result.data;

            if (__DEV__) {
              console.log("🌐 Show all reviews loaded:", newReviews.length);
            }
          } else if (radiusFilteringActive && userLocation) {
            // Strategy 1: Location-first approach - get ALL reviews with coordinates, then filter by distance
            // This ensures we don't miss local reviews that are older than the most recent 200 global reviews

            const fetchLimit = 1000; // Increase limit to ensure we get local reviews
            const fetchOffset = 0;

            // Get all reviews with coordinates (no location filters to ensure we get everything)
            const worldwideResult = await reviewsService.getReviews({
              category: serverFilters.category, // Only apply category filter, not location
              limit: fetchLimit,
              offset: fetchOffset,
            });
            const worldwideSet = worldwideResult.data;

            // Ensure user location has coordinates for distance filtering
            if (!userLocation) {
              console.warn("❌ User location is undefined, cannot perform radius filtering");
              // Fall back to non-radius filtering
              const offset = refresh ? 0 : currentState.reviews.length;
              const result = await reviewsService.getReviews({
                category: serverFilters.category,
                limit: 20,
                offset,
              });
              newReviews = result.data;
            } else {
              let locationWithCoords = userLocation;
              if (!userLocation.coordinates) {
                console.log("🔍 User location missing coordinates, attempting to geocode...");
                const { geocodeCityStateCached } = await import("../utils/location");
                const coords = await geocodeCityStateCached(userLocation.city, userLocation.state);
                if (coords) {
                  locationWithCoords = { ...userLocation, coordinates: coords };
                  console.log("✅ Successfully geocoded user location:", coords);
                } else {
                  console.warn("❌ Failed to geocode user location, falling back to server-filtered results");
                  // Fall back to non-radius filtering
                  const offset = refresh ? 0 : currentState.reviews.length;
                  const result = await reviewsService.getReviews({
                    category: serverFilters.category,
                    limit: 20,
                    offset,
                  });
                  newReviews = result.data;
                }
              }

              // Only proceed with distance filtering if we have coordinates and haven't already loaded reviews
              if (locationWithCoords.coordinates && newReviews.length === 0) {
                // Filter by distance first, then sort by creation date
                const distanceFiltered = await filterReviewsByDistanceAsync(
                  worldwideSet,
                  locationWithCoords,
                  filters.radius!,
                );

                // Sort by creation date (most recent first) after distance filtering
                newReviews = distanceFiltered.sort(
                  (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
                );

                if (__DEV__) {
                  console.log("📏 Location-first distance filtering:", {
                    worldwideReviews: worldwideSet.length,
                    withinRadius: distanceFiltered.length,
                    finalResults: newReviews.length,
                    radius: filters.radius,
                    location: `${locationWithCoords.city}, ${locationWithCoords.state}`,
                    hasCoordinates: !!locationWithCoords.coordinates,
                    coordinates: locationWithCoords.coordinates,
                  });
                }
              }
            }

            // Note: No fallback needed since we're prioritizing location over recency
          } else {
            // Non-radius filtering: prioritize local reviews, then expand search
            const offset = refresh ? 0 : currentState.reviews.length;

            // Strategy 1: Try exact city+state match first
            const result = await reviewsService.getReviews({ ...serverFilters, limit: 20, offset });
            newReviews = result.data;

            // Strategy 2: If no results with city+state, try state-only
            if (newReviews.length === 0 && refresh && serverFilters.city && serverFilters.state) {
              console.log("🔄 No results with city+state filter, trying state-only filter...");
              const stateOnlyFilters = { ...serverFilters };
              delete stateOnlyFilters.city;

              const stateResult = await reviewsService.getReviews({ ...stateOnlyFilters, limit: 20, offset });
              newReviews = stateResult.data;

              if (__DEV__) {
                console.log("📍 State-only filtered reviews:", newReviews.length);
              }
            }

            // Strategy 3: If still no results, get reviews from anywhere (fallback)
            if (newReviews.length === 0 && refresh) {
              console.log("🌍 No local results found, showing reviews from anywhere...");
              const globalFilters = { category: serverFilters.category };
              const globalResult = await reviewsService.getReviews({ ...globalFilters, limit: 20, offset });
              newReviews = globalResult.data;

              if (__DEV__) {
                console.log("🌐 Global fallback reviews:", newReviews.length);
              }
            }
          }

          // If no reviews found and this is a refresh, show empty state
          if (refresh && newReviews.length === 0) {
            set({
              reviews: [],
              hasMore: false,
              lastVisible: null,
              isLoading: false,
              error: "No reviews found. Be the first to create one!",
            });
            return;
          }

          if (refresh) {
            set({
              reviews: newReviews,
              hasMore: newReviews.length === 20,
              lastVisible: null, // Supabase uses offset-based pagination
              isLoading: false,
            });
          } else {
            const currentReviews = currentState.reviews;
            set({
              reviews: [...currentReviews, ...newReviews],
              hasMore: newReviews.length === 20,
              lastVisible: null, // Supabase uses offset-based pagination
              isLoading: false,
            });
          }
        } catch (error) {
          console.warn("💥 Failed to load reviews:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          set({
            error: appError.userMessage,
            isLoading: false,
          });

          // Don't fallback to mock data - show proper error state
          throw appError;
        }
      },

      createReview: async (data) => {
        console.log("🎬 createReview called with data:", {
          reviewedPersonName: data.reviewedPersonName,
          mediaCount: data.media?.length || 0,
          mediaTypes: data.media?.map((m) => m.type) || [],
        });

        try {
          set({ isLoading: true, error: null });

          // CSRF validation
          if (data.csrfToken && (typeof data.csrfToken !== "string" || data.csrfToken.length < 10)) {
            throw new Error("Invalid security token. Please refresh and try again.");
          }

          // Basic validation
          if (!data.reviewedPersonName.trim() || !data.reviewText.trim()) {
            throw new Error("Name and review text are required");
          }

          // Require at least one media item (photo or video)
          const hasMedia = Array.isArray(data.media) && data.media.length > 0;
          if (!hasMedia) {
            throw new Error("Please add at least one photo or video to your review");
          }

          // Upload media files to Supabase Storage if they are local files
          const uploadedMedia: MediaItem[] = [];
          const mediaUploads: { failed?: { index: number; type: string; uri: string; error: string }[] } = {};
          console.log(`🚀 Starting media upload process for ${data.media.length} items`);

          for (const [index, mediaItem] of data.media.entries()) {
            const isLocal = mediaItem.uri.startsWith("file://") || mediaItem.uri.startsWith("content://");
            console.log(`📁 Processing media item ${index + 1}:`, {
              type: mediaItem.type,
              uri: mediaItem.uri.substring(0, 100) + "...",
              isLocal,
            });

            if (!isLocal) {
              console.log(`⏭️  Skipping non-local media item`);
              uploadedMedia.push(mediaItem);
              continue;
            }

            try {
              let processedUri = mediaItem.uri;
              const mime =
                mediaItem.type === "video"
                  ? mediaItem.uri.toLowerCase().endsWith(".mov")
                    ? "video/quicktime"
                    : "video/mp4"
                  : "image/jpeg";
              let fileName = `reviews/${Date.now()}_${Math.random().toString(36).substring(7)}`;
              fileName += mediaItem.type === "video" ? (mime === "video/quicktime" ? ".mov" : ".mp4") : ".jpg";

              if (mediaItem.type === "image") {
                // Compress and resize image using expo-image-manipulator
                const manipulatedImage = await manipulateAsync(mediaItem.uri, [{ resize: { width: 800 } }], {
                  compress: 0.8,
                  format: SaveFormat.JPEG,
                });

                processedUri = manipulatedImage.uri;

                // Log compression results
                const fileInfo = await FileSystem.getInfoAsync(processedUri);
                if (fileInfo.exists && fileInfo.size) {
                  const sizeKB = Math.round(fileInfo.size / 1024);
                  console.log(`📸 Image compressed to ~${sizeKB}KB`);
                }

                const uploadResult = await storageService.uploadFile(processedUri, {
                  bucket: "review-images",
                  fileName: fileName,
                  contentType: "image/jpeg",
                });
                const downloadURL = uploadResult.url || "";

                uploadedMedia.push({
                  ...mediaItem,
                  uri: downloadURL,
                  width: manipulatedImage.width || mediaItem.width,
                  height: manipulatedImage.height || mediaItem.height,
                });

                // Clean up manipulated image uri if it's temp
                if (processedUri.startsWith(FileSystem.cacheDirectory || "")) {
                  await FileSystem.deleteAsync(processedUri, { idempotent: true }).catch(console.warn);
                }
              } else if (mediaItem.type === "video") {
                // Generate a thumbnail from the local video (best-effort)
                let thumbnailUrl: string | undefined;
                try {
                  const { uri: thumbLocal } = await VideoThumbnails.getThumbnailAsync(mediaItem.uri, { time: 1000 });
                  const thumbName = `reviews/${Date.now()}_${Math.random().toString(36).substring(7)}_thumb.jpg`;
                  const thumbResult = await storageService.uploadFile(thumbLocal, {
                    bucket: "review-images",
                    fileName: thumbName,
                    contentType: "image/jpeg",
                  });
                  thumbnailUrl = thumbResult.url || "";
                  console.log("✅ Video thumbnail uploaded successfully");
                } catch (thumbErr) {
                  console.warn("⚠️ Failed to generate/upload video thumbnail:", thumbErr);
                }

                const uploadResult = await storageService.uploadFile(processedUri, {
                  bucket: "review-images",
                  fileName: fileName,
                  contentType: mime,
                });
                const downloadURL = uploadResult.url || "";

                uploadedMedia.push({
                  ...mediaItem,
                  uri: downloadURL,
                  ...(thumbnailUrl ? { thumbnailUri: thumbnailUrl } : {}),
                });
              } else {
                // Unknown type, just keep as-is
                uploadedMedia.push(mediaItem);
              }
            } catch (uploadError) {
              console.warn("❌ Failed to upload media:", {
                index,
                originalUri: mediaItem.uri,
                mediaType: mediaItem.type,
                error: uploadError instanceof Error ? uploadError.message : String(uploadError),
              });

              // Use safe media error handling
              const mediaError = handleMediaUploadError(uploadError, `media upload for ${mediaItem.type}`);
              console.warn(`Media upload failed:`, mediaError);

              // Track failed uploads
              if (!mediaUploads.failed) {
                mediaUploads.failed = [];
              }
              mediaUploads.failed.push({
                index,
                type: mediaItem.type,
                uri: mediaItem.uri,
                error: mediaError.userMessage || "Unknown upload error",
              });

              // Continue with other media items
            }
          }

          // Only keep successfully uploaded remote media (with https URLs)
          const remoteMedia = (uploadedMedia || []).filter(
            (m): m is MediaItem => m && typeof m.uri === "string" && /^https?:\/\//.test(m.uri),
          );

          // Check if uploads were successful
          const hasRemoteMedia = remoteMedia.length > 0;
          if (!hasRemoteMedia && mediaUploads.failed && mediaUploads.failed.length > 0) {
            // All uploads failed
            const errorMsg = `Failed to upload media. Errors: ${mediaUploads.failed.map((f) => f.error).join("; ")}`;
            throw new Error(errorMsg);
          }

          // Create review data for backend
          const reviewData: Omit<Review, "id" | "createdAt" | "updatedAt" | "authorId"> = {
            reviewerAnonymousId: uuidv4(),
            reviewedPersonName: data.reviewedPersonName,
            reviewedPersonLocation: data.reviewedPersonLocation,
            greenFlags: data.greenFlags || [],
            redFlags: data.redFlags || [],
            reviewText: data.reviewText,
            media: remoteMedia,
            profilePhoto:
              remoteMedia.find((m) => m.type === "image")?.uri ||
              `https://picsum.photos/400/${Math.floor(Math.random() * 200) + 500}?random=${Date.now()}`,
            status: "approved", // Auto-approve for now (moderation removed)
            category: data.category || "men",
            likeCount: 0,
            // Only include optional fields if they have values
            ...(data.sentiment && { sentiment: data.sentiment }),
            ...(data.socialMedia && Object.keys(data.socialMedia).length > 0 && { socialMedia: data.socialMedia }),
          };

          // Create the full review object for immediate local display
          const newReview: Review = {
            ...reviewData,
            authorId: (() => {
              try {
                const userId = useAuthStore.getState().user?.id;
                if (!userId) {
                  console.warn("No user ID available, using fallback");
                  return "anonymous_user";
                }
                return userId;
              } catch (error) {
                console.warn("Error getting user from auth store:", error);
                return "anonymous_user";
              }
            })(),
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add to local state immediately (optimistic update)
          get().addReview(newReview);
          set({ isLoading: false });

          // Try to save to database in background (don't wait for it)
          reviewsService.createReview({ ...reviewData, authorId: newReview.authorId }).catch((error) => {
            console.warn("Failed to save review to database (but it's still visible locally):", error);
          });

          // Check for partial media upload success
          if (mediaUploads.failed && mediaUploads.failed.length > 0 && hasRemoteMedia) {
            const failedCount = mediaUploads.failed.length;
            const successCount = remoteMedia.length;
            const detailMsg = `${failedCount} item${failedCount > 1 ? "s" : ""} failed to upload, but review created with ${successCount} item${successCount > 1 ? "s" : ""}.`;
            set({
              error: detailMsg,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to create review",
            isLoading: false,
          });
        }
      },

      likeReview: async (id) => {
        try {
          const review = get().reviews.find((r) => r.id === id);
          if (review) {
            const newLikeCount = (review.likeCount || 0) + 1;

            // Update in database
            await reviewsService.updateReview(id, { likeCount: newLikeCount });

            // Update local state
            get().updateReview(id, { likeCount: newLikeCount });

            // Create notification for review author (if not self)
            try {
              const currentUser = useAuthStore.getState().user;
              if (review.authorId && review.authorId !== currentUser?.id) {
                await notificationService.createNotification(review.authorId, {
                  type: "new_like",
                  title: "Your review got a like",
                  body: `${review.reviewedPersonName || "Someone you reviewed"} received a like`,
                  data: { reviewId: review.id },
                });
              }
            } catch (notifyErr) {
              console.warn("Failed to create like notification:", notifyErr);
            }
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to like review",
          });
        }
      },

      dislikeReview: async (id) => {
        try {
          // For now, just log the dislike action
          // In a real app, this would send to the backend
          console.log(`Disliked review ${id}`);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to dislike review",
          });
        }
      },
    }),
    {
      name: "reviews-storage",
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist sanitized reviews and filters, not loading states
      partialize: (state) => ({
        reviews: sanitizeReviewsForPersistence(state.reviews),
        filters: state.filters,
      }),
      // Add version for future migrations
      version: 1,
      migrate: (persistedState: any, _version: number) => {
        try {
          const ps = persistedState || {};
          return {
            reviews: Array.isArray(ps.reviews) ? ps.reviews : [],
            filters: ps.filters ?? { category: "all", radius: 50, sortBy: "recent" },
          };
        } catch (error) {
          return { reviews: [], filters: { category: "all", radius: 50, sortBy: "recent" } };
        }
      },
      // Add data cleanup on hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.reviews) {
          // Clean up old persisted reviews periodically
          const now = Date.now();
          const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

          // Remove reviews older than a month
          state.reviews = state.reviews.filter((review) => {
            return new Date(review.createdAt || 0).getTime() > oneMonthAgo;
          });

          if (__DEV__) {
            console.log("🧹 Reviews store: Cleaned up old persisted data");
          }
        }
      },
    },
  ),
);

export default useReviewsStore;
