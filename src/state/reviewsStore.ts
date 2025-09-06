import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Review, FilterOptions, GreenFlag, RedFlag, MediaItem, SocialMediaHandles, Sentiment } from "../types";
import { supabaseReviews, supabaseStorage } from "../services/supabase";
import useAuthStore from "./authStore";
import { notificationService } from "../services/notificationService";

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

// Mock data for development with realistic profiles
const mockReviews: Review[] = [
  {
    id: "1",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_123",
    reviewedPersonName: "Ava",
    reviewedPersonLocation: { city: "Washington", state: "DC" },
    category: "women",
    profilePhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=60",
    greenFlags: ["good_communicator", "respectful"],
    redFlags: [],
    sentiment: "green",
    reviewText: "Warm, easy to talk to, and very genuine.",
    status: "approved",
    likeCount: 12,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_456",
    reviewedPersonName: "Jasmine",
    reviewedPersonLocation: { city: "Alexandria", state: "VA" },
    category: "women",
    profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=60",
    greenFlags: ["reliable", "honest"],
    redFlags: [],
    sentiment: "green",
    reviewText: "Consistent and honest. Great energy overall.",
    status: "approved",
    likeCount: 8,
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_789",
    reviewedPersonName: "Taylor",
    reviewedPersonLocation: { city: "Arlington", state: "VA" },
    category: "all",
    profilePhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=60",
    greenFlags: ["fun", "kind", "good_listener"],
    redFlags: [],
    sentiment: "green",
    reviewText: "Thoughtful and fun to be around.",
    status: "approved",
    likeCount: 15,
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "4",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_101",
    reviewedPersonName: "Morgan",
    reviewedPersonLocation: { city: "Bethesda", state: "MD" },
    category: "men",
    profilePhoto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=60",
    greenFlags: [],
    redFlags: ["inconsistent"],
    sentiment: "red",
    reviewText: "Plans fall through often. Mixed signals.",
    status: "approved",
    likeCount: 23,
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
  },
  {
    id: "5",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_202",
    reviewedPersonName: "Jordan",
    reviewedPersonLocation: { city: "Silver Spring", state: "MD" },
    category: "men",
    profilePhoto: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=800&q=60",
    greenFlags: ["respectful", "kind"],
    redFlags: [],
    sentiment: "green",
    reviewText: "Kind and respectful, really listens.",
    status: "approved",
    likeCount: 18,
    createdAt: new Date("2024-01-11"),
    updatedAt: new Date("2024-01-11"),
  },
  {
    id: "6",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_303",
    reviewedPersonName: "Mia",
    reviewedPersonLocation: { city: "Arlington", state: "VA" },
    category: "women",
    profilePhoto: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=800&q=60",
    greenFlags: [],
    redFlags: ["poor_communication"],
    sentiment: "red",
    reviewText: "Hard to reach and rarely follows up.",
    status: "approved",
    likeCount: 31,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "7",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_404",
    reviewedPersonName: "Sophia",
    reviewedPersonLocation: { city: "Washington", state: "DC" },
    category: "women",
    profilePhoto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=60",
    greenFlags: ["ambitious"],
    redFlags: [],
    sentiment: "green",
    reviewText: "Driven and focused, very inspiring.",
    status: "approved",
    likeCount: 27,
    createdAt: new Date("2024-01-09"),
    updatedAt: new Date("2024-01-09"),
  },
  {
    id: "8",
    authorId: "seed_user",
    reviewerAnonymousId: "anon_505",
    reviewedPersonName: "Olivia",
    reviewedPersonLocation: { city: "Alexandria", state: "VA" },
    category: "women",
    profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=60",
    greenFlags: ["good_listener"],
    redFlags: [],
    sentiment: "green",
    reviewText: "Listens and engages thoughtfully.",
    status: "approved",
    likeCount: 19,
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-08"),
  },
];

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

          // Apply location filters based on radius
          if (filters.radius && userLocation) {
            if (filters.radius < 50) {
              // Small radius: filter by city and state
              serverFilters.city = userLocation.city;
              serverFilters.state = userLocation.state;
            } else if (filters.radius < 100) {
              // Medium radius: filter by state only
              serverFilters.state = userLocation.state;
            }
            // Large radius (>= 100): no location filter (nationwide)
          }

          // Load from Supabase with server-side filtering
          const offset = refresh ? 0 : currentState.reviews.length;
          const newReviews = await supabaseReviews.getReviews(20, offset, serverFilters);

          // If no reviews found and this is a refresh, show mock data
          if (refresh && newReviews.length === 0) {
            set({
              reviews: mockReviews,
              hasMore: false,
              lastVisible: null,
              isLoading: false,
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
          // Fallback to mock data if Supabase fails
          console.warn("Supabase failed, using mock data:", error);
          if (refresh || get().reviews.length === 0) {
            set({
              reviews: mockReviews,
              hasMore: false,
              lastVisible: null,
              isLoading: false,
            });
          } else {
            set({
              error: error instanceof Error ? error.message : "Failed to load reviews",
              isLoading: false,
            });
          }
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
