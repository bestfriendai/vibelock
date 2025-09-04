import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Review, FilterOptions, GreenFlag, RedFlag } from "../types";

interface ReviewsState {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  filters: FilterOptions;
  hasMore: boolean;
  lastVisible: string | null;
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
    greenFlags: GreenFlag[];
    redFlags: RedFlag[];
    reviewText: string;
  }) => Promise<void>;
  likeReview: (id: string) => Promise<void>;
  clearError: () => void;
}

type ReviewsStore = ReviewsState & ReviewsActions;

// Mock data for development
const mockReviews: Review[] = [
  {
    id: "1",
    reviewerAnonymousId: "anon_123",
    reviewedPersonName: "Sarah",
    reviewedPersonLocation: { city: "Alexandria", state: "VA" },
    greenFlags: ["good_communicator", "respectful", "fun"],
    redFlags: [],
    reviewText: "Had a great time! Very respectful and easy to talk to. Would definitely recommend.",
    status: "approved",
    likeCount: 12,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "2",
    reviewerAnonymousId: "anon_456",
    reviewedPersonName: "Mike",
    reviewedPersonLocation: { city: "Arlington", state: "VA" },
    greenFlags: ["reliable", "honest"],
    redFlags: ["poor_communication"],
    reviewText: "Nice guy but communication could be better. Often took a while to respond to messages.",
    status: "approved",
    likeCount: 8,
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14")
  },
  {
    id: "3",
    reviewerAnonymousId: "anon_789",
    reviewedPersonName: "Jessica",
    reviewedPersonLocation: { city: "Washington", state: "DC" },
    greenFlags: ["fun", "kind", "good_listener"],
    redFlags: [],
    reviewText: "Amazing person! Really fun to be around and genuinely cares about others.",
    status: "approved",
    likeCount: 15,
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13")
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
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (refresh) {
            set({ 
              reviews: mockReviews,
              hasMore: true,
              lastVisible: null,
              isLoading: false 
            });
          } else {
            // Simulate pagination
            const currentReviews = get().reviews;
            const newReviews = mockReviews.filter(
              review => !currentReviews.find(r => r.id === review.id)
            );
            
            set({ 
              reviews: [...currentReviews, ...newReviews],
              hasMore: newReviews.length > 0,
              isLoading: false 
            });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to load reviews",
            isLoading: false 
          });
        }
      },

      createReview: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          // Basic validation
          if (!data.reviewedPersonName.trim() || !data.reviewText.trim()) {
            throw new Error("Name and review text are required");
          }

          // For now, auto-approve reviews (in production, integrate with moderation service)
          const newReview: Review = {
            id: `review_${Date.now()}`,
            reviewerAnonymousId: `anon_${Date.now()}`,
            ...data,
            status: "approved", // Changed from "pending" for demo purposes
            likeCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
            get().updateReview(id, { 
              likeCount: review.likeCount + 1 
            });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to like review"
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