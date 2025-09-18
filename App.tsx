import React, { useEffect, useState, useCallback, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppState, View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, AppStateStatus } from "react-native";
import * as Linking from "expo-linking";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import OfflineBanner from "./src/components/OfflineBanner";
import useAuthStore from "./src/state/authStore";
import useChatStore from "./src/state/chatStore";
import useSubscriptionStore from "./src/state/subscriptionStore";
import { notificationService } from "./src/services/notificationService";
import { enhancedRealtimeChatService } from "./src/services/realtimeChat";
import { adMobService } from "./src/services/adMobService";
import { initializationService } from "./src/services/initializationService";
import { AdProvider } from "./src/contexts/AdContext";
import { ThemeProvider } from "./src/providers/ThemeProvider";
import AppOpenAdHandler from "./src/components/AppOpenAdHandler";
import { useAppInitialization } from "./src/hooks/useAppInitialization";
import { compatibilityChecker, PerformanceMonitor } from "./src/utils/compatibilityUtils";
import { Ionicons } from "@expo/vector-icons";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

// Enhanced deep linking configuration with React Native 0.81.4 optimizations
const linking = {
  prefixes: [Linking.createURL("/"), "locker-room-talk://", "https://lockerroom.app", "http://lockerroom.app"],
  config: {
    initialRouteName: "MainTabs" as const,
    screens: {
      MainTabs: {
        path: "main",
        screens: {
          BrowseStack: {
            screens: {
              Browse: "browse",
              ReviewDetail: "review/:reviewId",
            },
          },
          SearchStack: {
            screens: {
              Search: "search",
              ReviewDetail: "search/review/:reviewId",
            },
          },
          ChatroomsStack: {
            screens: {
              Chatrooms: "chatrooms",
            },
          },
          SettingsStack: {
            screens: {
              Settings: "settings",
              Notifications: "notifications",
              DeleteAccount: "delete-account",
              LocationSettings: "location-settings",
            },
          },
        },
      },
      PersonProfile: "profile/:firstName/:city/:state",
      ChatRoom: "chat/:roomId",
      CreateReview: "create",
      SignIn: "signin",
      SignUp: "signup",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",
      Onboarding: "onboarding",
      AuthTest: "auth-test",
    },
  },
};

// Enhanced initialization progress component
const InitializationProgress: React.FC<{
  progress: number;
  phase: string;
  services: Map<string, any>;
  warnings: string[];
  degradedMode: boolean;
  metrics: any;
}> = ({ progress, phase, services, warnings, degradedMode, metrics }) => {
  const getPhaseDisplayName = (phase: string): string => {
    const phaseNames: Record<string, string> = {
      starting: "Starting App",
      compatibility_check: "Checking Compatibility",
      splash_screen_setup: "Setting Up Display",
      font_loading: "Loading Fonts",
      service_initialization: "Starting Services",
      completed: "Ready!",
      degraded_mode: "Limited Mode",
      error: "Error Occurred",
      retrying: "Retrying...",
    };
    return phaseNames[phase] || phase;
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return "✅";
      case "initializing":
        return "⏳";
      case "failed":
        return "❌";
      case "degraded":
        return "⚠️";
      default:
        return "⏸️";
    }
  };

  return (
    <View style={styles.initContainer}>
      <View style={styles.initContent}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <Ionicons name="chatbubbles" size={64} color="#007AFF" />
        </View>

        {/* App Title */}
        <Text style={styles.appTitle}>Locker Room Talk</Text>

        {/* Phase Display */}
        <Text style={styles.phaseText}>{getPhaseDisplayName(phase)}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* Loading Indicator */}
        {!degradedMode && progress < 100 && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

        {/* Degraded Mode Warning */}
        {degradedMode && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={24} color="#FF9500" />
            <Text style={styles.warningText}>Running in limited mode</Text>
          </View>
        )}

        {/* Service Status (Development) */}
        {__DEV__ && services.size > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.servicesTitle}>Services:</Text>
            {Array.from(services.entries()).map(([name, status]) => (
              <View key={name} style={styles.serviceItem}>
                <Text style={styles.serviceIcon}>{getServiceStatusIcon(status)}</Text>
                <Text style={styles.serviceName}>{name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Performance Metrics (Development) */}
        {__DEV__ && metrics.totalTime > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Performance:</Text>
            <Text style={styles.metricsText}>Total: {metrics.totalTime}ms</Text>
            <Text style={styles.metricsText}>Fonts: {metrics.fontLoadTime}ms</Text>
            <Text style={styles.metricsText}>Services: {metrics.serviceInitTime}ms</Text>
          </View>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <Text style={styles.warningsTitle}>Warnings:</Text>
            {warnings.slice(0, 3).map((warning, index) => (
              <Text key={index} style={styles.warningItem}>
                • {warning}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// Enhanced error display component
const InitializationError: React.FC<{
  error: Error;
  canRetry: boolean;
  retryAttempts: number;
  maxRetryAttempts: number;
  compatibility: any;
  onRetry: () => void;
  onShowDetails: () => void;
}> = ({ error, canRetry, retryAttempts, maxRetryAttempts, compatibility, onRetry, onShowDetails }) => {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        {/* Error Icon */}
        <View style={styles.errorIconContainer}>
          <Ionicons name="warning" size={48} color="#FF3B30" />
        </View>

        {/* Error Title */}
        <Text style={styles.errorTitle}>Startup Failed</Text>

        {/* Error Message */}
        <Text style={styles.errorMessage}>
          The app failed to start properly. This might be due to a configuration issue or network problem.
        </Text>

        {/* Compatibility Issues */}
        {!compatibility.isCompatible && (
          <View style={styles.compatibilityContainer}>
            <Text style={styles.compatibilityTitle}>Compatibility Issues:</Text>
            {compatibility.issues.slice(0, 2).map((issue: any, index: number) => (
              <Text key={index} style={styles.compatibilityIssue}>
                • {issue.description}
              </Text>
            ))}
          </View>
        )}

        {/* Retry Button */}
        {canRetry && (
          <Pressable
            style={[styles.retryButton, { opacity: retryAttempts >= maxRetryAttempts ? 0.5 : 1 }]}
            onPress={onRetry}
            disabled={retryAttempts >= maxRetryAttempts}
          >
            <Text style={styles.retryButtonText}>
              Retry ({retryAttempts}/{maxRetryAttempts})
            </Text>
          </Pressable>
        )}

        {/* Details Button */}
        {__DEV__ && (
          <Pressable style={styles.detailsButton} onPress={onShowDetails}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </Pressable>
        )}

        {/* Technical Details */}
        <Text style={styles.technicalDetails}>{error.message}</Text>
      </View>
    </View>
  );
};

export default function App() {
  const { initializeAuthListener } = useAuthStore();
  const { cleanup: cleanupChat } = useChatStore();
  const { initializeRevenueCat, identifyRevenueCatUser } = useSubscriptionStore();

  // Enhanced initialization with detailed progress tracking
  const {
    isLoading,
    error,
    isInitialized,
    progress,
    phase,
    services,
    warnings,
    degradedMode,
    metrics,
    compatibility,
    retry,
    canRetry,
    retryAttempts,
    maxRetryAttempts,
  } = useAppInitialization();

  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const initializationCompleteRef = useRef(false);

  // Enhanced service initialization with better error handling
  const initializeOptionalServices = useCallback(async () => {
    if (initializationCompleteRef.current) return;
    initializationCompleteRef.current = true;

    PerformanceMonitor?.startMeasurement?.("optional_services_init");

    try {
      // Initialize services that depend on app being ready
      const services = [
        { name: "AdMob", init: () => adMobService.initialize() },
        { name: "RevenueCat", init: () => initializeRevenueCat() },
      ];

      const results = await Promise.allSettled(
        services.map(async (service) => {
          try {
            await service.init();
            console.log(`✅ ${service.name} initialized successfully`);
          } catch (error) {
            console.warn(`⚠️ ${service.name} initialization failed:`, error);
            throw error;
          }
        }),
      );

      const failedServices = results
        .map((result, index) => ({ result, name: services[index]?.name }))
        .filter(({ result, name }) => result.status === "rejected" && name)
        .map(({ name }) => name);

      if (failedServices.length > 0) {
        console.warn(`Some optional services failed: ${failedServices.join(", ")}`);
      }
    } catch (error) {
      console.error("Optional services initialization error:", error);
      // Don't throw here as these are optional services
    } finally {
      PerformanceMonitor?.endMeasurement?.("optional_services_init");
    }
  }, [initializeRevenueCat]);

  // Enhanced app state management with React Native 0.81.4 compatibility
  useEffect(() => {
    const unsubscribeAuth = initializeAuthListener();

    // Enhanced app state change handler
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log(`App state changed: ${previousAppState} → ${nextAppState}`);

      if (nextAppState === "active" && previousAppState !== "active" && isInitialized) {
        // App became active - refresh critical services
        console.log("App became active, refreshing services");
        // Could trigger service health checks here
      }

      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("App backgrounded - pausing non-critical operations");
      }
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      unsubscribeAuth?.();
      appStateSubscription?.remove();
    };
  }, [initializeAuthListener, isInitialized]);

  // Initialize optional services when app is ready
  useEffect(() => {
    if (isInitialized && !degradedMode && isNavigationReady) {
      initializeOptionalServices();
    }
  }, [isInitialized, degradedMode, isNavigationReady, initializeOptionalServices]);

  // Enhanced RevenueCat user identification with better error handling
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id && isInitialized) {
        console.log("👤 User authenticated, identifying RevenueCat user");
        try {
          identifyRevenueCatUser(state.user.id);
        } catch (error) {
          console.warn("Failed to identify RevenueCat user:", error);
          // Don't throw here as this is not critical
        }
      }
    });

    return unsubscribe;
  }, [identifyRevenueCatUser, isInitialized]);

  // Enhanced cleanup with comprehensive service shutdown
  useEffect(() => {
    return () => {
      console.log("🧹 App cleanup initiated");

      Promise.allSettled([
        cleanupChat(),
        notificationService.cleanup(),
        enhancedRealtimeChatService.cleanup(),
        initializationService.cleanup(),
      ]).then((results) => {
        const failedCleanups = results
          .map((result, index) => ({ result, service: ["chat", "notifications", "realtime", "initialization"][index] }))
          .filter(({ result }) => result.status === "rejected")
          .map(({ service }) => service);

        if (failedCleanups.length > 0) {
          console.warn(`Cleanup failed for: ${failedCleanups.join(", ")}`);
        }

        console.log("🧹 App cleanup completed");
      });
    };
  }, [cleanupChat]);

  // Show detailed error information in development
  const showErrorDetails = useCallback(() => {
    if (!__DEV__) return;

    const diagnosticInfo = compatibilityChecker.getDiagnosticInfo();
    const errorDetails = {
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      phase,
      services: Object.fromEntries(services),
      warnings,
      compatibility,
      metrics,
      diagnostics: diagnosticInfo,
    };

    console.group("🔍 Detailed Error Information");
    console.log("Error Details:", errorDetails);
    console.groupEnd();

    // Could show an alert or modal with this information
  }, [error, phase, services, warnings, compatibility, metrics]);

  // Enhanced loading state with progress tracking
  if (isLoading) {
    return (
      <ErrorBoundary
        enableAutoRecovery={true}
        maxRecoveryAttempts={3}
        onError={(error, errorInfo) => {
          console.error("Initialization ErrorBoundary caught error:", error, errorInfo);
        }}
        onRecovery={() => {
          console.log("Initialization ErrorBoundary recovered");
        }}
      >
        <InitializationProgress
          progress={progress}
          phase={phase}
          services={services}
          warnings={warnings}
          degradedMode={degradedMode}
          metrics={metrics}
        />
      </ErrorBoundary>
    );
  }

  // Enhanced error state with recovery options
  if (error) {
    return (
      <ErrorBoundary enableAutoRecovery={false} showDetailedErrors={true}>
        <InitializationError
          error={error}
          canRetry={canRetry}
          retryAttempts={retryAttempts}
          maxRetryAttempts={maxRetryAttempts}
          compatibility={compatibility}
          onRetry={retry}
          onShowDetails={showErrorDetails}
        />
      </ErrorBoundary>
    );
  }

  // Enhanced main app render with better error boundaries
  return (
    <ErrorBoundary
      enableAutoRecovery={true}
      maxRecoveryAttempts={5}
      onError={(error, errorInfo) => {
        console.error("Main ErrorBoundary caught error:", error, errorInfo);
      }}
      onRecovery={() => {
        console.log("Main ErrorBoundary recovered");
      }}
    >
      <GestureHandlerRootView style={styles.rootView}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AdProvider>
              <NavigationContainer
                linking={linking}
                onReady={() => {
                  console.log("📱 Navigation ready");
                  setIsNavigationReady(true);
                  PerformanceMonitor?.endMeasurement?.("app_startup");
                }}
                onStateChange={(state) => {
                  // Enhanced navigation state tracking
                  if (__DEV__) {
                    console.log("Navigation state changed:", state);
                  }
                }}
                fallback={
                  <View style={styles.fallbackContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.fallbackText}>Loading Navigation...</Text>
                  </View>
                }
              >
                <AppNavigator />
                <OfflineBanner />
                {!degradedMode && <AppOpenAdHandler />}
              </NavigationContainer>
            </AdProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Enhanced styles for React Native 0.81.4
const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  initContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  initContent: {
    alignItems: "center",
    padding: 40,
    maxWidth: 400,
    width: "100%",
  },
  logoContainer: {
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  phaseText: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 32,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#1C1C1E",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  loader: {
    marginVertical: 24,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C1810",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    color: "#FF9500",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  servicesContainer: {
    marginTop: 24,
    width: "100%",
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  serviceIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  serviceName: {
    fontSize: 14,
    color: "#8E8E93",
  },
  metricsContainer: {
    marginTop: 16,
    width: "100%",
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  metricsText: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 2,
  },
  warningsContainer: {
    marginTop: 16,
    width: "100%",
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF9500",
    marginBottom: 4,
  },
  warningItem: {
    fontSize: 12,
    color: "#FF9500",
    marginBottom: 2,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContent: {
    alignItems: "center",
    padding: 40,
    maxWidth: 400,
    width: "100%",
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  compatibilityContainer: {
    backgroundColor: "#2C1C1C",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
  },
  compatibilityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
  },
  compatibilityIssue: {
    fontSize: 12,
    color: "#FF3B30",
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  detailsButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 24,
    width: "100%",
  },
  detailsButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  technicalDetails: {
    fontSize: 12,
    color: "#48484A",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  fallbackText: {
    color: "#8E8E93",
    marginTop: 16,
    fontSize: 16,
  },
});
