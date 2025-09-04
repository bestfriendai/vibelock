import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Review, FilterOptions, GreenFlag, RedFlag, MediaItem, SocialMediaHandles, Sentiment } from "../types";
import { firebaseReviews, firebaseStorage } from "../services/firebase";

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
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "2",
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
    updatedAt: new Date("2024-01-14")
  },
  {
    id: "3",
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
    updatedAt: new Date("2024-01-13")
  },
  {
    id: "4",
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
    updatedAt: new Date("2024-01-12")
  },
  {
    id: "5",
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
    updatedAt: new Date("2024-01-11")
  },
  {
    id: "6",
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
    updatedAt: new Date("2024-01-10")
  },
  {
    id: "7",
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
    updatedAt: new Date("2024-01-09")
  },
  {
    id: "8",
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
    updatedAt: new Date("2024-01-08")
  }
];

const useReviewsStore = create<ReviewsStore>()(
  persist(
    (set, get) => ({
      // State
      reviews: [],
      isLoading: false,
      error: null,
      filters: {
        category: "all",
        radius: 50,
        sortBy: "recent"
      },
      hasMore: true,
      lastVisible: null,

      // Actions
      setReviews: (reviews) => {
        set({ reviews, error: null });
      },

      addReview: (review) => {
        set((state) => ({
          reviews: [review, ...state.reviews]
        }));
      },

      updateReview: (id, updates) => {
        set((state) => ({
          reviews: state.reviews.map(review =>
            review.id === id ? { ...review, ...updates } : review
          )
        }));
      },

      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter(review => review.id !== id)
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
          filters: { ...state.filters, ...newFilters }
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      loadReviews: async (refresh = false) => {
        try {
          set({ isLoading: true, error: null });
          
          const currentState = get();
          const lastDoc = refresh ? null : currentState.lastVisible;
          
          const { reviews: newReviews, lastDoc: newLastDoc } = await firebaseReviews.getReviews(20, lastDoc);
          
          // Apply category filtering based on store filters and user preference
          const { filters } = get();
          // Try to get user preference from auth store if available
          let userPrefCategory: string | undefined;
          try {
            // Importing dynamically to avoid circular deps at module load
            const authStore = require("./authStore").default.getState();
            userPrefCategory = authStore.user?.genderPreference;
          } catch (e) {
            userPrefCategory = undefined;
          }

          const applyCategoryFilter = (list: Review[]) => {
            const categoryToFilter = filters.category || userPrefCategory || "all";
            if (!categoryToFilter || categoryToFilter === "all") return list;
            return list.filter(r => (r.category || "all") === categoryToFilter);
          };

          const filteredNewReviews = applyCategoryFilter(newReviews);

          if (refresh) {
            set({ 
              reviews: filteredNewReviews,
              hasMore: filteredNewReviews.length === 20,
              lastVisible: newLastDoc,
              isLoading: false 
            });
          } else {
            const currentReviews = currentState.reviews;
            set({ 
              reviews: [...currentReviews, ...filteredNewReviews],
              hasMore: filteredNewReviews.length === 20,
              lastVisible: newLastDoc,
              isLoading: false 
            });
          }
        } catch (error) {
          // Fallback to mock data if Firebase fails
          console.warn("Firebase failed, using mock data:", error);
          if (refresh || get().reviews.length === 0) {
            set({ 
              reviews: mockReviews,
              hasMore: false,
              lastVisible: null,
              isLoading: false 
            });
          } else {
            set({ 
              error: error instanceof Error ? error.message : "Failed to load reviews",
              isLoading: false 
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
          const hasImage = Array.isArray(data.media) && data.media.some(m => m.type === "image");
          if (!hasImage) {
            throw new Error("Please add at least one photo to your review");
          }

          const firstImage = data.media.find(m => m.type === "image");

          // Upload media files to Firebase Storage if they are local files
          const uploadedMedia: MediaItem[] = [];
          for (const mediaItem of data.media) {
            if (mediaItem.uri.startsWith("file://") || mediaItem.uri.startsWith("content://")) {
              try {
                // Convert URI to blob for upload
                const response = await fetch(mediaItem.uri);
                const blob = await response.blob();
                
                // Create unique filename
                const filename = `reviews/${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const downloadURL = await firebaseStorage.uploadFile(filename, blob);
                
                uploadedMedia.push({
                  ...mediaItem,
                  uri: downloadURL
                });
              } catch (uploadError) {
                console.warn("Failed to upload media, using original URI:", uploadError);
                uploadedMedia.push(mediaItem);
              }
            } else {
              uploadedMedia.push(mediaItem);
            }
          }

          // Create review data for Firebase
          const reviewData: Omit<Review, "id" | "createdAt" | "updatedAt"> = {
            reviewerAnonymousId: `anon_${Date.now()}`,
            reviewedPersonName: data.reviewedPersonName,
            reviewedPersonLocation: data.reviewedPersonLocation,
            greenFlags: data.greenFlags || [],
            redFlags: data.redFlags || [],
            sentiment: data.sentiment,
            reviewText: data.reviewText,
            media: uploadedMedia,
            socialMedia: data.socialMedia,
            profilePhoto: firstImage ? firstImage.uri : `https://picsum.photos/400/${Math.floor(Math.random() * 200) + 500}?random=${Date.now()}`,
            status: "approved", // Auto-approve for now (moderation removed)
            category: data.category || "all",
            likeCount: 0
          };

          // Create review in Firebase
          const reviewId = await firebaseReviews.createReview(reviewData);
          
          // Create the full review object for local state
          const newReview: Review = {
            ...reviewData,
            id: reviewId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          get().addReview(newReview);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to create review",
            isLoading: false 
          });
        }
      },

      likeReview: async (id) => {
        try {
          const review = get().reviews.find(r => r.id === id);
          if (review) {
            const newLikeCount = review.likeCount + 1;
            
            // Update in Firebase
            await firebaseReviews.updateReview(id, { likeCount: newLikeCount });
            
            // Update local state
            get().updateReview(id, { likeCount: newLikeCount });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to like review"
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
            error: error instanceof Error ? error.message : "Failed to dislike review"
          });
        }
      }
    }),
    {
      name: "reviews-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist reviews and filters, not loading states
      partialize: (state) => ({ 
        reviews: state.reviews,
        filters: state.filters 
      }),
    }
  )
);

export default useReviewsStore;