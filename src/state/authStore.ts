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
        // Add protection against accidental logout
        if (!user && useAuthStore.getState().isAuthenticated) {
          console.warn("⚠️ Attempting to clear authenticated user. This might be unintentional.");
          console.trace("setUser(null) call stack:");
        }

        set((state) => ({
          ...state,
          user,
          isAuthenticated: !!user,
          error: null,
        }));

        if (__DEV__) {
          console.log("🔄 Auth state updated:", {
            hasUser: !!user,
            isAuthenticated: !!user,
            userId: user?.id?.slice(-4)
          });
        }
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
          isAuthenticated: false, // Guest mode should not set isAuthenticated to true
          user: null,
        }));
      },

      login: async (email, password) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));

          // Validate inputs
          if (!email?.trim()) {
            throw new Error("Email is required");
          }
          if (!password?.trim()) {
            throw new Error("Password is required");
          }

          // Sanitize email for safety (remove hidden chars, lowercase)
          const { sanitizeEmail } = await import("../utils/authUtils");
          const safeEmail = sanitizeEmail(email);

          // Sign in with Supabase
          const supabaseUser = await supabaseAuth.signIn(safeEmail, password);

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
          console.error("Login error:", error);

          // Extract user-friendly error message
          let errorMessage = "Failed to sign in. Please try again.";
          if (error instanceof Error && error.message) {
            errorMessage = error.message;
          }

          set((state) => ({
            ...state,
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          }));
        }
      },

      register: async (email, password, location, opts) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));

          // Validate inputs
          if (!email?.trim()) {
            throw new Error("Email is required");
          }
          if (!password?.trim()) {
            throw new Error("Password is required");
          }
          if (password.length < 6) {
            throw new Error("Password must be at least 6 characters long");
          }

          // Sanitize email for safety (remove hidden chars, lowercase)
          const { sanitizeEmail } = await import("../utils/authUtils");
          const safeEmail = sanitizeEmail(email);

          // Create Supabase user
          const supabaseUser = await supabaseAuth.signUp(safeEmail, password);

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
          console.error("Registration error:", error);

          // Extract user-friendly error message
          let errorMessage = "Failed to create account. Please try again.";
          if (error instanceof Error && error.message) {
            errorMessage = error.message;
          }

          set((state) => ({
            ...state,
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
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
        let isInitializing = false;
        let authSubscription: any = null;

        // First, check if we have a current session on app start
        const initializeSession = async () => {
          if (isInitializing) return;
          isInitializing = true;

          try {
            set((state) => ({ ...state, isLoading: true, error: null }));

            // Session initialization re-enabled after fixing API key issue

            // Get current session with retry logic
            let session = null;
            let retries = 3;

            while (retries > 0 && !session) {
              try {
                session = await supabaseAuth.getCurrentSession();
                break;
              } catch (error) {
                console.warn(`Session fetch attempt ${4 - retries} failed:`, error);
                retries--;
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }

            if (session?.user) {
              // Get user profile with retry logic
              let userProfile = null;
              retries = 3;

              while (retries > 0 && !userProfile) {
                try {
                  userProfile = await supabaseUsers.getUserProfile(session.user.id);
                  break;
                } catch (error) {
                  console.warn(`Profile fetch attempt ${4 - retries} failed:`, error);
                  retries--;
                  if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              }

              if (userProfile) {
                set((state) => ({
                  ...state,
                  user: userProfile,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                }));
              } else {
                console.warn("User profile not found, clearing session");
                set((state) => ({
                  ...state,
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: "Failed to load user profile",
                }));
              }
            } else {
              // No session, clear any persisted auth state
              set((state) => ({
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              }));
            }
          } catch (error) {
            console.error("Error initializing session:", error);
            set((state) => ({
              ...state,
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: "Failed to initialize authentication",
            }));
          } finally {
            isInitializing = false;
          }
        };

        // Initialize session immediately
        initializeSession();

        // Set up the auth state change listener with debouncing
        let authChangeTimeout: NodeJS.Timeout | null = null;

        const { data: { subscription } } = supabaseAuth.onAuthStateChanged(async (supabaseUser) => {
          // Debounce auth state changes to prevent rapid updates
          if (authChangeTimeout) {
            clearTimeout(authChangeTimeout);
          }

          authChangeTimeout = setTimeout(async () => {
            if (supabaseUser && !isInitializing) {
              try {
                // Get user profile from Supabase
                const userProfile = await supabaseUsers.getUserProfile(supabaseUser.id);
                if (userProfile) {
                  set((state) => ({
                    ...state,
                    user: userProfile,
                    isAuthenticated: true,
                    isGuestMode: false, // Clear guest mode when authenticated
                    isLoading: false,
                    error: null,
                  }));
                  console.log("✅ Auth state synchronized: User authenticated");
                } else {
                  console.warn("User profile not found in auth state change");
                  set((state) => ({
                    ...state,
                    error: "User profile not found",
                    isLoading: false,
                  }));
                }
              } catch (error) {
                console.error("Error loading user profile in auth state change:", error);
                set((state) => ({
                  ...state,
                  error: "Failed to load user profile",
                  isLoading: false,
                }));
              }
            } else if (!supabaseUser) {
              set((state) => ({
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              }));
              console.log("✅ Auth state synchronized: User signed out");
            }
          }, 100); // 100ms debounce
        });

        authSubscription = subscription;

        // Return unsubscribe function
        return () => {
          if (authChangeTimeout) {
            clearTimeout(authChangeTimeout);
          }
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
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
