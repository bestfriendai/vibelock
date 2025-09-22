import { useEffect, useRef, useCallback, useState } from "react";
import { AppState, AppStateStatus, Keyboard } from "react-native";
import { useUserFeedback } from "../components/UserFeedbackSystem";
import { productionMonitor } from "../services/productionMonitoring";
import { performanceMonitor } from "../utils/performance";
import { uiValidator } from "../utils/uiValidation";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProductionQualityOptions {
  enableMonitoring?: boolean;
  enableErrorBoundary?: boolean;
  enablePerformanceTracking?: boolean;
  enableAccessibilityValidation?: boolean;
  enableAutoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  cacheEnabled?: boolean;
  cacheTimeout?: number;
}

interface ProductionQualityUtilities {
  // Error handling
  withErrorHandler: <T>(fn: () => Promise<T>, fallback?: T) => Promise<T>;
  retry: <T>(fn: () => Promise<T>, options?: RetryOptions) => Promise<T>;

  // Performance
  trackPerformance: (operation: string) => () => void;
  memoize: <T>(fn: (...args: any[]) => T) => (...args: any[]) => T;

  // User feedback
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showError: (error: Error | string) => void;
  showSuccess: (message: string) => void;

  // Monitoring
  trackEvent: (event: string, data?: any) => void;
  trackError: (error: Error, context?: any) => void;

  // Accessibility
  announceForAccessibility: (message: string) => void;
  validateAccessibility: () => Promise<void>;

  // State management
  isLoading: boolean;
  error: Error | null;
  retryCount: number;

  // Lifecycle
  clearError: () => void;
  reset: () => void;
}

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number) => void;
}

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
}

export function useProductionQuality(
  componentName: string,
  options: ProductionQualityOptions = {},
): ProductionQualityUtilities {
  const {
    enableMonitoring = true,
    enableErrorBoundary = true,
    enablePerformanceTracking = true,
    enableAccessibilityValidation = false,
    enableAutoRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    cacheEnabled = true,
    cacheTimeout = 300000, // 5 minutes
  } = options;

  const feedback = useUserFeedback();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const componentMountTime = useRef(Date.now());
  const renderCount = useRef(0);
  const memoryLeakDetector = useRef<Set<any>>(new Set());
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const performanceTrackers = useRef<Map<string, number>>(new Map());
  const appStateSubscription = useRef<any>(null);
  const keyboardSubscriptions = useRef<any[]>([]);

  // Track component lifecycle
  useEffect(() => {
    renderCount.current++;

    if (enableMonitoring) {
      productionMonitor.trackUserFlow(componentName, "mount", {
        renderCount: renderCount.current,
        mountDuration: Date.now() - componentMountTime.current,
      });
    }

    // Monitor app state changes
    appStateSubscription.current = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (enableMonitoring) {
        productionMonitor.trackUserEngagement("app_state_change", componentName, {
          state: nextAppState,
        });
      }
    });

    // Monitor keyboard events
    const keyboardDidShowSub = Keyboard.addListener("keyboardDidShow", () => {
      if (enableMonitoring) {
        productionMonitor.trackUserEngagement("keyboard_show", componentName);
      }
    });

    const keyboardDidHideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (enableMonitoring) {
        productionMonitor.trackUserEngagement("keyboard_hide", componentName);
      }
    });

    keyboardSubscriptions.current = [keyboardDidShowSub, keyboardDidHideSub];

    // Validate accessibility on mount
    if (enableAccessibilityValidation) {
      validateAccessibility();
    }

    // Cleanup
    return () => {
      if (enableMonitoring) {
        const lifetime = Date.now() - componentMountTime.current;
        productionMonitor.trackUserFlow(componentName, "unmount", {
          lifetime,
          renderCount: renderCount.current,
        });
      }

      // Check for memory leaks
      if (memoryLeakDetector.current.size > 0) {
        console.warn(`[${componentName}] Potential memory leak detected: ${memoryLeakDetector.current.size} objects`);
      }

      // Cleanup subscriptions
      appStateSubscription.current?.remove();
      keyboardSubscriptions.current.forEach((sub) => sub.remove());

      // Clear cache
      cache.current.clear();
    };
  }, [componentName, enableMonitoring, enableAccessibilityValidation]);

  /**
   * Error handler wrapper
   */
  const withErrorHandler = useCallback(
    async <T>(fn: () => Promise<T>, fallback?: T): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fn();
        setIsLoading(false);
        return result;
      } catch (err: any) {
        setIsLoading(false);
        setError(err);

        if (enableMonitoring) {
          productionMonitor.trackError(err, { componentName }, "medium");
        }

        if (enableErrorBoundary) {
          feedback.showError(err, [
            {
              label: "Retry",
              onPress: () => withErrorHandler(fn, fallback),
              style: "primary",
            },
          ]);
        }

        if (fallback !== undefined) {
          return fallback;
        }

        throw err;
      }
    },
    [componentName, enableMonitoring, enableErrorBoundary, feedback],
  );

  /**
   * Retry mechanism
   */
  const retry = useCallback(
    async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
      const { maxRetries: maxAttempts = maxRetries, delay = retryDelay, backoff = true, onRetry } = options;

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setRetryCount(attempt - 1);
          const result = await fn();
          setRetryCount(0);
          return result;
        } catch (err: any) {
          lastError = err;

          if (attempt === maxAttempts) {
            setRetryCount(0);
            throw err;
          }

          if (onRetry) {
            onRetry(attempt);
          }

          const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      throw lastError || new Error("Retry failed");
    },
    [maxRetries, retryDelay],
  );

  /**
   * Track performance of operations
   */
  const trackPerformance = useCallback(
    (operation: string) => {
      const startTime = Date.now();
      performanceTrackers.current.set(operation, startTime);

      if (enablePerformanceTracking) {
        performanceMonitor.start(`${componentName}:${operation}`);
      }

      return () => {
        const duration = Date.now() - startTime;
        performanceTrackers.current.delete(operation);

        if (enablePerformanceTracking) {
          const stop = performanceMonitor.start(`${componentName}:${operation}`);
          stop();
        }

        if (enableMonitoring) {
          productionMonitor.trackPerformance(`${componentName}:${operation}`, duration);
        }
      };
    },
    [componentName, enablePerformanceTracking, enableMonitoring],
  );

  /**
   * Memoization helper
   */
  const memoize = useCallback(
    <T>(fn: (...args: any[]) => T) => {
      return (...args: any[]): T => {
        const key = JSON.stringify(args);
        const cached = cache.current.get(key);

        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return cached.value;
        }

        const result = fn(...args);

        if (cacheEnabled) {
          cache.current.set(key, {
            value: result,
            timestamp: Date.now(),
            ttl: cacheTimeout,
          });
        }

        // Clean old cache entries
        const now = Date.now();
        cache.current.forEach((entry, k) => {
          if (now - entry.timestamp > entry.ttl) {
            cache.current.delete(k);
          }
        });

        return result;
      };
    },
    [cacheEnabled, cacheTimeout],
  );

  /**
   * Show loading state
   */
  const showLoading = useCallback(
    (message?: string) => {
      setIsLoading(true);
      feedback.showLoading(message || `Loading ${componentName}...`);
    },
    [componentName, feedback],
  );

  /**
   * Hide loading state
   */
  const hideLoading = useCallback(() => {
    setIsLoading(false);
    feedback.hideLoading();
  }, [feedback]);

  /**
   * Show error message
   */
  const showError = useCallback(
    (error: Error | string) => {
      const errorObj = error instanceof Error ? error : new Error(error);
      setError(errorObj);

      const actions = enableAutoRetry
        ? [
            {
              label: "Retry",
              onPress: () => clearError(),
              style: "primary" as const,
            },
          ]
        : undefined;

      feedback.showError(errorObj, actions);
    },
    [enableAutoRetry, feedback],
  );

  /**
   * Show success message
   */
  const showSuccess = useCallback(
    (message: string) => {
      feedback.showSuccess(message);
    },
    [feedback],
  );

  /**
   * Track custom event
   */
  const trackEvent = useCallback(
    (event: string, data?: any) => {
      if (enableMonitoring) {
        productionMonitor.trackUserEngagement(event, componentName, data);
      }
    },
    [componentName, enableMonitoring],
  );

  /**
   * Track error
   */
  const trackError = useCallback(
    (error: Error, context?: any) => {
      if (enableMonitoring) {
        productionMonitor.trackError(
          error,
          {
            componentName,
            ...context,
          },
          "medium",
        );
      }
    },
    [componentName, enableMonitoring],
  );

  /**
   * Announce for accessibility
   */
  const announceForAccessibility = useCallback(
    (message: string) => {
      // Implementation would use AccessibilityInfo.announceForAccessibility
      if (__DEV__) {
        console.log(`[${componentName}] Accessibility announcement: ${message}`);
      }
    },
    [componentName],
  );

  /**
   * Validate accessibility
   */
  const validateAccessibility = useCallback(async () => {
    if (!enableAccessibilityValidation) return;

    try {
      const result = await uiValidator.validateAccessibility(componentName);

      if (!result.passed) {
        console.warn(`[${componentName}] Accessibility validation failed`);
      }

      if (enableMonitoring) {
        productionMonitor.trackUserFlow("accessibility_validation", componentName, {
          score: result.metrics?.accessibilityScore,
          issues: result.errors.length,
        });
      }
    } catch (error) {
      console.error(`[${componentName}] Accessibility validation failed:`, error);
    }
  }, [componentName, enableAccessibilityValidation, enableMonitoring]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
    cache.current.clear();
    performanceTrackers.current.clear();
    memoryLeakDetector.current.clear();
  }, []);

  // Monitor memory usage
  useEffect(() => {
    if (!enableMonitoring) return;

    const interval = setInterval(async () => {
      const memoryUsage = await performanceMonitor.trackMemoryUsage();

      if (memoryUsage > 0.8) {
        console.warn(`[${componentName}] High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);

        // Clear cache to free memory
        cache.current.clear();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [componentName, enableMonitoring]);

  // Auto-retry on error
  useEffect(() => {
    if (!error || !enableAutoRetry || retryCount >= maxRetries) return;

    const timeout = setTimeout(
      () => {
        clearError();
      },
      retryDelay * Math.pow(2, retryCount),
    );

    return () => clearTimeout(timeout);
  }, [error, enableAutoRetry, retryCount, maxRetries, retryDelay, clearError]);

  return {
    // Error handling
    withErrorHandler,
    retry,

    // Performance
    trackPerformance,
    memoize,

    // User feedback
    showLoading,
    hideLoading,
    showError,
    showSuccess,

    // Monitoring
    trackEvent,
    trackError,

    // Accessibility
    announceForAccessibility,
    validateAccessibility,

    // State
    isLoading,
    error,
    retryCount,

    // Lifecycle
    clearError,
    reset,
  };
}

export default useProductionQuality;
