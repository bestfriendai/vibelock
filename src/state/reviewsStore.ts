import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Review, FilterOptions, GreenFlag, RedFlag, MediaItem, SocialMediaHandles, Sentiment } from "../types";
import { filterReviewsByDistanceAsync } from "../utils/location";
import { supabaseReviews, supabaseStorage } from "../services/supabase";
import useAuthStore from "./authStore";
import { notificationService } from "../services/notificationService";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

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
  loadReviews: (refresh?: boolean) => Promise<void>;
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

      loadReviews: async (refresh = false) => {
        try {
          set({ isLoading: true, error: null });

          const currentState = get();
          const { filters } = get();

          // Get user preference and location from auth store if available
          let userPrefCategory: string | undefined;
          let userLocation: { city: string; state: string } | undefined;
          try {
            // Get auth store state to avoid circular deps
            const authStore = useAuthStore.getState();
            userPrefCategory = authStore.user?.genderPreference;
            userLocation = authStore.user?.location;
          } catch {
            userPrefCategory = undefined;
            userLocation = undefined;
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

          // Decide strategy: if radius is specified and we have a user location,
          // fetch a larger batch and apply precise client-side distance filtering
          const radiusFilteringActive = typeof filters.radius === 'number' && !!filters.radius && !!userLocation;

          if (__DEV__) {
            console.log("🧭 Reviews load filters:", {
              categoryToFilter,
              serverFilters,
              userLocation,
              radius: filters.radius,
              offset: refresh ? 0 : currentState.reviews.length,
              radiusFilteringActive,
            });
          }

          // Load from Supabase
          let newReviews: Review[] = [];

          if (radiusFilteringActive && userLocation) {
            // Over-fetch a larger recent set, then filter by distance locally
            const fetchLimit = 200; // Adjust as needed
            const fetchOffset = 0; // Always fresh for radius-based filtering
            const baseSet = await supabaseReviews.getReviews(fetchLimit, fetchOffset, {
              category: serverFilters.category,
            });

            newReviews = await filterReviewsByDistanceAsync(baseSet, userLocation, filters.radius!);

            if (__DEV__) {
              console.log("📏 Distance-filtered reviews:", {
                requested: fetchLimit,
                baseCount: baseSet.length,
                filteredCount: newReviews.length,
                radius: filters.radius,
                center: userLocation,
              });
            }
          } else {
            const offset = refresh ? 0 : currentState.reviews.length;
            newReviews = await supabaseReviews.getReviews(20, offset, serverFilters);
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
          console.error("💥 Failed to load reviews:", error);
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
        try {
          set({ isLoading: true, error: null });

          // Basic validation
          if (!data.reviewedPersonName.trim() || !data.reviewText.trim()) {
            throw new Error("Name and review text are required");
          }

          // Require at least one image in media
          const hasImage = Array.isArray(data.media) && data.media.some((m) => m.type === "image");
          if (!hasImage) {
            throw new Error("Please add at least one photo to your review");
          }

          const firstImage = data.media.find((m) => m.type === "image");

          // Upload media files to Supabase Storage if they are local files
          const uploadedMedia: MediaItem[] = [];
          for (const mediaItem of data.media) {
            if (mediaItem.uri.startsWith("file://") || mediaItem.uri.startsWith("content://")) {
              try {
                // Compress and resize image using expo-image-manipulator
                const manipulatedImage = await manipulateAsync(
                  mediaItem.uri,
                  [
                    { resize: { width: 800 } }, // Resize to max width of 800px
                  ],
                  {
                    compress: 0.8, // 80% quality
                    format: SaveFormat.JPEG,
                  },
                );

                // Read the compressed image as base64
                const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });

                // Convert base64 to blob
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "image/jpeg" });

                // Create unique filename
                const filename = `reviews/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const downloadURL = await supabaseStorage.uploadFile("chat-media", filename, blob);

                uploadedMedia.push({
                  ...mediaItem,
                  uri: downloadURL,
                  width: manipulatedImage.width,
                  height: manipulatedImage.height,
                });
              } catch (uploadError) {
                console.warn("Failed to upload media, using original URI:", uploadError);
                uploadedMedia.push(mediaItem);
              }
            } else {
              uploadedMedia.push(mediaItem);
            }
          }

          // Create review data for Firebase - remove undefined fields
          const reviewData: Omit<Review, "id" | "createdAt" | "updatedAt" | "authorId"> = {
            reviewerAnonymousId: `anon_${Date.now()}`,
            reviewedPersonName: data.reviewedPersonName,
            reviewedPersonLocation: data.reviewedPersonLocation,
            greenFlags: data.greenFlags || [],
            redFlags: data.redFlags || [],
            reviewText: data.reviewText,
            media: uploadedMedia || [],
            profilePhoto: firstImage
              ? firstImage.uri
              : `https://picsum.photos/400/${Math.floor(Math.random() * 200) + 500}?random=${Date.now()}`,
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
                return useAuthStore.getState().user?.id || "local_seed";
              } catch {
                return "local_seed";
              }
            })(),
            id: `review_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add to local state immediately (optimistic update)
          get().addReview(newReview);
          set({ isLoading: false });

          // Try to save to Supabase in background (don't wait for it)
          supabaseReviews.createReview(reviewData).catch((error) => {
            console.warn("Failed to save review to Supabase (but it's still visible locally):", error);
          });
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
            const newLikeCount = review.likeCount + 1;

            // Update in Supabase
            await supabaseReviews.updateReview(id, { likeCount: newLikeCount });

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
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist reviews and filters, not loading states
      partialize: (state) => ({
        reviews: state.reviews,
        filters: state.filters,
      }),
    },
  ),
);

export default useReviewsStore;
