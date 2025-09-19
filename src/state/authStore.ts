import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../utils/mmkvStorage";
import { Alert } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { User } from "../types";
import { authService } from "../services/auth";
import { usersService } from "../services/users";
import { AppError, ErrorType, parseSupabaseError } from "../utils/errorHandling";
import { withRetry } from "../utils/retryLogic";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setTestUser: () => void; // Development helper
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
  resetPassword: (email: string) => Promise<void>;
  updateUserLocation: (location: {
    city: string;
    state: string;
    coordinates?: { latitude: number; longitude: number };
    type?: "city" | "college";
    fullName?: string;
    institutionType?: string;
  }) => Promise<void>;
  initializeAuthListener: () => () => void;
}

// Simplified sanitization
const sanitizeUserForPersistence = (user: User | null): User | null => {
  if (!user) return null;
  return {
    ...user,
    // Keep original email for functionality, add maskedEmail for display if needed
    maskedEmail: user.email ? `${user.email.substring(0, 3)}***@${user.email.split("@")[1]}` : undefined,
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

      // Development helper to create test user for chatroom debugging
      setTestUser: () => {
        if (__DEV__) {
          console.log("🧪 Setting test user for development");
          const testUser: User = {
            id: "test-user-dev",
            email: "test@example.com",
            username: "TestUser",
            firstName: "Test",
            lastName: "User",
            city: "Washington",
            state: "DC",
            genderPreference: "all",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            ...state,
            user: testUser,
            isAuthenticated: true,
            isGuestMode: false,
            error: null,
          }));
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

          // Sign in with auth service
          const { user: supabaseUser } = await authService.signIn(safeEmail, password);

          // Get user profile from users service
          let userProfile = await usersService.getProfile(supabaseUser.id);

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

            await usersService.createProfile({ ...basicProfile, id: supabaseUser.id } as any);
            userProfile = await usersService.getProfile(supabaseUser.id);
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

          // Create user with auth service
          const { user: supabaseUser } = await authService.signUp(safeEmail, password);

          // Create user profile in Supabase
          const userProfile: Partial<User> = {
            id: supabaseUser.id,
            email: supabaseUser.email || email,
            anonymousId: uuidv4(),
            city: location.city,
            state: location.state,
            latitude: location.coordinates?.latitude,
            longitude: location.coordinates?.longitude,
            locationFullName: `${location.city}, ${location.state}`,
            genderPreference: opts?.genderPreference || "all",
            gender: opts?.gender,
          };

          await usersService.createProfile({ ...userProfile, id: supabaseUser.id } as any);

          // Get the created profile
          const createdProfile = await usersService.getProfile(supabaseUser.id);

          set((state) => ({
            ...state,
            user: createdProfile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          console.error("Registration error details:", error);
          console.error("Error type:", typeof error);
          console.error("Error message:", error?.message);
          console.error("Error stack:", error?.stack);

          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          console.error("Parsed error:", {
            userMessage: appError.userMessage,
            type: appError.type,
            code: appError.code,
          });

          // Show specific error dialog with more details in development
          const errorMessage = __DEV__
            ? `${appError.userMessage}\n\nDev Info: ${error?.message || "Unknown error"}`
            : appError.userMessage;

          Alert.alert("Registration Failed", errorMessage, [{ text: "OK", style: "default" }]);

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

          // Sign out from auth service
          await authService.signOut();

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

      resetPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          await authService.resetPassword(email);
          set({ isLoading: false });
        } catch (error) {
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
          });
          throw appError; // Re-throw so the component can handle it
        }
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
          const { usersService } = await import("../services/users");
          await usersService.updateProfile(currentState.user.id, {
            city: location.city,
            state: location.state,
            latitude: location.coordinates?.latitude,
            longitude: location.coordinates?.longitude,
            locationFullName: location.fullName,
            locationName: location.fullName,
            locationType: location.type,
            institutionType: location.institutionType,
            locationUpdatedAt: new Date(),
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
                session = await authService.getSession();
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
                  userProfile = await usersService.getProfile(session.user.id);
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
        const subscription = authService.onAuthStateChange(async (session) => {
          const supabaseUser = session?.user;

          console.log("🔄 Auth state change triggered:", {
            hasSession: !!session,
            hasUser: !!supabaseUser,
            userId: supabaseUser?.id?.slice(-8) || 'none',
            email: supabaseUser?.email || 'none',
            isProcessing: isProcessingAuthChange,
            isInitializing
          });

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
                console.log("👤 Processing authenticated user:", supabaseUser.id?.slice(-8));

                // Get user profile from users service
                let userProfile = null;
                try {
                  userProfile = await usersService.getProfile(supabaseUser.id);
                  console.log("📋 Profile fetch result:", {
                    hasProfile: !!userProfile,
                    profileId: userProfile?.id?.slice(-8) || 'none',
                    email: userProfile?.email || 'none'
                  });
                } catch (profileError) {
                  console.error("❌ Profile fetch error:", profileError);
                }

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
                  console.warn("⚠️ User profile not found in auth state change - keeping current state");
                  // Don't clear auth state if profile fetch fails - this might be temporary
                  const currentState = get();
                  if (!currentState.isAuthenticated) {
                    console.log("🔄 No current auth state, setting error");
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
                  } else {
                    console.log("🔄 Keeping current authenticated state despite profile fetch failure");
                  }
                }
              } else {
                // User signed out
                console.log("👋 User signed out");
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
              console.error("❌ Error in auth state change:", error);
              const appError = error instanceof AppError ? error : parseSupabaseError(error);

              // Don't clear auth state on temporary errors
              const currentState = get();
              if (currentState.isAuthenticated && supabaseUser) {
                console.log("🔄 Keeping auth state despite error - might be temporary");
                set((state) => ({
                  ...state,
                  error: appError.userMessage,
                  isLoading: false,
                }));
              } else {
                set((state) => ({
                  ...state,
                  user: null,
                  isAuthenticated: false,
                  error: appError.userMessage,
                  isLoading: false,
                }));
              }
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

        return cleanup;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => mmkvStorage),
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
