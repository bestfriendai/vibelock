// Unified authentication utilities to ensure consistent auth state across the app
import { supabase } from "../config/supabase";
import { supabaseAuth } from "../services/supabase";
import useAuthStore from "../state/authStore";
import { User } from "../types";
import { AppError, ErrorType, parseSupabaseError } from './errorHandling';

/**
 * Unified authentication checker that ensures consistency across the app
 * This should be the ONLY way to check authentication in services and async functions
 */
export const getAuthenticatedUser = async (): Promise<{ user: User | null; supabaseUser: any | null }> => {
  try {
    // Get both store state and Supabase state
    const storeState = useAuthStore.getState();
    const supabaseUser = await supabaseAuth.getCurrentUser();

    // If store says authenticated but Supabase doesn't, DON'T auto-clear
    // This could be a temporary network issue or session refresh timing
    if (storeState.isAuthenticated && storeState.user && !supabaseUser) {
      console.warn("🔄 Auth state mismatch: Store authenticated but Supabase not. Allowing store state to take precedence.");
      // Return store state - let the auth listener handle any real logout
      return { user: storeState.user, supabaseUser: null };
    }

    // If Supabase says authenticated but store doesn't, prefer Supabase
    if (!storeState.isAuthenticated && supabaseUser) {
      console.warn("🔄 Auth state mismatch: Supabase authenticated but store not. Allowing Supabase state.");
      // Return Supabase state - the auth listener should sync this soon
      return { user: null, supabaseUser };
    }

    // Both agree on authentication state
    const isFullyAuthenticated = storeState.isAuthenticated && storeState.user && supabaseUser;

    return {
      user: isFullyAuthenticated ? storeState.user : null,
      supabaseUser: isFullyAuthenticated ? supabaseUser : null
    };
  } catch (error) {
    console.error("Error checking authentication:", error);
    const appError = error instanceof AppError ? error : parseSupabaseError(error);
    // Don't throw here as this is used for checking auth state
    return { user: null, supabaseUser: null };
  }
};

/**
 * Quick synchronous check for authentication (for UI components)
 * Use this in React components that need immediate auth state
 */
export const useAuthState = () => {
  const { user, isAuthenticated, isGuestMode, isLoading } = useAuthStore();

  // Debug logging - add null safety
  if (__DEV__ && typeof __DEV__ !== 'undefined') {
    console.log("🔍 useAuthState:", {
      hasUser: !!user,
      isAuthenticated,
      isGuestMode,
      isLoading,
      userId: user?.id?.slice(-4) || 'undefined'
    });
  }

  return {
    user,
    isAuthenticated: isAuthenticated && !!user, // Ensure both flags are true
    isGuestMode,
    isLoading,
    // Helper flags
    canComment: isAuthenticated && !!user && !isGuestMode,
    canCreateReview: isAuthenticated && !!user && !isGuestMode,
    canAccessChat: isAuthenticated && !!user && !isGuestMode,
    needsSignIn: !isAuthenticated || !user || isGuestMode
  };
};

/**
 * Async authentication check with error handling
 * Use this in services and async operations
 */
export const requireAuthentication = async (action: string = "perform this action"): Promise<{ user: User; supabaseUser: any }> => {
  const { user, supabaseUser } = await getAuthenticatedUser();

  // Be more lenient - if we have either a user OR supabaseUser, allow the action
  // The auth listener will eventually sync the states
  if (!user && !supabaseUser) {
    throw new AppError(
      `Must be signed in to ${action}`,
      ErrorType.AUTH,
      'AUTHENTICATION_REQUIRED',
      401,
      false
    );
  }

  // If we have store user but no supabase user, try to get supabase user again
  if (user && !supabaseUser) {
    const freshSupabaseUser = await supabaseAuth.getCurrentUser();
    return { user, supabaseUser: freshSupabaseUser || null };
  }

  // If we have supabase user but no store user, use supabase user
  if (!user && supabaseUser) {
    // Create a minimal user object from supabase user
    const minimalUser: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      anonymousId: supabaseUser.email?.split('@')[0] || `User ${supabaseUser.id.slice(-4)}`,
      location: { city: 'Unknown', state: 'Unknown' },
      genderPreference: 'all',
      createdAt: new Date(supabaseUser.created_at || Date.now())
    };
    return { user: minimalUser, supabaseUser };
  }

  return { user: user!, supabaseUser: supabaseUser! };
};

/**
 * Check if user can perform a specific action
 */
export const canPerformAction = (action: 'comment' | 'create_review' | 'access_chat' | 'report'): boolean => {
  const { isAuthenticated, user, isGuestMode } = useAuthStore.getState();
  
  // All actions require authentication and not being in guest mode
  const baseRequirement = isAuthenticated && !!user && !isGuestMode;
  
  switch (action) {
    case 'comment':
    case 'create_review':
    case 'access_chat':
    case 'report':
      return baseRequirement;
    default:
      return false;
  }
};

/**
 * Get user display name consistently
 */
export const getUserDisplayName = (user?: User | null): string => {
  if (!user) return "Anonymous";
  return user.anonymousId || user.email?.split('@')[0] || `User ${user.id?.slice(-4) || 'Unknown'}`;
};

/**
 * Refresh the current session if it's expired
 */
export const refreshSessionIfNeeded = async (): Promise<boolean> => {
  try {
    const session = await supabaseAuth.getCurrentSession();

    if (!session) {
      return false;
    }

    // Check if session is close to expiring (within 5 minutes)
    const expiresAt = session.expires_at;
    if (!expiresAt) return true;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log("🔄 Session expiring soon, refreshing...");
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Failed to refresh session:", error);
        return false;
      }

      console.log("✅ Session refreshed successfully");
      return true;
    }

    return true;
  } catch (error) {
    console.error("Error refreshing session:", error);
    return false;
  }
};

/**
 * Sync auth state between store and Supabase (for debugging)
 */
export const syncAuthState = async (): Promise<void> => {
  try {
    const storeState = useAuthStore.getState();
    const supabaseUser = await supabaseAuth.getCurrentUser();

    console.log("🔄 Syncing auth state:");
    console.log("  Store authenticated:", storeState.isAuthenticated);
    console.log("  Store user:", !!storeState.user);
    console.log("  Supabase user:", !!supabaseUser);

    // If there's a mismatch, try to refresh session first
    if (storeState.isAuthenticated !== !!supabaseUser) {
      console.warn("⚠️ Auth state mismatch detected. Attempting session refresh...");
      await refreshSessionIfNeeded();
    }
  } catch (error) {
    console.error("Error syncing auth state:", error);
    const appError = error instanceof AppError ? error : parseSupabaseError(error);
    // Don't throw as this is a utility function
  }
};

/**
 * Sanitize email input from TextInput to avoid hidden characters
 */
export const sanitizeEmail = (raw: string): string => {
  if (!raw) return "";
  // Remove zero-width and BOM chars, collapse whitespace, lowercase, and trim
  return raw
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
};
