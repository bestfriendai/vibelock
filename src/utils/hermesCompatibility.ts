/**
 * Hermes Compatibility Utility
 * Detects and handles property configuration issues specific to the Hermes JavaScript engine
 */

import { PropertyConflict, safeDefineProperty, checkPropertyConfigurable } from "./propertyGuards";

export interface HermesEngineInfo {
  isHermes: boolean;
  version?: string;
  buildType?: string;
  hasNewArchitecture: boolean;
  hasWorkletRuntime: boolean;
}

export interface HermesCompatibilityIssue {
  type: "property-conflict" | "reanimated-issue" | "polyfill-conflict" | "native-module-issue";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedModules: string[];
  workaround?: () => void;
  fix?: () => void;
}

/**
 * Detect if the app is running on Hermes engine
 */
export function detectHermesEngine(): HermesEngineInfo {
  const isHermes = !!(global as any).HermesInternal;
  let version: string | undefined;
  let buildType: string | undefined;

  try {
    if (isHermes) {
      const hermesInternal = (global as any).HermesInternal;
      version = hermesInternal?.getRuntimeProperties?.()?.["OSS Release Version"];
      buildType = hermesInternal?.getRuntimeProperties?.()?.["Build"];
    }
  } catch (error) {
    console.warn("[HermesCompatibility] Could not get Hermes version info:", error);
  }

  const hasNewArchitecture =
    !!(global as any).RN$Bridgeless ||
    !!(global as any).__turboModuleProxy ||
    !!(global as any).__fbBatchedBridge === false;

  const hasWorkletRuntime = !!(global as any)._WORKLET || !!(global as any).__reanimatedWorkletInit;

  return {
    isHermes,
    version,
    buildType,
    hasNewArchitecture,
    hasWorkletRuntime,
  };
}

/**
 * Detect property conflicts specific to Hermes
 */
export function detectHermesPropertyConflicts(): HermesCompatibilityIssue[] {
  const issues: HermesCompatibilityIssue[] = [];
  const engine = detectHermesEngine();

  if (!engine.isHermes) {
    return issues;
  }

  // Check for react-native-reanimated v4.x compatibility issues
  if (engine.hasWorkletRuntime) {
    const reanimatedIssues = checkReanimatedCompatibility();
    issues.push(...reanimatedIssues);
  }

  // Check for polyfill conflicts in Hermes
  const polyfillIssues = checkPolyfillCompatibility();
  issues.push(...polyfillIssues);

  // Check for New Architecture specific issues
  if (engine.hasNewArchitecture) {
    const bridgelessIssues = checkBridgelessCompatibility();
    issues.push(...bridgelessIssues);
  }

  return issues;
}

/**
 * Check for react-native-reanimated compatibility issues
 */
function checkReanimatedCompatibility(): HermesCompatibilityIssue[] {
  const issues: HermesCompatibilityIssue[] = [];

  try {
    // Check if _WORKLET is defined properly
    if ((global as any)._WORKLET) {
      const workletDescriptor = Object.getOwnPropertyDescriptor(global, "_WORKLET");
      if (workletDescriptor && workletDescriptor.configurable === false) {
        issues.push({
          type: "reanimated-issue",
          severity: "high",
          description: "Worklet runtime property _WORKLET is non-configurable",
          affectedModules: ["react-native-reanimated"],
          workaround: () => {
            console.log("[HermesCompatibility] Applying worklet property workaround");
            // Store original value before any potential redefinition
            (global as any).__originalWorklet = (global as any)._WORKLET;
          },
        });
      }
    }

    // Check for common reanimated globals that might conflict
    const reanimatedGlobals = ["_frameTimestamp", "_eventTimestamp", "__reanimatedWorkletInit", "__callMicroTask"];

    for (const globalName of reanimatedGlobals) {
      if ((global as any)[globalName] && !checkPropertyConfigurable(global, globalName)) {
        issues.push({
          type: "reanimated-issue",
          severity: "medium",
          description: `Reanimated global ${globalName} is non-configurable`,
          affectedModules: ["react-native-reanimated"],
          workaround: () => {
            (global as any)[`__original${globalName}`] = (global as any)[globalName];
          },
        });
      }
    }
  } catch (error) {
    console.warn("[HermesCompatibility] Error checking reanimated compatibility:", error);
  }

  return issues;
}

/**
 * Check for polyfill compatibility issues in Hermes
 */
function checkPolyfillCompatibility(): HermesCompatibilityIssue[] {
  const issues: HermesCompatibilityIssue[] = [];

  // Check URL polyfill conflicts
  if ((global as any).URL) {
    const urlDescriptor = Object.getOwnPropertyDescriptor(global, "URL");
    if (urlDescriptor && urlDescriptor.configurable === false) {
      issues.push({
        type: "polyfill-conflict",
        severity: "high",
        description: "URL polyfill conflicts with non-configurable global.URL",
        affectedModules: ["react-native-url-polyfill"],
        fix: () => {
          // Store original URL before polyfill override
          if (!(global as any).__originalURL) {
            (global as any).__originalURL = (global as any).URL;
          }
        },
      });
    }
  }

  // Check crypto polyfill conflicts
  if ((global as any).crypto) {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(global, "crypto");
    if (cryptoDescriptor && cryptoDescriptor.configurable === false) {
      issues.push({
        type: "polyfill-conflict",
        severity: "high",
        description: "Crypto polyfill conflicts with non-configurable global.crypto",
        affectedModules: ["react-native-get-random-values"],
        fix: () => {
          // Store original crypto before polyfill override
          if (!(global as any).__originalCrypto) {
            (global as any).__originalCrypto = (global as any).crypto;
          }
        },
      });
    }
  }

  return issues;
}

/**
 * Check for New Architecture (Bridgeless) compatibility issues
 */
function checkBridgelessCompatibility(): HermesCompatibilityIssue[] {
  const issues: HermesCompatibilityIssue[] = [];

  try {
    // Check for turbo module proxy issues
    if ((global as any).__turboModuleProxy) {
      const proxyDescriptor = Object.getOwnPropertyDescriptor(global, "__turboModuleProxy");
      if (proxyDescriptor && proxyDescriptor.configurable === false) {
        issues.push({
          type: "native-module-issue",
          severity: "medium",
          description: "TurboModule proxy property is non-configurable",
          affectedModules: ["react-native"],
          workaround: () => {
            console.log("[HermesCompatibility] TurboModule proxy detected as non-configurable");
          },
        });
      }
    }

    // Check for fabric renderer issues
    if ((global as any).RN$Bridgeless) {
      const bridgelessDescriptor = Object.getOwnPropertyDescriptor(global, "RN$Bridgeless");
      if (bridgelessDescriptor && bridgelessDescriptor.configurable === false) {
        issues.push({
          type: "native-module-issue",
          severity: "low",
          description: "Bridgeless mode property is non-configurable",
          affectedModules: ["react-native"],
          workaround: () => {
            console.log("[HermesCompatibility] Bridgeless mode detected");
          },
        });
      }
    }
  } catch (error) {
    console.warn("[HermesCompatibility] Error checking bridgeless compatibility:", error);
  }

  return issues;
}

/**
 * Apply Hermes-specific workarounds
 */
export function applyHermesWorkarounds(): void {
  const engine = detectHermesEngine();

  if (!engine.isHermes) {
    console.log("[HermesCompatibility] Not running on Hermes, skipping Hermes-specific workarounds");
    return;
  }

  console.log("[HermesCompatibility] Applying Hermes-specific workarounds");

  // Fix for React Native Reanimated _toString property issue
  try {
    // Check if _toString is missing (even without worklets flag)
    if (typeof (global as any)._toString === 'undefined') {
      console.log("[HermesCompatibility] Adding missing _toString property for Reanimated compatibility");

      Object.defineProperty(global, '_toString', {
        value: function(obj: any) {
          if (obj === null) return 'null';
          if (obj === undefined) return 'undefined';
          if (typeof obj === 'string') return obj;
          if (typeof obj.toString === 'function') return obj.toString();
          return String(obj);
        },
        configurable: true,
        writable: true,
        enumerable: false
      });
    }

    // Also ensure Function.prototype._toString exists for worklets
    if (typeof Function.prototype._toString === 'undefined') {
      console.log("[HermesCompatibility] Adding Function.prototype._toString for worklets");

      Object.defineProperty(Function.prototype, '_toString', {
        value: function() {
          return this.toString();
        },
        configurable: true,
        writable: true,
        enumerable: false
      });
    }
  } catch (error) {
    console.warn("[HermesCompatibility] Failed to add _toString property:", error);
  }

  const issues = detectHermesPropertyConflicts();

  for (const issue of issues) {
    try {
      console.log(`[HermesCompatibility] Addressing ${issue.type}: ${issue.description}`);

      if (issue.fix) {
        issue.fix();
      } else if (issue.workaround) {
        issue.workaround();
      }
    } catch (error) {
      console.error(`[HermesCompatibility] Failed to apply fix for ${issue.type}:`, error);
    }
  }
}

/**
 * Create a Hermes-safe property definition function
 */
export function createHermesSafeDefineProperty() {
  const originalDefineProperty = Object.defineProperty;

  return function hermesSafeDefineProperty(obj: any, propertyName: string, descriptor: PropertyDescriptor) {
    try {
      // In Hermes, some properties might be non-configurable from native code
      const existing = Object.getOwnPropertyDescriptor(obj, propertyName);

      if (existing && existing.configurable === false) {
        // Check if we're trying to set the same value
        if ("value" in descriptor && existing.value === descriptor.value) {
          console.log(`[HermesCompatibility] Skipping redefinition of ${propertyName} with same value`);
          return obj;
        }

        // Try to work around the issue by deleting first (if possible)
        try {
          delete obj[propertyName];
        } catch (deleteError) {
          console.warn(`[HermesCompatibility] Cannot redefine non-configurable property ${propertyName}`);
          return obj;
        }
      }

      return originalDefineProperty.call(Object, obj, propertyName, descriptor);
    } catch (error) {
      console.error(`[HermesCompatibility] Property definition failed for ${propertyName}:`, error);
      throw error;
    }
  };
}

/**
 * Check if a specific module might cause property conflicts in Hermes
 */
export function checkModuleHermesCompatibility(moduleName: string): HermesCompatibilityIssue[] {
  const issues: HermesCompatibilityIssue[] = [];

  // Known problematic modules in Hermes
  const problematicModules = {
    "react-native-reanimated": {
      versions: ["4.0.0-alpha", "4.1.0"],
      issues: ["Worklet runtime property conflicts", "Frame callback redefinition"],
    },
    "react-native-url-polyfill": {
      versions: ["*"],
      issues: ["URL global property conflicts in Hermes"],
    },
    "react-native-get-random-values": {
      versions: ["*"],
      issues: ["Crypto global property conflicts in Hermes"],
    },
  };

  if (problematicModules[moduleName as keyof typeof problematicModules]) {
    const moduleInfo = problematicModules[moduleName as keyof typeof problematicModules];
    issues.push({
      type: "property-conflict",
      severity: "high",
      description: `Module ${moduleName} may cause property conflicts in Hermes`,
      affectedModules: [moduleName],
      workaround: () => {
        console.log(`[HermesCompatibility] Applying workaround for ${moduleName}`);
      },
    });
  }

  return issues;
}

/**
 * Initialize Hermes compatibility layer
 */
export function initializeHermesCompatibility(): HermesEngineInfo {
  const engine = detectHermesEngine();

  console.log("[HermesCompatibility] Engine info:", engine);

  if (engine.isHermes) {
    console.log("[HermesCompatibility] Hermes detected, initializing compatibility layer");

    // Apply workarounds for known issues
    applyHermesWorkarounds();

    // Replace Object.defineProperty with Hermes-safe version
    const safeDefineProperty = createHermesSafeDefineProperty();
    Object.defineProperty = safeDefineProperty;

    // Make the safe function available globally for Babel plugin
    (global as any).__hermesDefinePropertySafe = safeDefineProperty;
  } else {
    console.log("[HermesCompatibility] Non-Hermes engine detected");
  }

  return engine;
}
