import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { User } from "../types";
import { supabaseAuth, supabaseUsers } from "../services/supabase";
import { AppError, ErrorType, parseSupabaseError } from "../utils/errorHandling";

// Cleanup tracker for auth listeners
let authCleanupTracker: {
  cleanupFunctions: Set<() => void>;
  isCleaningUp: boolean;
  addCleanup: (fn: () => void) => void;
  executeCleanup: () => void;
} = {
  cleanupFunctions: new Set(),
  isCleaningUp: false,
  addCleanup(fn: () => void) {
    this.cleanupFunctions.add(fn);
    if (__DEV__) {
      console.log(`🧹 Added auth cleanup function. Total: ${this.cleanupFunctions.size}`);
    }
  },
  executeCleanup() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    if (__DEV__) {
      console.log(`🧹 Executing ${this.cleanupFunctions.size} auth cleanup functions`);
    }

    this.cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn("Auth cleanup function failed:", error);
      }
    });

    this.cleanupFunctions.clear();
    this.isCleaningUp = false;
  },
};

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
    type?: "city" | "college";
    fullName?: string;
    institutionType?: string;
  }) => Promise<void>;
  initializeAuthListener: () => () => void;
  // Memory leak prevention
  executeCleanup: () => void;
}

// Sanitize user data for persistence - remove sensitive information
const sanitizeUserForPersistence = (user: User | null): User | null => {
  if (!user) return null;

  return {
    ...user,
    // Remove or hash sensitive data (keep type as string)
    email: user.email ? `${user.email.substring(0, 3)}***@${user.email.split("@")[1]}` : user.email,
    // Reduce precision of coordinates for privacy
    location: user.location
      ? {
          ...user.location,
          coordinates: user.location.coordinates
            ? {
                latitude: Math.round(user.location.coordinates.latitude * 100) / 100, // 2 decimal places
                longitude: Math.round(user.location.coordinates.longitude * 100) / 100,
              }
            : undefined,
        }
      : user.location,
  };
};

type AuthStore = AuthState & AuthActions;

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
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
            userId: user?.id?.slice(-4),
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
            throw new AppError("Email is required", ErrorType.VALIDATION, "EMAIL_REQUIRED");
          }
          if (!password?.trim()) {
            throw new AppError("Password is required", ErrorType.VALIDATION, "PASSWORD_REQUIRED");
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
              anonymousId: uuidv4(),
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
          console.warn("Login error:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          // Show specific error dialog
          Alert.alert("Sign In Failed", appError.userMessage, [{ text: "OK", style: "default" }]);

          set((state) => ({
            ...state,
            error: null, // Don't set error state since we're showing dialog
            isLoading: false,
            isAuthenticated: false,
            user: null,
          }));
        }
      },

      register: async (email, password, location, opts) => {
        try {
          set((state) => ({ ...state, isLoading: true, error: null }));

          // Validate inputs with AppError
          if (!email?.trim()) {
            throw new AppError("Email is required", ErrorType.VALIDATION, "EMAIL_REQUIRED");
          }
          if (!password?.trim()) {
            throw new AppError("Password is required", ErrorType.VALIDATION, "PASSWORD_REQUIRED");
          }
          if (password.length < 6) {
            throw new AppError(
              "Password must be at least 6 characters long",
              ErrorType.VALIDATION,
              "PASSWORD_TOO_SHORT",
            );
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
            anonymousId: uuidv4(),
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
          console.warn("Registration error:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          // Show specific error dialog
          Alert.alert("Registration Failed", appError.userMessage, [{ text: "OK", style: "default" }]);

          set((state) => ({
            ...state,
            error: null, // Don't set error state since we're showing dialog
            isLoading: false,
            isAuthenticated: false,
            user: null,
          }));
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          // Execute cleanup before logout
          authCleanupTracker.executeCleanup();

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
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
          });
        }
      },

      executeCleanup: () => {
        authCleanupTracker.executeCleanup();
      },

      updateUserLocation: async (location) => {
        // Get current state
        const currentState = get();
        if (!currentState.user) return;

        // Update local state immediately for responsive UI
        set((state) => ({
          ...state,
          user: state.user
            ? {
                ...state.user,
                location: {
                  city: location.city,
                  state: location.state,
                  coordinates: location.coordinates,
                  type: location.type,
                  fullName: location.fullName,
                  institutionType: location.institutionType,
                },
              }
            : null,
        }));

        // Persist to database
        try {
          const { supabaseUsers } = await import("../services/supabase");
          await supabaseUsers.updateUserProfile(currentState.user.id, {
            location: {
              city: location.city,
              state: location.state,
              coordinates: location.coordinates,
              type: location.type,
              fullName: location.fullName,
              institutionType: location.institutionType,
            },
          });
          console.log("✅ Location saved to database successfully");
        } catch (error) {
          console.warn("❌ Failed to update user location in database:", error);
          // Could show a toast notification here if needed
        }
      },

      initializeAuthListener: () => {
        let isInitializing = false;
        let authSubscription: any = null;
        let authChangeTimeout: NodeJS.Timeout | null = null;
        let isProcessingAuthChange = false;

        // First, check if we have a current session on app start
        const initializeSession = async () => {
          if (isInitializing) {
            console.log("🔄 Session initialization already in progress");
            return;
          }
          isInitializing = true;

          try {
            console.log("🚀 Initializing auth session");
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
                  await new Promise((resolve) => setTimeout(resolve, 1000));
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
                    await new Promise((resolve) => setTimeout(resolve, 1000));
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
            console.warn("Error initializing session:", error);
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set((state) => ({
              ...state,
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: appError.userMessage,
            }));
          } finally {
            isInitializing = false;
            console.log("✅ Session initialization complete");
          }
        };

        // Initialize session immediately
        initializeSession();

        // Set up the auth state change listener with proper synchronization
        const {
          data: { subscription },
        } = supabaseAuth.onAuthStateChanged(async (supabaseUser) => {
          // Prevent concurrent auth state processing
          if (isProcessingAuthChange || isInitializing) {
            console.log("🔄 Auth change ignored - already processing");
            return;
          }

          // Debounce auth state changes to prevent rapid updates
          if (authChangeTimeout) {
            clearTimeout(authChangeTimeout);
          }

          authChangeTimeout = setTimeout(async () => {
            if (isProcessingAuthChange || isInitializing) {
              return;
            }

            isProcessingAuthChange = true;
            try {
              if (supabaseUser) {
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
                  const appError = new AppError(
                    "User profile not found",
                    ErrorType.AUTH,
                    "PROFILE_NOT_FOUND",
                    undefined,
                    false,
                  );
                  set((state) => ({
                    ...state,
                    user: null,
                    isAuthenticated: false,
                    error: appError.userMessage,
                    isLoading: false,
                  }));
                }
              } else {
                // User signed out
                set((state) => ({
                  ...state,
                  user: null,
                  isAuthenticated: false,
                  isGuestMode: false,
                  isLoading: false,
                  error: null,
                }));
                console.log("✅ Auth state synchronized: User signed out");
              }
            } catch (error) {
              console.warn("Error in auth state change:", error);
              const appError = error instanceof AppError ? error : parseSupabaseError(error);
              set((state) => ({
                ...state,
                user: null,
                isAuthenticated: false,
                error: appError.userMessage,
                isLoading: false,
              }));
            } finally {
              isProcessingAuthChange = false;
            }
          }, 300); // 300ms debounce to prevent rapid state changes
        });

        authSubscription = subscription;

        // Return unsubscribe function with enhanced cleanup tracking
        const cleanup = () => {
          console.log("🧹 Cleaning up auth listener");
          if (authChangeTimeout) {
            clearTimeout(authChangeTimeout);
            authChangeTimeout = null;
          }
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }
          isProcessingAuthChange = false;
          isInitializing = false;

          if (__DEV__) {
            console.log("✅ Auth listener cleanup completed");
          }
        };

        // Register cleanup function with tracker
        authCleanupTracker.addCleanup(cleanup);

        return cleanup;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist sanitized user data, not loading states
      partialize: (state) => ({
        user: sanitizeUserForPersistence(state.user),
        isAuthenticated: state.isAuthenticated,
        isGuestMode: state.isGuestMode,
      }),
      // Add version for future migrations
      version: 1,
      // Graceful no-op migration to avoid LogBox error when version changes
      migrate: (persistedState: any, _version: number) => {
        try {
          const ps = persistedState || {};
          return {
            user: ps.user ?? null,
            isAuthenticated: !!ps.isAuthenticated,
            isGuestMode: !!ps.isGuestMode,
          };
        } catch {
          return { user: null, isAuthenticated: false, isGuestMode: false };
        }
      },
    },
  ),
);

export default useAuthStore;
