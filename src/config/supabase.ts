// Enhanced Supabase configuration for optimal real-time performance
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Supabase configuration is missing. Please check your .env file and rebuild the app.";
  console.error(`🚨 CRITICAL ERROR: ${errorMessage}`);
  console.error(`URL: ${supabaseUrl ? "Present" : "Missing"}`);
  console.error(`Anon Key: ${supabaseAnonKey ? "Present" : "Missing"}`);
  throw new Error(errorMessage);
}

if (__DEV__) {
  console.log("[Supabase Config] URL:", supabaseUrl);
  console.log("[Supabase Config] Anon Key:", supabaseAnonKey?.substring(0, 20) + "...");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    debug: __DEV__,
  },
  // Optimized real-time configuration for chat
  realtime: {
    // Faster heartbeat for better connection reliability
    heartbeatIntervalMs: 15000,
    // Exponential backoff for reconnection
    reconnectAfterMs: (tries: number) => Math.min(tries * 500, 5000),
    // Enable logging in development
    logger: __DEV__ ? console.log : undefined,
    // Optimize for chat workloads
    params: {
      eventsPerSecond: 100, // Higher rate for active chats
    },
  },
  global: {
    headers: {
      "X-App-Client-Info": "lockerroom-chat-v2",
      "X-App-Client-Version": "2.0.0",
    },
  },
});

// Export enhanced types
export type { User, Session, AuthError, PostgrestError } from "@supabase/supabase-js";
export type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";

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
