import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import { supabaseAuth, supabaseUsers } from "../services/supabase";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setGuestMode: (isGuest: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    location: { city: string; state: string },
    opts?: { genderPreference?: "all" | "men" | "women" | "lgbtq+"; gender?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUserLocation: (location: {
    city: string;
    state: string;
    coordinates?: { latitude: number; longitude: number };
  }) => void;
  initializeAuthListener: () => () => void;
}

type AuthStore = AuthState & AuthActions;

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isGuestMode: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => {
        set((state) => ({
          ...state,
          user,
          isAuthenticated: !!user,
          error: null,
        }));
      },

      setLoading: (isLoading) => {
        set((state) => ({ ...state, isLoading }));
      },

      setError: (error) => {
        set((state) => ({ ...state, error, isLoading: false }));
      },

      clearError: () => {
        set((state) => ({ ...state, error: null }));
      },

      setGuestMode: (isGuest) => {
        set((state) => ({
          ...state,
          isGuestMode: isGuest,
          isAuthenticated: isGuest,
          user: null,
        }));
      },

      login: async (email, password) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));

          // Sign in with Supabase
          const supabaseUser = await supabaseAuth.signIn(email, password);

          // Get user profile from Supabase
          let userProfile = await supabaseUsers.getUserProfile(supabaseUser.id);

          // If no profile exists, create a basic one
          if (!userProfile) {
            const basicProfile: Partial<User> = {
              id: supabaseUser.id,
              email: supabaseUser.email || email,
              anonymousId: `anon_${Date.now()}`,
              location: {
                city: "Unknown",
                state: "Unknown",
              },
              genderPreference: "all",
            };

            await supabaseUsers.createUserProfile(supabaseUser.id, basicProfile);
            userProfile = await supabaseUsers.getUserProfile(supabaseUser.id);
          }

          set((state) => ({
            ...state,
            user: userProfile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false,
          }));
        }
      },

      register: async (email, password, location, opts) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));

          // Create Supabase user
          const supabaseUser = await supabaseAuth.signUp(email, password);

          // Create user profile in Supabase
          const userProfile: Partial<User> = {
            id: supabaseUser.id,
            email: supabaseUser.email || email,
            anonymousId: `anon_${Date.now()}`,
            location,
            genderPreference: opts?.genderPreference || "all",
            gender: opts?.gender,
          };

          await supabaseUsers.createUserProfile(supabaseUser.id, userProfile);

          // Get the created profile
          const createdProfile = await supabaseUsers.getUserProfile(supabaseUser.id);

          set((state) => ({
            ...state,
            user: createdProfile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false,
          }));
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          // Sign out from Supabase
          await supabaseAuth.signOut();

          set({
            user: null,
            isAuthenticated: false,
            isGuestMode: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Logout failed",
            isLoading: false,
          });
        }
      },

      updateUserLocation: (location) => {
        set((state) => ({
          ...state,
          user: state.user
            ? {
                ...state.user,
                location: {
                  ...location,
                  coordinates: location.coordinates,
                },
              }
            : null,
        }));
      },

      initializeAuthListener: () => {
        const {
          data: { subscription },
        } = supabaseAuth.onAuthStateChanged(async (supabaseUser) => {
          if (supabaseUser) {
            try {
              // Get user profile from Supabase
              const userProfile = await supabaseUsers.getUserProfile(supabaseUser.id);
              if (userProfile) {
                set((state) => ({
                  ...state,
                  user: userProfile,
                  isAuthenticated: true,
                  isLoading: false,
                }));
              }
            } catch (error) {
              console.error("Error loading user profile:", error);
              set((state) => ({
                ...state,
                error: "Failed to load user profile",
                isLoading: false,
              }));
            }
          } else {
            set((state) => ({
              ...state,
              user: null,
              isAuthenticated: false,
              isLoading: false,
            }));
          }
        });

        // Return unsubscribe function
        return () => {
          subscription.unsubscribe();
        };
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user data, not loading states
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuestMode: state.isGuestMode,
      }),
    },
  ),
);

export default useAuthStore;
