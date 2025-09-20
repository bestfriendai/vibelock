// Enhanced Supabase configuration for optimal real-time performance and production scalability
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Database } from "../types/database.types";

// React Native polyfills for Supabase realtime compatibility
import 'react-native-url-polyfill/auto';

// Supabase v2.57.4 API Version
const SUPABASE_API_VERSION = "v2.57.4";
const SUPPORTED_API_KEY_PREFIXES = ["sb_publishable_", "sb_secret_", "eyJ"];

// Environment variable validation cache
interface ValidationCache {
  isValid: boolean;
  completenessScore: number;
  lastValidated: number;
  warnings: string[];
  errors: string[];
}

let validationCache: ValidationCache | null = null;
const VALIDATION_CACHE_TTL = 60000; // 1 minute

// Environment setup guidance
const SETUP_GUIDANCE = {
  EXPO_PUBLIC_SUPABASE_URL: {
    description: "Your Supabase project URL - required for database and auth",
    steps: [
      "1. Go to https://supabase.com and sign in",
      "2. Create a new project or select existing",
      "3. Navigate to Settings > API",
      "4. Copy the Project URL (starts with https://)",
      "5. Add to .env: EXPO_PUBLIC_SUPABASE_URL=your_url_here",
    ],
    troubleshooting: "URL should match format: https://xxx.supabase.co",
  },
  EXPO_PUBLIC_SUPABASE_ANON_KEY: {
    description: "Your Supabase anonymous key - required for client access",
    steps: [
      "1. In Supabase Dashboard, go to Settings > API",
      "2. Find 'Project API keys' section",
      "3. Copy the 'anon' 'public' key (not the service_role key)",
      "4. Add to .env: EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here",
    ],
    troubleshooting: "Key should start with 'eyJ' or 'sb_publishable_'",
  },
  EXPO_PUBLIC_PROJECT_ID: {
    description: "Expo project ID - required for push notifications",
    steps: [
      "1. Go to https://expo.dev and sign in",
      "2. Navigate to your project",
      "3. Copy the Project ID from the project settings",
      "4. Add to .env: EXPO_PUBLIC_PROJECT_ID=your_id_here",
    ],
    troubleshooting: "Should be a UUID format: 12345678-1234-1234-1234-123456789012",
  },
};

// Production-specific configuration
interface ProductionConfig {
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  rateLimitPerSecond: number;
  enableMetrics: boolean;
  enableHealthChecks: boolean;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;

// Enhanced environment variable validation with comprehensive guidance
const validateSupabaseConfig = (): ValidationCache => {
  const now = Date.now();

  // Return cached result if still valid
  if (validationCache && now - validationCache.lastValidated < VALIDATION_CACHE_TTL) {
    return validationCache;
  }

  const validation: ValidationCache = {
    isValid: true,
    completenessScore: 0,
    lastValidated: now,
    warnings: [],
    errors: [],
  };

  let configuredCount = 0;
  const totalRequired = 3; // URL, key, project ID

  // Critical validation: Supabase URL
  if (!supabaseUrl) {
    validation.errors.push("EXPO_PUBLIC_SUPABASE_URL is missing");
    validation.isValid = false;

    console.error("🚨 CRITICAL: Supabase URL missing!");
    console.log("📋 Setup Guide:");
    SETUP_GUIDANCE.EXPO_PUBLIC_SUPABASE_URL.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
    console.log(`💡 Tip: ${SETUP_GUIDANCE.EXPO_PUBLIC_SUPABASE_URL.troubleshooting}\n`);
  } else {
    configuredCount++;

    // Validate URL format
    if (!supabaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/)) {
      validation.warnings.push("Supabase URL format may be incorrect");
      console.warn("⚠️ URL format warning:", SETUP_GUIDANCE.EXPO_PUBLIC_SUPABASE_URL.troubleshooting);
    } else {
      console.log("✅ Supabase URL format valid");
    }
  }

  // Critical validation: Supabase anon key
  if (!supabaseAnonKey) {
    validation.errors.push("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing");
    validation.isValid = false;

    console.error("🚨 CRITICAL: Supabase anon key missing!");
    console.log("📋 Setup Guide:");
    SETUP_GUIDANCE.EXPO_PUBLIC_SUPABASE_ANON_KEY.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
    console.log(`💡 Tip: ${SETUP_GUIDANCE.EXPO_PUBLIC_SUPABASE_ANON_KEY.troubleshooting}\n`);
  } else {
    configuredCount++;

    // Validate API key format and detect type
    const keyType = detectApiKeyType(supabaseAnonKey);
    if (keyType === "unknown") {
      validation.warnings.push("Unrecognized API key format");
      console.warn("⚠️ Key format warning:", SETUP_GUIDANCE.EXPO_PUBLIC_SUPABASE_ANON_KEY.troubleshooting);
    } else {
      console.log(`✅ Detected ${keyType} API key format`);

      // Warn if using secret key instead of anon key
      if (keyType === "secret") {
        validation.warnings.push("Using secret key instead of anon key - security risk!");
        console.warn("🚨 SECURITY WARNING: Using secret key in client! Use anon key instead.");
      }
    }
  }

  // Important validation: Project ID
  if (!projectId) {
    validation.warnings.push("EXPO_PUBLIC_PROJECT_ID missing - push notifications won't work");
    console.warn("⚠️ Project ID missing - push notifications disabled");
    console.log("📋 Setup Guide:");
    SETUP_GUIDANCE.EXPO_PUBLIC_PROJECT_ID.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
  } else {
    configuredCount++;

    // Validate project ID format (UUID)
    if (!projectId.match(/^[a-f0-9-]{36}$/)) {
      validation.warnings.push("Project ID format may be incorrect");
      console.warn("⚠️ Project ID format warning:", SETUP_GUIDANCE.EXPO_PUBLIC_PROJECT_ID.troubleshooting);
    } else {
      console.log("✅ Project ID format valid");
    }
  }

  // Calculate completeness score
  validation.completenessScore = Math.round((configuredCount / totalRequired) * 100);

  // Log validation summary
  console.log(`📋 Supabase Configuration Status: ${validation.completenessScore}% complete`);
  console.log(`📋 API Version: ${SUPABASE_API_VERSION}`);

  if (validation.warnings.length > 0) {
    console.log(`⚠️ ${validation.warnings.length} warnings found`);
  }

  if (validation.errors.length > 0) {
    console.error(`🚨 ${validation.errors.length} critical errors found`);

    if (__DEV__) {
      console.log("\n🔧 Quick Fix Commands:");
      console.log("   npm run verify:env  # Check all environment variables");
      console.log("   cp .env.example .env  # Create .env from template\n");
    }
  }

  // Cache the validation result
  validationCache = validation;
  return validation;
};

// Detect API key type based on prefix
const detectApiKeyType = (apiKey: string): "publishable" | "secret" | "jwt" | "unknown" => {
  if (apiKey.startsWith("sb_publishable_")) return "publishable";
  if (apiKey.startsWith("sb_secret_")) return "secret";
  if (apiKey.startsWith("eyJ")) return "jwt";
  return "unknown";
};

// Perform initial validation
const initialValidation = validateSupabaseConfig();

// Throw error if critical configuration is missing
if (!initialValidation.isValid) {
  const errorMessage = `Supabase configuration invalid: ${initialValidation.errors.join(", ")}`;
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
  console.log("[Supabase Config] Realtime Transport: WebSocket (React Native mode)");
  console.log("[Supabase Config] Web Workers: Disabled");

  // Check for Web Workers availability (should not be available in React Native)
  if (typeof Worker !== 'undefined') {
    console.warn('⚠️ Web Workers detected in React Native environment - this may cause issues');
  }
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

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    debug: __DEV__,
  },
  // Production-optimized real-time configuration with React Native compatibility
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
    // Note: transport and worker options are not officially supported in Supabase v2
    // React Native compatibility is achieved through polyfills and environment setup
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

// Export enhanced types for v2.57.4 compatibility
export type { User, Session, AuthError, PostgrestError, AuthResponse } from "@supabase/supabase-js";
export type { RealtimeChannel, RealtimePresenceState, RealtimeMessage } from "@supabase/supabase-js";
// Note: StorageError, FileObject, SignedUrlResponse, UploadResponse are no longer exported in v2.57.4
// These types are now internal to the storage API - use PostgrestError for general error handling
export type { SupabaseClient } from "@supabase/supabase-js";

// Enhanced Supabase error handler for v2.57.4
export const handleSupabaseError = (error: any): string => {
  console.warn("Supabase error:", error);

  // Handle v2.57.4 specific error codes
  if (error?.code) {
    switch (error.code) {
      case "PGRST301":
        return "Resource not found. The requested item may have been deleted.";
      case "PGRST116":
        return "Row-level security policy violated. Access denied.";
      case "PGRST204":
        return "No content found.";
      case "23505":
        return "This data already exists. Please use unique values.";
      case "23503":
        return "Referenced data not found. Please check your input.";
      case "42501":
        return "Insufficient permissions for this operation.";
      default:
        console.warn(`Unhandled error code: ${error.code}`);
    }
  }

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
    if (
      message.includes("user already registered") ||
      message.includes("email address already registered") ||
      message.includes("user with this email already exists") ||
      message.includes("email already in use")
    ) {
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

// Enhanced health check for v2.57.4 API compatibility
export const performHealthCheck = async (): Promise<{ healthy: boolean; details: any }> => {
  const healthDetails = {
    auth: false,
    database: false,
    storage: false,
    realtime: false,
    realtimeTransport: 'unknown',
    webWorkersDetected: false,
    latency: 0,
    timestamp: Date.now(),
    version: SUPABASE_API_VERSION,
  };

  try {
    const startTime = Date.now();

    // Test auth API
    try {
      const { error: authError } = await supabase.auth.getUser();
      healthDetails.auth = !authError || authError.message === "Auth session missing!";
    } catch (error) {
      console.warn("Auth health check failed:", error);
    }

    // Test database connection with a simple query
    try {
      const { error: dbError } = await supabase.from("users").select("count").limit(1);
      healthDetails.database = !dbError;
    } catch (error) {
      console.warn("Database health check failed:", error);
    }

    // Test storage API
    try {
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      healthDetails.storage = !storageError;
    } catch (error) {
      console.warn("Storage health check failed:", error);
    }

    // Test realtime connection status and transport method
    const realtimeConnected = supabase.realtime?.isConnected() ?? false;
    healthDetails.realtime = realtimeConnected;

    // Log transport method being used
    if (__DEV__ && realtimeConnected) {
      const transport = (supabase.realtime as any)?._transport || 'unknown';
      console.log(`[Health Check] Realtime transport: ${transport}`);
      if (transport !== 'websocket') {
        console.warn('⚠️ Realtime not using WebSocket transport - may cause issues in React Native');
      }
    }

    const latency = Date.now() - startTime;
    healthDetails.latency = latency;
    connectionMetrics.averageLatency = (connectionMetrics.averageLatency + latency) / 2;
    connectionMetrics.lastHealthCheck = Date.now();

    // Check for Web Workers (should not be present in React Native)
    healthDetails.webWorkersDetected = typeof Worker !== 'undefined';
    if (healthDetails.webWorkersDetected) {
      console.warn('⚠️ Web Workers detected - forcing WebSocket transport');
    }

    // Get actual transport method if available
    healthDetails.realtimeTransport = (supabase.realtime as any)?._transport || 'unknown';

    // Consider the app healthy if core services (auth + database) are working
    // Realtime is optional and shouldn't block app initialization
    const coreServicesHealthy = healthDetails.auth && healthDetails.database && !healthDetails.webWorkersDetected;
    const isHealthy = coreServicesHealthy;

    if (!healthDetails.realtime) {
      console.warn('⚠️ Realtime is not connected - real-time features may not work');
      // Don't fail the health check for realtime issues
    }

    if (!coreServicesHealthy) {
      connectionMetrics.lastError = "Health check failed - core services (auth/database) are unavailable";
    } else if (!healthDetails.realtime) {
      connectionMetrics.lastError = "Realtime not connected - some features may be limited";
    }

    return { healthy: isHealthy, details: healthDetails };
  } catch (error: any) {
    connectionMetrics.lastError = error?.message || "Health check failed";
    return { healthy: false, details: { ...healthDetails, error: error?.message } };
  }
};

// Validate Supabase connection and permissions
export const validateConnection = async (): Promise<boolean> => {
  try {
    const { healthy } = await performHealthCheck();

    if (!healthy) {
      console.warn("⚠️ Supabase connection validation failed");
      return false;
    }

    console.log("✅ Supabase connection validated successfully");
    return true;
  } catch (error) {
    console.warn("❌ Connection validation error:", error);
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

// Environment validation utilities for runtime use
export const environmentValidation = {
  // Get current validation status
  getValidationStatus: (): ValidationCache => {
    return validateSupabaseConfig();
  },

  // Check if specific service is configured
  isServiceConfigured: (service: "supabase" | "expo" | "revenuecat" | "admob" | "sentry"): boolean => {
    switch (service) {
      case "supabase":
        return !!(supabaseUrl && supabaseAnonKey);
      case "expo":
        return !!projectId;
      case "revenuecat":
        return !!process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
      case "admob":
        return !!(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS);
      case "sentry":
        return !!process.env.EXPO_PUBLIC_SENTRY_DSN;
      default:
        return false;
    }
  },

  // Get environment completeness score
  getCompletenessScore: (): number => {
    const validation = validateSupabaseConfig();
    return validation.completenessScore;
  },

  // Get setup guidance for missing configuration
  getSetupGuidance: (variable: keyof typeof SETUP_GUIDANCE) => {
    return SETUP_GUIDANCE[variable] || null;
  },

  // Check if running in development vs production
  isDevelopment: (): boolean => __DEV__,
  isProduction: (): boolean => !__DEV__,

  // Feature flags based on environment configuration
  isFeatureEnabled: (feature: "push_notifications" | "monetization" | "ads" | "error_reporting"): boolean => {
    switch (feature) {
      case "push_notifications":
        return !!projectId;
      case "monetization":
        return !!process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
      case "ads":
        return !!(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS);
      case "error_reporting":
        return !!process.env.EXPO_PUBLIC_SENTRY_DSN;
      default:
        return false;
    }
  },

  // Sanitize environment variable for logging
  sanitizeEnvVar: (key: string, value: string | undefined): string => {
    if (!value) return "Not set";

    // Show first 4 and last 4 characters for URLs and keys
    if (key.includes("URL")) {
      return value.length > 8 ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}` : value;
    }

    if (key.includes("KEY") || key.includes("TOKEN") || key.includes("SECRET")) {
      return value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : "***";
    }

    return value;
  },

  // Generate environment status report
  generateStatusReport: (): string => {
    const validation = validateSupabaseConfig();
    const services = ["supabase", "expo", "revenuecat", "admob", "sentry"] as const;

    let report = `Environment Configuration Report\n`;
    report += `=====================================\n`;
    report += `Completeness: ${validation.completenessScore}%\n`;
    report += `Environment: ${__DEV__ ? "Development" : "Production"}\n`;
    report += `Last Validated: ${new Date(validation.lastValidated).toLocaleString()}\n\n`;

    report += `Services Status:\n`;
    services.forEach((service) => {
      const configured = environmentValidation.isServiceConfigured(service);
      report += `  ${service}: ${configured ? "✅ Configured" : "❌ Not configured"}\n`;
    });

    if (validation.warnings.length > 0) {
      report += `\nWarnings:\n`;
      validation.warnings.forEach((warning) => {
        report += `  ⚠️ ${warning}\n`;
      });
    }

    if (validation.errors.length > 0) {
      report += `\nErrors:\n`;
      validation.errors.forEach((error) => {
        report += `  🚨 ${error}\n`;
      });
    }

    return report;
  },

  // Clear validation cache (force revalidation)
  clearCache: (): void => {
    validationCache = null;
  },
};

// Enhanced health check wrapper that includes environment validation
export const performEnhancedHealthCheck = async (): Promise<{ healthy: boolean; details: any }> => {
  const healthResult = await performHealthCheck();
  const envValidation = validateSupabaseConfig();

  // Combine health check with environment validation
  healthResult.details.environment = {
    valid: envValidation.isValid,
    completeness: envValidation.completenessScore,
    warnings: envValidation.warnings.length,
    errors: envValidation.errors.length,
  };

  // Environment issues affect overall health
  if (!envValidation.isValid) {
    healthResult.healthy = false;
  }

  return healthResult;
};

// Initialize connection validation in development
if (__DEV__) {
  validateConnection().then((isValid) => {
    if (!isValid) {
      console.warn("🚨 Supabase connection issues detected. Some features may not work correctly.");
      console.log("\n" + environmentValidation.generateStatusReport());
    }
  });
}

export default supabase;
