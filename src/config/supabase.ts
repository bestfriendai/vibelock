// Supabase configuration for LockerRoom MVP
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration");
  throw new Error(
    "Missing Supabase configuration: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required",
  );
}

// Optional debug logging in development only
if (__DEV__) {
  console.log("[Supabase Config] URL:", supabaseUrl);
  console.log("[Supabase Config] Anon Key:", supabaseAnonKey?.substring(0, 20) + "...");
}

// Create Supabase client with React Native specific configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for session persistence in React Native
    storage: AsyncStorage,
    // Auto refresh tokens
    autoRefreshToken: true,
    // Persist session across app restarts
    persistSession: true,
    // Detect session in URL (useful for magic links)
    detectSessionInUrl: false,
    // Use PKCE flow for better security
    flowType: 'pkce',
    // Reduce auth timeout to prevent hanging
    debug: __DEV__,
  },
  // Real-time configuration with better error handling
  realtime: {
    // Add heartbeat and reconnection settings
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
  },
  // Global configuration - custom headers only (do NOT override Authorization)
  // Note: Supabase JS sets `apikey` and user `Authorization` automatically.
  // Overriding `Authorization` with the anon key breaks authenticated calls.
  global: {
    headers: {
      "X-App-Client-Info": "lockerroom-mobile-app",
      "X-App-Client-Version": "1.0.0",
    },
  },
});

// Export types for TypeScript support
export type { User } from "@supabase/supabase-js";
export type { Session } from "@supabase/supabase-js";
export type { AuthError } from "@supabase/supabase-js";
export type { PostgrestError } from "@supabase/supabase-js";

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  console.error("Supabase error:", error);

  // Handle network/timeout errors
  if (error?.name === "AbortError" || error?.message?.includes("timeout")) {
    return "Connection timeout. Please check your internet connection and try again.";
  }

  // Handle specific HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "Invalid email or password.";
      case 403:
        return "Access denied. Please check your credentials.";
      case 404:
        return "Service not found. Please try again later.";
      case 422:
        return "Invalid data provided. Please check your input.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Please try again later.";
      case 502:
      case 503:
      case 504:
        return "Service temporarily unavailable. Please try again in a few moments.";
      default:
        return `Network error (${error.status}). Please try again.`;
    }
  }

  // Handle specific Supabase auth errors
  if (error?.message) {
    const message = error.message.toLowerCase();

    // Email validation errors
    if (message.includes("email address") && message.includes("invalid")) {
      return "Email not valid, try a different email";
    }
    if (message.includes("invalid email address")) {
      return "Email not valid, try a different email";
    }
    if (message.includes("invalid email")) {
      return "Email not valid, try a different email";
    }

    // Authentication errors
    if (message.includes("invalid login credentials")) {
      return "Email/Password is incorrect";
    }
    if (message.includes("email not confirmed")) {
      return "Please check your email and click the confirmation link before signing in";
    }

    // Registration errors
    if (message.includes("user already registered")) {
      return "An account with this email already exists. Please sign in instead";
    }
    if (message.includes("user not found")) {
      return "No account found with this email. Please sign up first";
    }

    // Password errors
    if (message.includes("password should be at least")) {
      return "Password must be at least 6 characters long";
    }
    if (message.includes("password is too weak")) {
      return "Password is too weak. Please choose a stronger password";
    }

    // Network errors
    if (message.includes("network")) {
      return "Network error. Please check your internet connection and try again";
    }
    if (message.includes("timeout")) {
      return "Request timed out. Please check your connection and try again";
    }

    // Rate limiting
    if (message.includes("too many requests")) {
      return "Too many attempts. Please wait a moment and try again";
    }

    // Server errors
    if (message.includes("internal server error")) {
      return "Server error. Please try again in a moment";
    }

    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
};

// Helper function to check if user is authenticated (async version)
export const isAuthenticatedAsync = async (): Promise<boolean> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
};

// Note: Removed synchronous isAuthenticated() as getSession() is async
// Use isAuthenticatedAsync() or check authStore.user instead

export default supabase;
