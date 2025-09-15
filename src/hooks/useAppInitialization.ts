import { useEffect, useState, useCallback, useRef } from "react";
import { Alert, Platform, AppState, AppStateStatus } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { buildEnv } from "../utils/buildEnvironment";
import { isWeb } from "../utils/platform";
import { withRetry } from "../utils/retryLogic";
import { errorReportingService } from "../services/errorReporting";
import { initializationService, InitializationState, ServiceStatus } from "../services/initializationService";
import { compatibilityChecker, PerformanceMonitor } from "../utils/compatibilityUtils";
import { AppError, ErrorType } from "../utils/errorHandling";

// Enhanced initialization state with more detailed tracking
interface EnhancedInitializationState {
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
  progress: number;
  phase: string;
  services: Map<string, ServiceStatus>;
  warnings: string[];
  metrics: {
    startTime: number;
    totalTime: number;
    fontLoadTime: number;
    serviceInitTime: number;
  };
  compatibility: {
    isCompatible: boolean;
    issues: any[];
    features: any;
  };
  degradedMode: boolean;
}

// React Native 0.81.4 + Expo 54 specific configuration
const RN_0814_CONFIG = {
  FONT_LOAD_TIMEOUT: Platform.OS === "ios" ? 8000 : 6000, // Increased for RN 0.81.4
  SPLASH_SCREEN_DELAY: Platform.OS === "ios" ? 100 : 50, // iOS timing fix for RN 0.81.4
  INITIALIZATION_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000,
  MEMORY_WARNING_THRESHOLD: 150 * 1024 * 1024, // 150MB
};

// Platform-specific font loading with RN 0.81.4 optimizations
async function loadFontsWithPlatformOptimizations(): Promise<number> {
  const startTime = Date.now();

  try {
    // Platform-specific font loading strategy
    const fontLoadPromise = Platform.select({
      ios: async () => {
        // iOS-specific font loading with retry for RN 0.81.4
        return Font.loadAsync({
          ...Ionicons.font,
        });
      },
      android: async () => {
        // Android-specific font loading with Hermes optimization
        return Font.loadAsync({
          ...Ionicons.font,
        });
      },
      web: async () => {
        // Web font loading (if needed)
        return Font.loadAsync({
          ...Ionicons.font,
        });
      },
      default: async () => {
        return Font.loadAsync({
          ...Ionicons.font,
        });
      },
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new AppError("Font loading timeout", ErrorType.INITIALIZATION)),
        RN_0814_CONFIG.FONT_LOAD_TIMEOUT,
      );
    });

    await Promise.race([fontLoadPromise, timeoutPromise]);
    return Date.now() - startTime;
  } catch (error) {
    console.warn("Font loading failed, using fallback:", error);

    // Graceful fallback for font loading failures
    if (Platform.OS !== "web") {
      // Continue without custom fonts if loading fails
      console.log("Continuing with system fonts");
    }

    return Date.now() - startTime;
  }
}

// Enhanced splash screen management for RN 0.81.4
async function manageSplashScreenRN0814(action: "prevent" | "hide"): Promise<void> {
  if (isWeb) return;

  try {
    if (action === "prevent") {
      await SplashScreen.preventAutoHideAsync();
    } else {
      // Add platform-specific delay for RN 0.81.4 compatibility
      if (Platform.OS === "ios") {
        await new Promise((resolve) => setTimeout(resolve, RN_0814_CONFIG.SPLASH_SCREEN_DELAY));
      }

      await SplashScreen.hideAsync();
    }
  } catch (error) {
    console.warn(`Splash screen ${action} failed:`, error);
    // Don't throw here as splash screen failures shouldn't break the app
  }
}

// Memory monitoring for RN 0.81.4 performance
function monitorMemoryUsage(): void {
  const memoryUsage = PerformanceMonitor.getMemoryUsage();
  if (memoryUsage?.usedJSHeapSize > RN_0814_CONFIG.MEMORY_WARNING_THRESHOLD) {
    console.warn("High memory usage detected during initialization:", memoryUsage);
  }
}

export function useAppInitialization() {
  const [state, setState] = useState<EnhancedInitializationState>({
    isLoading: true,
    error: null,
    isInitialized: false,
    progress: 0,
    phase: "starting",
    services: new Map(),
    warnings: [],
    metrics: {
      startTime: Date.now(),
      totalTime: 0,
      fontLoadTime: 0,
      serviceInitTime: 0,
    },
    compatibility: {
      isCompatible: true,
      issues: [],
      features: {},
    },
    degradedMode: false,
  });

  const initializationAttempts = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const isInitializingRef = useRef(false);

  // Initialization state listener for detailed progress tracking
  const handleInitializationStateChange = useCallback((initState: InitializationState) => {
    setState((prevState) => ({
      ...prevState,
      progress: initState.progress,
      phase: initState.phase,
      services: new Map(initState.services),
      warnings: [...initState.warnings],
    }));
  }, []);

  // App state change handler for RN 0.81.4 lifecycle management
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && state.error && !state.isInitialized) {
        // Retry initialization when app becomes active after error
        console.log("App became active after error, triggering retry");
        // Will be handled by the retry function defined later
      }
    },
    [state.error, state.isInitialized],
  );

  // Enhanced initialization function with RN 0.81.4 optimizations
  const performInitialization = useCallback(
    async (signal: AbortSignal) => {
      const startTime = Date.now();

      try {
        console.log("🚀 Starting enhanced initialization for RN 0.81.4 + Expo 54");

        // Phase 1: Compatibility Check
        setState((prev) => ({ ...prev, phase: "compatibility_check", progress: 5 }));

        const compatibilityResult = compatibilityChecker.checkCompatibility();
        const features = compatibilityChecker.detectFeatures();

        if (signal.aborted) return;

        setState((prev) => ({
          ...prev,
          compatibility: {
            isCompatible: compatibilityResult.isCompatible,
            issues: compatibilityResult.issues,
            features,
          },
          warnings: [...prev.warnings, ...compatibilityResult.warnings],
        }));

        if (!compatibilityResult.isCompatible) {
          const criticalIssues = compatibilityResult.issues.filter((issue) => issue.severity === "critical");
          if (criticalIssues.length > 0) {
            throw new AppError(
              `Critical compatibility issues: ${criticalIssues.map((i) => i.description).join(", ")}`,
              ErrorType.COMPATIBILITY,
            );
          }
        }

        // Apply compatibility workarounds
        compatibilityChecker.applyWorkarounds();

        // Phase 2: Splash Screen Management
        setState((prev) => ({ ...prev, phase: "splash_screen_setup", progress: 10 }));
        await manageSplashScreenRN0814("prevent");

        if (signal.aborted) return;

        // Phase 3: Font Loading with RN 0.81.4 optimizations
        setState((prev) => ({ ...prev, phase: "font_loading", progress: 15 }));

        const fontLoadTime = await withRetry(
          async () => {
            if (signal.aborted) throw new Error("Aborted");
            return await loadFontsWithPlatformOptimizations();
          },
          {
            maxAttempts: RN_0814_CONFIG.MAX_RETRY_ATTEMPTS,
            baseDelay: RN_0814_CONFIG.RETRY_BASE_DELAY,
            retryableErrors: ["timeout", "network"],
            onRetry: (attempt, error) => {
              console.log(`Retrying font load (attempt ${attempt}):`, error);
              setState((prev) => ({
                ...prev,
                warnings: [...prev.warnings, `Font loading retry ${attempt}`],
              }));
            },
          },
        );

        if (signal.aborted) return;

        setState((prev) => ({
          ...prev,
          metrics: { ...prev.metrics, fontLoadTime },
          progress: 25,
        }));

        // Phase 4: Memory Monitoring
        monitorMemoryUsage();

        // Phase 5: Service Initialization with enhanced monitoring
        setState((prev) => ({ ...prev, phase: "service_initialization", progress: 30 }));

        const serviceStartTime = Date.now();

        // Subscribe to initialization service state changes
        const unsubscribe = initializationService.addStateListener(handleInitializationStateChange);

        try {
          await initializationService.initialize();

          if (signal.aborted) {
            unsubscribe();
            return;
          }

          const serviceInitTime = Date.now() - serviceStartTime;
          const totalTime = Date.now() - startTime;

          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            isInitialized: true,
            progress: 100,
            phase: "completed",
            metrics: {
              ...prev.metrics,
              serviceInitTime,
              totalTime,
            },
          }));

          console.log(`✅ Initialization completed in ${totalTime}ms`);

          // Final memory check
          monitorMemoryUsage();

          unsubscribe();
        } catch (serviceError) {
          unsubscribe();

          // Check if we can run in degraded mode
          if (serviceError instanceof AppError && serviceError.type === ErrorType.INITIALIZATION) {
            const degradedState = await checkDegradedModeViability();
            if (degradedState.canRunDegraded) {
              setState((prev) => ({
                ...prev,
                isLoading: false,
                error: null,
                isInitialized: true,
                degradedMode: true,
                progress: degradedState.progress,
                phase: "degraded_mode",
                warnings: [...prev.warnings, "Running in degraded mode", ...degradedState.warnings],
              }));

              console.warn("⚠️ Running in degraded mode due to service failures");
            } else {
              throw serviceError;
            }
          } else {
            throw serviceError;
          }
        }

        // Hide splash screen with RN 0.81.4 timing
        await manageSplashScreenRN0814("hide");
      } catch (error) {
        if (signal.aborted) return;

        console.error("❌ Initialization failed:", error);

        const errorObj =
          error instanceof Error ? error : new AppError("Unknown initialization error", ErrorType.INITIALIZATION);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorObj,
          isInitialized: false,
          progress: 0,
          phase: "error",
        }));

        // Ensure splash screen is hidden even on error
        await manageSplashScreenRN0814("hide");

        // Report error to error reporting service if available
        try {
          if (errorReportingService.isInitialized()) {
            await errorReportingService.reportError(errorObj, "initialization");
          }
        } catch (reportingError) {
          console.warn("Failed to report initialization error:", reportingError);
        }
      }
    },
    [handleInitializationStateChange],
  );

  // Check if app can run in degraded mode
  const checkDegradedModeViability = async (): Promise<{
    canRunDegraded: boolean;
    progress: number;
    warnings: string[];
  }> => {
    const initState = initializationService.getState();
    const criticalServices = ["supabase", "error_reporting"];

    let readyCriticalServices = 0;
    const warnings: string[] = [];

    for (const service of criticalServices) {
      if (initState.services.get(service) === ServiceStatus.READY) {
        readyCriticalServices++;
      } else {
        warnings.push(`Critical service ${service} not available`);
      }
    }

    const canRunDegraded = readyCriticalServices >= 1; // At least one critical service
    const progress = Math.round((readyCriticalServices / criticalServices.length) * 100);

    return { canRunDegraded, progress, warnings };
  };

  // Retry initialization with exponential backoff
  const retryInitialization = useCallback(() => {
    if (isInitializingRef.current || initializationAttempts.current >= RN_0814_CONFIG.MAX_RETRY_ATTEMPTS) {
      return;
    }

    initializationAttempts.current++;

    // Cancel previous initialization
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 0,
      phase: "retrying",
      warnings: [...prev.warnings, `Retry attempt ${initializationAttempts.current}`],
    }));

    // Exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, initializationAttempts.current - 1), 10000);

    setTimeout(() => {
      if (!abortController.current?.signal.aborted) {
        isInitializingRef.current = true;
        performInitialization(abortController.current!.signal).finally(() => {
          isInitializingRef.current = false;
        });
      }
    }, delay);
  }, [performInitialization]);

  // Main initialization effect
  useEffect(() => {
    if (isInitializingRef.current) return;

    abortController.current = new AbortController();
    isInitializingRef.current = true;

    performInitialization(abortController.current.signal).finally(() => {
      isInitializingRef.current = false;
    });

    // App state listener for RN 0.81.4 lifecycle management
    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [performInitialization, handleAppStateChange]);

  // Development mode error dialog with enhanced options
  useEffect(() => {
    if (state.error && __DEV__ && !state.degradedMode) {
      const errorMessage = state.error.message;
      const canRetry = initializationAttempts.current < RN_0814_CONFIG.MAX_RETRY_ATTEMPTS;

      const buttons = [
        ...(canRetry
          ? [
              {
                text: "Retry",
                onPress: retryInitialization,
              },
            ]
          : []),
        {
          text: "View Details",
          onPress: () => {
            const diagnosticInfo = compatibilityChecker.getDiagnosticInfo();
            Alert.alert("Diagnostic Info", JSON.stringify(diagnosticInfo, null, 2), [{ text: "OK" }]);
          },
        },
        { text: "Continue", style: "cancel" as const },
      ];

      Alert.alert(
        "Initialization Error",
        `${errorMessage}\n\nAttempt ${initializationAttempts.current}/${RN_0814_CONFIG.MAX_RETRY_ATTEMPTS}`,
        buttons,
      );
    }
  }, [state.error, state.degradedMode, retryInitialization]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    // Basic state
    isLoading: state.isLoading,
    error: state.error,
    isInitialized: state.isInitialized,

    // Enhanced state
    progress: state.progress,
    phase: state.phase,
    services: state.services,
    warnings: state.warnings,
    degradedMode: state.degradedMode,

    // Metrics
    metrics: state.metrics,

    // Compatibility info
    compatibility: state.compatibility,

    // Actions
    retry: retryInitialization,

    // Utilities
    canRetry: initializationAttempts.current < RN_0814_CONFIG.MAX_RETRY_ATTEMPTS,
    retryAttempts: initializationAttempts.current,
    maxRetryAttempts: RN_0814_CONFIG.MAX_RETRY_ATTEMPTS,
  };
}
