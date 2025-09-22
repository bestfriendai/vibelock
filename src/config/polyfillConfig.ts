/**
 * Polyfill Configuration Module
 * Manages the loading order and conflict resolution for all polyfills
 */

import { safeDefineProperty, checkPropertyConfigurable, hasOwnPropertySafe } from "../utils/propertyGuards";
import { detectHermesEngine, checkModuleHermesCompatibility } from "../utils/hermesCompatibility";

export interface PolyfillConfig {
  name: string;
  modulePath: string;
  loadCondition?: () => boolean;
  preLoadCheck?: () => boolean;
  postLoadValidation?: () => boolean;
  fallbackStrategy?: () => void;
  priority: number; // Lower numbers load first
  required: boolean;
}

export interface PolyfillLoadResult {
  name: string;
  success: boolean;
  error?: Error;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Configuration for all polyfills in the app
 */
export const POLYFILL_CONFIGS: PolyfillConfig[] = [
  {
    name: "react-native-get-random-values",
    modulePath: "react-native-get-random-values",
    preLoadCheck: () => {
      // Ensure crypto is defined before accessing it
      if (typeof crypto === "undefined") {
        // crypto doesn't exist yet, safe to define
        return true;
      }
      // Check if crypto.getRandomValues already exists and is configurable
      if (hasOwnPropertySafe(global, "crypto") && (global as any).crypto?.getRandomValues) {
        const cryptoDescriptor = Object.getOwnPropertyDescriptor(global, "crypto");
        if (cryptoDescriptor && cryptoDescriptor.configurable === false) {
          (global as any).__originalCrypto = (global as any).crypto;
        }
        return checkPropertyConfigurable(global, "crypto");
      }
      return true;
    },
    loadCondition: () => {
      // Only load if crypto.getRandomValues is not available
      return typeof crypto === "undefined" || !(global as any).crypto?.getRandomValues;
    },
    postLoadValidation: () => {
      return !!(global as any).crypto?.getRandomValues;
    },
    fallbackStrategy: () => {
      if ((global as any).__originalCrypto) {
        try {
          (global as any).crypto = (global as any).__originalCrypto;
        } catch (error) {
          console.error("[PolyfillConfig] Failed to restore original crypto:", error);
        }
      }
    },
    priority: 1,
    required: true,
  },
  {
    name: "react-native-url-polyfill/auto",
    modulePath: "react-native-url-polyfill/auto",
    preLoadCheck: () => {
      // Check if URL already exists and is configurable
      if (hasOwnPropertySafe(global, "URL")) {
        const urlDescriptor = Object.getOwnPropertyDescriptor(global, "URL");
        if (urlDescriptor && urlDescriptor.configurable === false) {
          (global as any).__originalURL = (global as any).URL;
        }
        return checkPropertyConfigurable(global, "URL");
      }
      return true;
    },
    loadCondition: () => {
      // Check if we need URL polyfill
      try {
        new URL("https://example.com");
        return false; // URL works, no polyfill needed
      } catch (error) {
        return true; // URL polyfill needed
      }
    },
    postLoadValidation: () => {
      try {
        new URL("https://example.com");
        return true;
      } catch (error) {
        return false;
      }
    },
    fallbackStrategy: () => {
      if ((global as any).__originalURL) {
        try {
          (global as any).URL = (global as any).__originalURL;
        } catch (error) {
          console.error("[PolyfillConfig] Failed to restore original URL:", error);
        }
      }
    },
    priority: 2,
    required: true,
  },
];

/**
 * Load a single polyfill with safety checks
 */
function loadPolyfillSafe(config: PolyfillConfig): PolyfillLoadResult {
  const result: PolyfillLoadResult = {
    name: config.name,
    success: false,
  };

  try {
    // Check if loading condition is met
    if (config.loadCondition && !config.loadCondition()) {
      result.skipped = true;
      result.skipReason = "Load condition not met";
      result.success = true; // Skipping is considered success
      return result;
    }

    // Run pre-load checks
    if (config.preLoadCheck && !config.preLoadCheck()) {
      result.skipped = true;
      result.skipReason = "Pre-load check failed";

      if (config.fallbackStrategy) {
        config.fallbackStrategy();
      }

      // If it's required and we can't load it, this is an error
      result.success = !config.required;
      return result;
    }

    // Check for known compatibility issues
    const engine = detectHermesEngine();
    if (engine.isHermes) {
      const compatibilityIssues = checkModuleHermesCompatibility(config.name);
      if (compatibilityIssues.length > 0) {
        // Apply workarounds for detected issues
        for (const issue of compatibilityIssues) {
          if (issue.workaround) {
            issue.workaround();
          }
        }
      }
    }

    // Attempt to load the polyfill
    // Use static imports to avoid Metro bundler issues with dynamic requires
    switch (config.name) {
      case "react-native-get-random-values":
        require("react-native-get-random-values");
        break;
      case "react-native-url-polyfill/auto":
        require("react-native-url-polyfill/auto");
        break;
      default:
        break;
    }

    // Run post-load validation
    if (config.postLoadValidation && !config.postLoadValidation()) {
      throw new Error("Post-load validation failed");
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error : new Error(String(error));
    console.error(`[PolyfillConfig] Failed to load polyfill ${config.name}:`, error);

    // Try fallback strategy
    if (config.fallbackStrategy) {
      try {
        config.fallbackStrategy();
        result.success = !config.required; // If fallback works and it's not required, consider it success
      } catch (fallbackError) {
        console.error(`[PolyfillConfig] Fallback strategy failed for ${config.name}:`, fallbackError);
      }
    }
  }

  return result;
}

/**
 * Load all polyfills in the correct order with error handling
 */
export function loadPolyfills(): PolyfillLoadResult[] {
  // Sort by priority (lower numbers first)
  const sortedConfigs = [...POLYFILL_CONFIGS].sort((a, b) => a.priority - b.priority);

  const results: PolyfillLoadResult[] = [];

  for (const config of sortedConfigs) {
    try {
      const result = loadPolyfillSafe(config);
      results.push(result);

      // If a required polyfill fails to load, we might want to stop
      if (config.required && !result.success && !result.skipped) {
        console.error(`[PolyfillConfig] Required polyfill ${config.name} failed to load`);
        // Continue loading other polyfills but log the critical failure
      }
    } catch (error) {
      console.error(`[PolyfillConfig] Unexpected error loading ${config.name}:`, error);
      results.push({
        name: config.name,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  // Log summary
  const successful = results.filter((r) => r.success).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.success && !r.skipped).length;

  if (failed > 0) {
    const failedNames = results.filter((r) => !r.success && !r.skipped).map((r) => r.name);
    console.warn(`[PolyfillConfig] Failed to load polyfills: ${failedNames.join(", ")}`);
  }

  return results;
}

/**
 * Load polyfills synchronously (for critical polyfills that must load before app start)
 */
export function loadPolyfillsSync(): PolyfillLoadResult[] {
  const sortedConfigs = [...POLYFILL_CONFIGS].sort((a, b) => a.priority - b.priority);
  const results: PolyfillLoadResult[] = [];

  for (const config of sortedConfigs) {
    const result: PolyfillLoadResult = {
      name: config.name,
      success: false,
    };

    try {
      // Check if loading condition is met
      if (config.loadCondition && !config.loadCondition()) {
        result.skipped = true;
        result.skipReason = "Load condition not met";
        result.success = true;
        results.push(result);
        continue;
      }

      // Run pre-load checks
      if (config.preLoadCheck && !config.preLoadCheck()) {
        result.skipped = true;
        result.skipReason = "Pre-load check failed";

        if (config.fallbackStrategy) {
          config.fallbackStrategy();
        }

        result.success = !config.required;
        results.push(result);
        continue;
      }

      // Synchronous require (only works for CommonJS modules)
      // Use static imports to avoid Metro bundler issues with dynamic requires
      switch (config.name) {
        case "react-native-get-random-values":
          require("react-native-get-random-values");
          break;
        case "react-native-url-polyfill/auto":
          require("react-native-url-polyfill/auto");
          break;
        default:
          break;
      }

      // Run post-load validation
      if (config.postLoadValidation && !config.postLoadValidation()) {
        throw new Error("Post-load validation failed");
      }

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error : new Error(String(error));
      console.error(`[PolyfillConfig] Failed to load polyfill synchronously ${config.name}:`, error);

      // Try fallback strategy
      if (config.fallbackStrategy) {
        try {
          config.fallbackStrategy();
          result.success = !config.required;
        } catch (fallbackError) {
          console.error(`[PolyfillConfig] Fallback strategy failed for ${config.name}:`, fallbackError);
        }
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Check if all required polyfills are loaded and working
 */
export function validatePolyfills(): boolean {
  let allValid = true;

  for (const config of POLYFILL_CONFIGS) {
    if (!config.required) continue;

    try {
      if (config.postLoadValidation && !config.postLoadValidation()) {
        console.error(`[PolyfillConfig] Required polyfill ${config.name} validation failed`);
        allValid = false;
      }
    } catch (error) {
      console.error(`[PolyfillConfig] Error validating polyfill ${config.name}:`, error);
      allValid = false;
    }
  }

  return allValid;
}

/**
 * Get the current status of all polyfills
 */
export function getPolyfillStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};

  for (const config of POLYFILL_CONFIGS) {
    try {
      if (config.postLoadValidation) {
        status[config.name] = config.postLoadValidation();
      } else {
        // If no validation function, assume it's loaded if condition is met
        status[config.name] = config.loadCondition ? !config.loadCondition() : true;
      }
    } catch (error) {
      status[config.name] = false;
    }
  }

  return status;
}
