// Enhanced Supabase configuration for optimal real-time performance and production scalability
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Production-specific configuration
interface ProductionConfig {
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  rateLimitPerSecond: number;
  enableMetrics: boolean;
  enableHealthChecks: boolean;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Supabase configuration is missing. Please check your .env file and rebuild the app.";
  console.warn(`🚨 CRITICAL ERROR: ${errorMessage}`);
  console.warn(`URL: ${supabaseUrl ? "Present" : "Missing"}`);
  console.warn(`Anon Key: ${supabaseAnonKey ? "Present" : "Missing"}`);
  throw new Error(errorMessage);
}

// Production configuration based on environment
const getProductionConfig = (): ProductionConfig => {
  const isProduction = !__DEV__;

  return {
    maxConnections: isProduction ? 50 : 10, // Higher limits for production
    connectionTimeout: isProduction ? 30000 : 10000, // 30s for production, 10s for dev
    retryAttempts: isProduction ? 5 : 3,
    rateLimitPerSecond: isProduction ? 200 : 100, // Higher rate limits for production
    enableMetrics: isProduction,
    enableHealthChecks: isProduction,
  };
};

const productionConfig = getProductionConfig();

if (__DEV__) {
  console.log("[Supabase Config] URL:", supabaseUrl);
  console.log("[Supabase Config] Anon Key:", supabaseAnonKey?.substring(0, 20) + "...");
  console.log("[Supabase Config] Production Config:", productionConfig);
}

// Connection pool and metrics tracking
let connectionCount = 0;
const connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0,
  averageLatency: 0,
  lastError: null as string | null,
  lastHealthCheck: 0,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    debug: __DEV__,
  },
  // Production-optimized real-time configuration
  realtime: {
    // Production-tuned heartbeat for better connection reliability
    heartbeatIntervalMs: productionConfig.enableHealthChecks ? 15000 : 30000,
    // Enhanced exponential backoff with jitter for production
    reconnectAfterMs: (tries: number) => {
      const baseDelay = Math.min(tries * 1000, 10000); // Max 10s delay
      const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
      return baseDelay + jitter;
    },
    // Conditional logging based on environment
    logger: __DEV__ ? console.log : undefined,
    // Production-optimized parameters
    params: {
      eventsPerSecond: productionConfig.rateLimitPerSecond,
    },
  },
  global: {
    headers: {
      "X-App-Client-Info": "lockerroom-chat-v2",
      "X-App-Client-Version": "2.0.0",
      "X-App-Environment": __DEV__ ? "development" : "production",
      "X-App-Max-Connections": productionConfig.maxConnections.toString(),
    },
  },
});

// Export enhanced types
export type { User, Session, AuthError, PostgrestError } from "@supabase/supabase-js";
export type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  console.warn("Supabase error:", error);

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
    if (message.includes("user already registered") ||
        message.includes("email address already registered") ||
        message.includes("user with this email already exists") ||
        message.includes("email already in use")) {
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

    // Storage/RLS errors
    if (message.includes("row-level security policy") || message.includes("rls policy")) {
      return "Permission denied. Please make sure you're signed in and try again.";
    }
    if (message.includes("storage") && message.includes("policy")) {
      return "Storage permission error. Please contact support if this persists.";
    }
    if (message.includes("bucket") && message.includes("not found")) {
      return "Storage configuration error. Please try again later.";
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

// Production monitoring and health check utilities
export const getConnectionMetrics = () => ({
  ...connectionMetrics,
  currentConnections: connectionCount,
  healthScore: calculateHealthScore(),
});

export const performHealthCheck = async (): Promise<boolean> => {
  try {
    const startTime = Date.now();

    // Simple health check - try to get the current user
    const { error } = await supabase.auth.getUser();

    const latency = Date.now() - startTime;
    connectionMetrics.averageLatency = (connectionMetrics.averageLatency + latency) / 2;
    connectionMetrics.lastHealthCheck = Date.now();

    if (error && error.message !== "Auth session missing!") {
      connectionMetrics.lastError = error.message;
      return false;
    }

    return true;
  } catch (error: any) {
    connectionMetrics.lastError = error?.message || "Health check failed";
    return false;
  }
};

export const resetConnectionMetrics = (): void => {
  connectionMetrics.totalConnections = 0;
  connectionMetrics.activeConnections = 0;
  connectionMetrics.failedConnections = 0;
  connectionMetrics.averageLatency = 0;
  connectionMetrics.lastError = null;
  connectionMetrics.lastHealthCheck = 0;
  connectionCount = 0;
};

// Calculate health score based on metrics
const calculateHealthScore = (): number => {
  const totalAttempts = connectionMetrics.totalConnections;
  if (totalAttempts === 0) return 100;

  const successRate = ((totalAttempts - connectionMetrics.failedConnections) / totalAttempts) * 100;
  const latencyScore =
    connectionMetrics.averageLatency < 1000 ? 100 : Math.max(0, 100 - connectionMetrics.averageLatency / 100);

  return Math.round((successRate + latencyScore) / 2);
};

// Production connection management
export const trackConnection = (type: "open" | "close" | "error", error?: any): void => {
  if (!productionConfig.enableMetrics) return;

  switch (type) {
    case "open":
      connectionCount++;
      connectionMetrics.totalConnections++;
      connectionMetrics.activeConnections++;
      console.log(`[Supabase] Connection opened. Active: ${connectionMetrics.activeConnections}`);
      break;

    case "close":
      connectionCount = Math.max(0, connectionCount - 1);
      connectionMetrics.activeConnections = Math.max(0, connectionMetrics.activeConnections - 1);
      console.log(`[Supabase] Connection closed. Active: ${connectionMetrics.activeConnections}`);
      break;

    case "error":
      connectionMetrics.failedConnections++;
      connectionMetrics.lastError = error?.message || "Unknown error";
      console.warn(`[Supabase] Connection error:`, error);
      break;
  }
};

// Rate limiting utility
export const checkRateLimit = (): boolean => {
  // Simple rate limiting - in production, you'd want more sophisticated tracking
  return connectionMetrics.activeConnections < productionConfig.maxConnections;
};

export default supabase;
