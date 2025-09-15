/**
 * Environment Validation Utilities
 *
 * Runtime utilities for checking and validating environment configuration
 * across the application. These utilities help components and services
 * gracefully handle missing or invalid configuration.
 */

import React from "react";

// Environment variable type definitions
export interface EnvironmentConfig {
  // Supabase Configuration
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;

  // Expo Configuration
  EXPO_PUBLIC_PROJECT_ID?: string;

  // RevenueCat Configuration
  EXPO_PUBLIC_REVENUECAT_API_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS?: string;

  // AdMob Configuration
  EXPO_PUBLIC_ADMOB_BANNER_ANDROID?: string;
  EXPO_PUBLIC_ADMOB_BANNER_IOS?: string;
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID?: string;
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS?: string;
  EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID?: string;
  EXPO_PUBLIC_ADMOB_APP_OPEN_IOS?: string;
  EXPO_PUBLIC_ADMOB_TEST_MODE?: string;

  // Sentry Configuration
  EXPO_PUBLIC_SENTRY_DSN?: string;
  EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING?: string;
  EXPO_PUBLIC_ERROR_SAMPLE_RATE?: string;
  EXPO_PUBLIC_PERFORMANCE_SAMPLE_RATE?: string;

  // Firebase (Legacy)
  EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
  EXPO_PUBLIC_FIREBASE_API_KEY?: string;

  // Health & Monitoring
  EXPO_PUBLIC_HEALTH_CHECK_ENDPOINT?: string;
  EXPO_PUBLIC_STATUS_PAGE_URL?: string;
}

// Service availability status
export interface ServiceStatus {
  name: string;
  configured: boolean;
  healthy: boolean;
  required: boolean;
  description: string;
  configurationKeys: string[];
  lastChecked?: number;
  error?: string;
}

// Environment validation result
export interface ValidationResult {
  isValid: boolean;
  score: number;
  services: ServiceStatus[];
  warnings: string[];
  errors: string[];
  lastValidated: number;
}

// Service configurations with requirements
const SERVICE_CONFIGS = {
  supabase: {
    name: "Supabase",
    required: true,
    description: "Database, authentication, and real-time features",
    keys: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"],
    validators: {
      EXPO_PUBLIC_SUPABASE_URL: (value: string) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(value),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: (value: string) => /^(sb_publishable_|sb_secret_|eyJ)/.test(value),
    },
  },
  expo: {
    name: "Expo",
    required: true,
    description: "Push notifications and app services",
    keys: ["EXPO_PUBLIC_PROJECT_ID"],
    validators: {
      EXPO_PUBLIC_PROJECT_ID: (value: string) => /^[a-f0-9-]{36}$/.test(value),
    },
  },
  revenuecat: {
    name: "RevenueCat",
    required: false,
    description: "In-app purchases and subscriptions",
    keys: ["EXPO_PUBLIC_REVENUECAT_API_KEY"],
    optionalKeys: ["EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"],
    validators: {
      EXPO_PUBLIC_REVENUECAT_API_KEY: (value: string) => /^[a-zA-Z0-9_-]+$/.test(value),
    },
  },
  admob: {
    name: "AdMob",
    required: false,
    description: "Advertising and monetization",
    keys: [],
    optionalKeys: [
      "EXPO_PUBLIC_ADMOB_BANNER_ANDROID",
      "EXPO_PUBLIC_ADMOB_BANNER_IOS",
      "EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID",
      "EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS",
    ],
    validators: {
      EXPO_PUBLIC_ADMOB_BANNER_ANDROID: (value: string) => /^ca-app-pub-[0-9]+\/[0-9]+$/.test(value),
      EXPO_PUBLIC_ADMOB_BANNER_IOS: (value: string) => /^ca-app-pub-[0-9]+\/[0-9]+$/.test(value),
    },
  },
  sentry: {
    name: "Sentry",
    required: false,
    description: "Error reporting and performance monitoring",
    keys: [],
    optionalKeys: ["EXPO_PUBLIC_SENTRY_DSN"],
    validators: {
      EXPO_PUBLIC_SENTRY_DSN: (value: string) =>
        /^https:\/\/[a-f0-9]+@[a-z0-9]+\.ingest\.sentry\.io\/[0-9]+$/.test(value),
    },
  },
};

// Runtime environment access with fallbacks
const getEnvVar = (key: string): string | undefined => {
  return process.env[key];
};

const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key);
  return value ? value.toLowerCase() === "true" : defaultValue;
};

const getNumberEnvVar = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key);
  return value ? parseFloat(value) : defaultValue;
};

// Environment validation functions
export class EnvironmentValidator {
  private static cache: ValidationResult | null = null;
  private static cacheExpiry = 60000; // 1 minute

  /**
   * Validate all environment configuration
   */
  static validate(force: boolean = false): ValidationResult {
    const now = Date.now();

    // Return cached result if still valid and not forcing
    if (!force && this.cache && now - this.cache.lastValidated < this.cacheExpiry) {
      return this.cache;
    }

    const result: ValidationResult = {
      isValid: true,
      score: 0,
      services: [],
      warnings: [],
      errors: [],
      lastValidated: now,
    };

    let totalScore = 0;
    let maxScore = 0;

    // Validate each service
    Object.entries(SERVICE_CONFIGS).forEach(([serviceKey, config]) => {
      const serviceStatus = this.validateService(serviceKey, config);
      result.services.push(serviceStatus);

      // Calculate scoring
      const serviceWeight = config.required ? 40 : 15; // Required services worth more
      maxScore += serviceWeight;

      if (serviceStatus.configured) {
        totalScore += serviceWeight;
      } else if (config.required) {
        result.errors.push(`${config.name} is not configured (required)`);
        result.isValid = false;
      } else {
        result.warnings.push(`${config.name} is not configured (optional)`);
      }
    });

    // Calculate final score
    result.score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Additional validation warnings
    this.addAdditionalWarnings(result);

    // Cache the result
    this.cache = result;
    return result;
  }

  /**
   * Validate a specific service configuration
   */
  private static validateService(serviceKey: string, config: any): ServiceStatus {
    const status: ServiceStatus = {
      name: config.name,
      configured: false,
      healthy: true,
      required: config.required,
      description: config.description,
      configurationKeys: [...(config.keys || []), ...(config.optionalKeys || [])],
      lastChecked: Date.now(),
    };

    try {
      // Check required keys
      const requiredKeys = config.keys || [];
      const allRequiredPresent = requiredKeys.every((key: string) => {
        const value = getEnvVar(key);
        return value && value.trim() !== "";
      });

      // Check optional keys
      const optionalKeys = config.optionalKeys || [];
      const someOptionalPresent = optionalKeys.some((key: string) => {
        const value = getEnvVar(key);
        return value && value.trim() !== "";
      });

      // Service is configured if all required keys are present OR some optional keys are present
      status.configured = allRequiredPresent || (requiredKeys.length === 0 && someOptionalPresent);

      // Validate format for configured keys
      if (status.configured) {
        const allKeys = [...requiredKeys, ...optionalKeys];
        for (const key of allKeys) {
          const value = getEnvVar(key);
          if (value && config.validators && config.validators[key]) {
            if (!config.validators[key](value)) {
              status.healthy = false;
              status.error = `Invalid format for ${key}`;
              break;
            }
          }
        }
      }
    } catch (error) {
      status.healthy = false;
      status.error = error instanceof Error ? error.message : "Unknown error";
    }

    return status;
  }

  /**
   * Add additional validation warnings based on configuration patterns
   */
  private static addAdditionalWarnings(result: ValidationResult): void {
    // Check for partial RevenueCat configuration
    const revenueCatKeys = [
      "EXPO_PUBLIC_REVENUECAT_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    ];
    const configuredRevenueCatKeys = revenueCatKeys.filter((key) => getEnvVar(key));
    if (configuredRevenueCatKeys.length > 0 && configuredRevenueCatKeys.length < 3) {
      result.warnings.push("RevenueCat partially configured - consider adding all platform keys");
    }

    // Check for partial AdMob configuration
    const adMobKeys = [
      "EXPO_PUBLIC_ADMOB_BANNER_ANDROID",
      "EXPO_PUBLIC_ADMOB_BANNER_IOS",
      "EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID",
      "EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS",
    ];
    const configuredAdMobKeys = adMobKeys.filter((key) => getEnvVar(key));
    if (configuredAdMobKeys.length > 0 && configuredAdMobKeys.length < 4) {
      result.warnings.push("AdMob partially configured - consider adding all ad unit types");
    }

    // Check for development vs production inconsistencies
    const isDev = __DEV__;
    const testMode = getBooleanEnvVar("EXPO_PUBLIC_ADMOB_TEST_MODE", true);

    if (!isDev && testMode) {
      result.warnings.push("AdMob test mode enabled in production build");
    }

    // Check for Sentry configuration completeness
    const sentryDsn = getEnvVar("EXPO_PUBLIC_SENTRY_DSN");
    const sentryOrg = getEnvVar("SENTRY_ORG");
    const sentryProject = getEnvVar("SENTRY_PROJECT");

    if (sentryDsn && (!sentryOrg || !sentryProject)) {
      result.warnings.push("Sentry DSN configured but missing org/project for source maps");
    }
  }

  /**
   * Clear validation cache to force revalidation
   */
  static clearCache(): void {
    this.cache = null;
  }
}

// React Hook for environment validation
export const useEnvironmentValidation = () => {
  const [validation, setValidation] = React.useState<ValidationResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const performValidation = () => {
      setLoading(true);
      try {
        const result = EnvironmentValidator.validate();
        setValidation(result);
      } catch (error) {
        console.error("Environment validation failed:", error);
      } finally {
        setLoading(false);
      }
    };

    performValidation();

    // Re-validate every 5 minutes
    const interval = setInterval(performValidation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    validation,
    loading,
    refresh: () => {
      EnvironmentValidator.clearCache();
      const result = EnvironmentValidator.validate(true);
      setValidation(result);
    },
  };
};

// Service availability checkers
export const ServiceChecker = {
  /**
   * Check if a specific service is configured and healthy
   */
  isServiceAvailable(service: keyof typeof SERVICE_CONFIGS): boolean {
    const validation = EnvironmentValidator.validate();
    const serviceStatus = validation.services.find((s) => s.name === SERVICE_CONFIGS[service].name);
    return serviceStatus ? serviceStatus.configured && serviceStatus.healthy : false;
  },

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(feature: "push_notifications" | "monetization" | "ads" | "error_reporting"): boolean {
    switch (feature) {
      case "push_notifications":
        return this.isServiceAvailable("expo");
      case "monetization":
        return this.isServiceAvailable("revenuecat");
      case "ads":
        return this.isServiceAvailable("admob");
      case "error_reporting":
        return this.isServiceAvailable("sentry");
      default:
        return false;
    }
  },

  /**
   * Get configuration status for all services
   */
  getServicesStatus(): ServiceStatus[] {
    const validation = EnvironmentValidator.validate();
    return validation.services;
  },

  /**
   * Get environment completeness score (0-100)
   */
  getCompletenessScore(): number {
    const validation = EnvironmentValidator.validate();
    return validation.score;
  },
};

// Environment variable access utilities
export const EnvVars = {
  /**
   * Get Supabase configuration
   */
  supabase: {
    url: getEnvVar("EXPO_PUBLIC_SUPABASE_URL") || "",
    anonKey: getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY") || "",
  },

  /**
   * Get Expo configuration
   */
  expo: {
    projectId: getEnvVar("EXPO_PUBLIC_PROJECT_ID") || "",
  },

  /**
   * Get RevenueCat configuration
   */
  revenuecat: {
    apiKey: getEnvVar("EXPO_PUBLIC_REVENUECAT_API_KEY"),
    iosApiKey: getEnvVar("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"),
    androidApiKey: getEnvVar("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"),
    premiumEntitlements: getEnvVar("EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENTS")?.split(",") || ["premium", "pro"],
  },

  /**
   * Get AdMob configuration
   */
  admob: {
    testMode: getBooleanEnvVar("EXPO_PUBLIC_ADMOB_TEST_MODE", true),
    bannerAndroid: getEnvVar("EXPO_PUBLIC_ADMOB_BANNER_ANDROID"),
    bannerIos: getEnvVar("EXPO_PUBLIC_ADMOB_BANNER_IOS"),
    interstitialAndroid: getEnvVar("EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID"),
    interstitialIos: getEnvVar("EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS"),
    appOpenAndroid: getEnvVar("EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID"),
    appOpenIos: getEnvVar("EXPO_PUBLIC_ADMOB_APP_OPEN_IOS"),
  },

  /**
   * Get Sentry configuration
   */
  sentry: {
    dsn: getEnvVar("EXPO_PUBLIC_SENTRY_DSN"),
    enablePerformanceMonitoring: getBooleanEnvVar("EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING", true),
    errorSampleRate: getNumberEnvVar("EXPO_PUBLIC_ERROR_SAMPLE_RATE", 0.1),
    performanceSampleRate: getNumberEnvVar("EXPO_PUBLIC_PERFORMANCE_SAMPLE_RATE", 0.05),
  },

  /**
   * Get health check configuration
   */
  health: {
    endpoint: getEnvVar("EXPO_PUBLIC_HEALTH_CHECK_ENDPOINT"),
    statusPageUrl: getEnvVar("EXPO_PUBLIC_STATUS_PAGE_URL"),
  },

  /**
   * Get environment type
   */
  environment: {
    isDevelopment: __DEV__,
    isProduction: !__DEV__,
  },
};

// Helper functions for runtime environment detection
export const EnvironmentHelpers = {
  /**
   * Safely access environment variable with fallback
   */
  safeGet<T>(key: string, defaultValue: T, parser?: (value: string) => T): T {
    try {
      const value = getEnvVar(key);
      if (!value) return defaultValue;
      return parser ? parser(value) : (value as unknown as T);
    } catch (error) {
      console.warn(`Failed to parse environment variable ${key}:`, error);
      return defaultValue;
    }
  },

  /**
   * Sanitize environment variable for logging (hide sensitive parts)
   */
  sanitize(key: string, value: string | undefined): string {
    if (!value) return "Not set";

    // URLs - show domain only
    if (key.includes("URL")) {
      try {
        const url = new URL(value);
        return `${url.protocol}//${url.hostname}`;
      } catch {
        return "Invalid URL";
      }
    }

    // Keys and tokens - show first 4 and last 4 characters
    if (key.includes("KEY") || key.includes("TOKEN") || key.includes("SECRET") || key.includes("DSN")) {
      return value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : "***";
    }

    // IDs - show partial
    if (key.includes("ID")) {
      return value.length > 8 ? `${value.substring(0, 8)}...` : value;
    }

    return value;
  },

  /**
   * Generate environment status report
   */
  generateStatusReport(): string {
    const validation = EnvironmentValidator.validate();

    let report = "Environment Configuration Report\n";
    report += "=====================================\n";
    report += `Completeness Score: ${validation.score}%\n`;
    report += `Environment: ${__DEV__ ? "Development" : "Production"}\n`;
    report += `Validation Status: ${validation.isValid ? "Valid" : "Invalid"}\n`;
    report += `Last Validated: ${new Date(validation.lastValidated).toLocaleString()}\n\n`;

    report += "Service Status:\n";
    validation.services.forEach((service) => {
      const status =
        service.configured && service.healthy ? "✅" : service.configured && !service.healthy ? "⚠️" : "❌";
      report += `  ${status} ${service.name}: ${service.configured ? "Configured" : "Not configured"}`;
      if (service.configured && !service.healthy) {
        report += ` (${service.error || "Health check failed"})`;
      }
      report += "\n";
    });

    if (validation.warnings.length > 0) {
      report += "\nWarnings:\n";
      validation.warnings.forEach((warning) => {
        report += `  ⚠️ ${warning}\n`;
      });
    }

    if (validation.errors.length > 0) {
      report += "\nErrors:\n";
      validation.errors.forEach((error) => {
        report += `  🚨 ${error}\n`;
      });
    }

    return report;
  },
};

// Default export for convenience
export default {
  EnvironmentValidator,
  ServiceChecker,
  EnvVars,
  EnvironmentHelpers,
  useEnvironmentValidation,
};
