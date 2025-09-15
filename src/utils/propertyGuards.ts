/**
 * Property Guards Utility
 * Provides safe property definition functions that check configurability
 * before attempting to define properties to prevent 'property is not configurable' errors
 */

export interface PropertyDescriptor {
  value?: any;
  writable?: boolean;
  enumerable?: boolean;
  configurable?: boolean;
  get?: () => any;
  set?: (value: any) => void;
}

export interface PropertyConflict {
  propertyName: string;
  targetObject: any;
  existingDescriptor?: PropertyDescriptor;
  attemptedDescriptor: PropertyDescriptor;
  timestamp: number;
  stack?: string;
}

// Store for tracking property conflicts
const propertyConflicts: PropertyConflict[] = [];

/**
 * Safely check if a property is configurable
 */
export function checkPropertyConfigurable(obj: any, propertyName: string): boolean {
  try {
    if (!obj || typeof obj !== "object") {
      return true;
    }

    const descriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
    if (!descriptor) {
      // Property doesn't exist, so it's safe to define
      return true;
    }

    return descriptor.configurable !== false;
  } catch (error) {
    console.warn(`[PropertyGuards] Error checking property configurability for ${propertyName}:`, error);
    return false;
  }
}

/**
 * Safely define a property with existence and configurability checks
 */
export function safeDefineProperty(obj: any, propertyName: string, descriptor: PropertyDescriptor): boolean {
  try {
    if (!obj || typeof obj !== "object") {
      console.warn(`[PropertyGuards] Cannot define property ${propertyName} on non-object`);
      return false;
    }

    // Check if property already exists and is non-configurable
    const existingDescriptor = Object.getOwnPropertyDescriptor(obj, propertyName);

    if (existingDescriptor && existingDescriptor.configurable === false) {
      const conflict: PropertyConflict = {
        propertyName,
        targetObject: obj,
        existingDescriptor,
        attemptedDescriptor: descriptor,
        timestamp: Date.now(),
        stack: new Error().stack,
      };

      propertyConflicts.push(conflict);

      console.warn(
        `[PropertyGuards] Cannot redefine non-configurable property '${propertyName}'`,
        "Existing:",
        existingDescriptor,
        "Attempted:",
        descriptor,
      );

      return false;
    }

    // Attempt to define the property
    Object.defineProperty(obj, propertyName, descriptor);
    return true;
  } catch (error) {
    const conflict: PropertyConflict = {
      propertyName,
      targetObject: obj,
      existingDescriptor: Object.getOwnPropertyDescriptor(obj, propertyName),
      attemptedDescriptor: descriptor,
      timestamp: Date.now(),
      stack: error instanceof Error ? error.stack : new Error().stack,
    };

    propertyConflicts.push(conflict);

    console.error(`[PropertyGuards] Failed to define property '${propertyName}':`, error);
    return false;
  }
}

/**
 * Safely delete a property with configurability checks
 */
export function safeDeleteProperty(obj: any, propertyName: string): boolean {
  try {
    if (!obj || typeof obj !== "object") {
      return true;
    }

    const descriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
    if (!descriptor) {
      // Property doesn't exist, nothing to delete
      return true;
    }

    if (descriptor.configurable === false) {
      console.warn(`[PropertyGuards] Cannot delete non-configurable property '${propertyName}'`);
      return false;
    }

    delete obj[propertyName];
    return true;
  } catch (error) {
    console.error(`[PropertyGuards] Failed to delete property '${propertyName}':`, error);
    return false;
  }
}

/**
 * Create a property definition wrapper that logs attempts
 */
export function createPropertyLogger(originalDefineProperty: typeof Object.defineProperty) {
  return function loggedDefineProperty(obj: any, propertyName: string, descriptor: PropertyDescriptor) {
    const existingDescriptor = Object.getOwnPropertyDescriptor(obj, propertyName);

    console.log(
      `[PropertyGuards] Attempting to define property '${propertyName}'`,
      "Target:",
      obj?.constructor?.name || typeof obj,
      "Existing:",
      existingDescriptor,
      "New:",
      descriptor,
    );

    try {
      return originalDefineProperty.call(Object, obj, propertyName, descriptor);
    } catch (error) {
      console.error(
        `[PropertyGuards] Property definition failed for '${propertyName}':`,
        error,
        "Stack:",
        new Error().stack,
      );
      throw error;
    }
  };
}

/**
 * Detect and resolve polyfill conflicts
 */
export function detectPolyfillConflicts(): PropertyConflict[] {
  const conflicts: PropertyConflict[] = [];

  // Common polyfill targets that might cause conflicts
  const polyfillTargets = [
    { obj: global, name: "global" },
    { obj: globalThis, name: "globalThis" },
    { obj: window, name: "window" },
    { obj: URL, name: "URL" },
    { obj: URLSearchParams, name: "URLSearchParams" },
    { obj: crypto, name: "crypto" },
    { obj: Array.prototype, name: "Array.prototype" },
    { obj: String.prototype, name: "String.prototype" },
    { obj: Object.prototype, name: "Object.prototype" },
  ].filter((target) => target.obj);

  for (const target of polyfillTargets) {
    try {
      const props = Object.getOwnPropertyNames(target.obj);
      for (const prop of props) {
        const descriptor = Object.getOwnPropertyDescriptor(target.obj, prop);
        if (descriptor && descriptor.configurable === false) {
          // This is a potential conflict point
          console.log(`[PropertyGuards] Non-configurable property detected: ${target.name}.${prop}`);
        }
      }
    } catch (error) {
      console.warn(`[PropertyGuards] Could not inspect ${target.name}:`, error);
    }
  }

  return conflicts;
}

/**
 * Apply workarounds for known property conflicts
 */
export function applyPropertyWorkarounds(): void {
  try {
    // Workaround for react-native-reanimated property conflicts
    if (global._WORKLET) {
      console.log("[PropertyGuards] Applying react-native-reanimated workarounds");
      // Add specific workarounds for worklet runtime
    }

    // Workaround for URL polyfill conflicts
    if (global.URL && !checkPropertyConfigurable(global, "URL")) {
      console.log("[PropertyGuards] URL property conflict detected, applying workaround");
      // Store reference before potential override
      global.__originalURL = global.URL;
    }

    // Workaround for crypto polyfill conflicts
    if (global.crypto && !checkPropertyConfigurable(global, "crypto")) {
      console.log("[PropertyGuards] Crypto property conflict detected, applying workaround");
      // Store reference before potential override
      global.__originalCrypto = global.crypto;
    }
  } catch (error) {
    console.warn("[PropertyGuards] Error applying property workarounds:", error);
  }
}

/**
 * Get all recorded property conflicts
 */
export function getPropertyConflicts(): PropertyConflict[] {
  return [...propertyConflicts];
}

/**
 * Clear recorded property conflicts
 */
export function clearPropertyConflicts(): void {
  propertyConflicts.length = 0;
}

/**
 * Check if an object has a specific property without triggering getters
 */
export function hasOwnPropertySafe(obj: any, propertyName: string): boolean {
  try {
    return Object.prototype.hasOwnProperty.call(obj, propertyName);
  } catch (error) {
    return false;
  }
}

/**
 * Safely get property descriptor without causing errors
 */
export function getPropertyDescriptorSafe(obj: any, propertyName: string): PropertyDescriptor | undefined {
  try {
    return Object.getOwnPropertyDescriptor(obj, propertyName);
  } catch (error) {
    console.warn(`[PropertyGuards] Could not get descriptor for ${propertyName}:`, error);
    return undefined;
  }
}

/**
 * Create a safe property accessor that handles non-configurable properties
 */
export function createSafePropertyAccessor<T = any>(obj: any, propertyName: string, defaultValue?: T): () => T {
  return () => {
    try {
      if (hasOwnPropertySafe(obj, propertyName)) {
        return obj[propertyName];
      }
      return defaultValue as T;
    } catch (error) {
      console.warn(`[PropertyGuards] Error accessing property ${propertyName}:`, error);
      return defaultValue as T;
    }
  };
}

/**
 * Initialize property guards monitoring
 */
export function initializePropertyGuards(): void {
  console.log("[PropertyGuards] Initializing property guards monitoring");

  // Detect existing conflicts
  detectPolyfillConflicts();

  // Apply known workarounds
  applyPropertyWorkarounds();

  // Monitor for new conflicts
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = createPropertyLogger(originalDefineProperty);

  console.log("[PropertyGuards] Property guards monitoring active");
}
