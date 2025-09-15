import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, AppState, AppStateStatus } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import { errorReportingService } from "../services/errorReporting";
import { compatibilityChecker } from "../utils/compatibilityUtils";
import { AppError, ErrorType, parseSupabaseError } from "../utils/errorHandling";

interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
  error?: string;
  warning?: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRecovery?: () => void;
  theme?: { colors: ThemeColors };
  enableAutoRecovery?: boolean;
  maxRecoveryAttempts?: number;
  showDetailedErrors?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetCount: number;
  errorType: ErrorClassification;
  recoveryAttempts: number;
  isRecovering: boolean;
  canRecover: boolean;
  lastErrorTime: number;
  appState: AppStateStatus;
  errorContext: ErrorContext;
}

// Enhanced error classification for RN 0.81.4 + Expo 54
type ErrorClassification =
  | "initialization"
  | "compatibility"
  | "component_registration"
  | "view_config"
  | "network"
  | "memory"
  | "native_module"
  | "permission"
  | "filesystem"
  | "general";

interface ErrorContext {
  phase: string;
  services: string[];
  compatibility: any;
  memoryUsage?: any;
  platform: string;
  isInitialized: boolean;
}

// React Native 0.81.4 specific error patterns
const RN_0814_ERROR_PATTERNS = {
  hermes: /hermes|jsi|turbomodule/i,
  newArchitecture: /fabric|turbomodule|codegen/i,
  viewConfig: /view config|register|component.*not found/i,
  nativeModule: /native module|could not find|nativemodule/i,
  memory: /out of memory|memory warning|heap/i,
  permission: /permission|denied|unauthorized/i,
  network: /network|connection|timeout|fetch/i,
  initialization: /initialization|startup|bootstrap/i,
  compatibility: /compatibility|version|deprecated/i,
};

class ErrorBoundaryClass extends Component<Props, State> {
  private recoveryTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private errorReportingEnabled = false;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: 0,
      errorType: "general",
      recoveryAttempts: 0,
      isRecovering: false,
      canRecover: true,
      lastErrorTime: 0,
      appState: AppState.currentState,
      errorContext: {
        phase: "unknown",
        services: [],
        compatibility: {},
        platform: "unknown",
        isInitialized: false,
      },
    };

    // Check if error reporting is available
    this.errorReportingEnabled = errorReportingService.isInitialized
  }

  override componentDidMount() {
    // Listen for app state changes for auto-recovery
    this.appStateSubscription = AppState.addEventListener("change", this.handleAppStateChange);
  }

  override componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    this.appStateSubscription?.remove();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const now = Date.now();
    const errorClassification = ErrorBoundaryClass.classifyError(error);
    const errorContext = ErrorBoundaryClass.gatherErrorContext(error);
    const canRecover = ErrorBoundaryClass.assessRecoverability(error, errorClassification);

    return {
      hasError: true,
      error,
      errorType: errorClassification,
      lastErrorTime: now,
      canRecover,
      errorContext,
    };
  }

  /**
   * Classify error type for better handling
   */
  static classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message || error.toString();
    const errorName = error.name || "";

    // Check for React Native 0.81.4 specific patterns
    if (RN_0814_ERROR_PATTERNS.initialization.test(errorMessage)) return "initialization";
    if (RN_0814_ERROR_PATTERNS.compatibility.test(errorMessage)) return "compatibility";
    if (RN_0814_ERROR_PATTERNS.hermes.test(errorMessage)) return "compatibility";
    if (RN_0814_ERROR_PATTERNS.newArchitecture.test(errorMessage)) return "compatibility";
    if (RN_0814_ERROR_PATTERNS.viewConfig.test(errorMessage)) return "view_config";
    if (RN_0814_ERROR_PATTERNS.nativeModule.test(errorMessage)) return "native_module";
    if (RN_0814_ERROR_PATTERNS.memory.test(errorMessage)) return "memory";
    if (RN_0814_ERROR_PATTERNS.permission.test(errorMessage)) return "permission";
    if (RN_0814_ERROR_PATTERNS.network.test(errorMessage)) return "network";

    // Check for specific error types
    if (error instanceof AppError) {
      switch (error.type) {
        case ErrorType.INITIALIZATION:
          return "initialization";
        case ErrorType.COMPATIBILITY:
          return "compatibility";
        case ErrorType.NETWORK:
          return "network";
        case ErrorType.PERMISSION:
          return "permission";
        default:
          return "general";
      }
    }

    // Legacy classification
    if (errorMessage.includes("View config") || errorMessage.includes("AutoLayout")) {
      return "view_config";
    }

    if (errorMessage.includes("component") && errorMessage.includes("not found")) {
      return "component_registration";
    }

    return "general";
  }

  /**
   * Gather error context for better diagnostics
   */
  static gatherErrorContext(error: Error): ErrorContext {
    try {
      const compatibility = compatibilityChecker.checkCompatibility();

      return {
        phase: "runtime",
        services: [],
        compatibility: {
          isCompatible: compatibility.isCompatible,
          issues: compatibility.issues.map((i) => i.id),
          platform: compatibility.version.platform,
        },
        platform: compatibility.version.platform,
        isInitialized: true,
      };
    } catch (contextError) {
      console.warn("Failed to gather error context:", contextError);
      return {
        phase: "unknown",
        services: [],
        compatibility: {},
        platform: "unknown",
        isInitialized: false,
      };
    }
  }

  /**
   * Assess if error is recoverable
   */
  static assessRecoverability(error: Error, errorType: ErrorClassification): boolean {
    // Some error types are more recoverable than others
    switch (errorType) {
      case "network":
      case "permission":
      case "view_config":
        return true;

      case "memory":
      case "native_module":
      case "compatibility":
        return false;

      case "initialization":
        // Initialization errors might be recoverable depending on the specific error
        return !error.message.includes("critical");

      default:
        return true;
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Enhanced logging for development
    if (__DEV__) {
      this.logDevelopmentError(error, errorInfo);
    }

    // Report error to error reporting service
    this.reportError(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Attempt auto-recovery if enabled
    if (this.props.enableAutoRecovery && this.state.canRecover) {
      this.attemptAutoRecovery();
    }
  }

  /**
   * Enhanced development logging
   */
  private logDevelopmentError(error: Error, errorInfo: React.ErrorInfo) {
    console.group("🚨 ErrorBoundary caught an error");
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.log("Error Classification:", this.state.errorType);
    console.log("Error Context:", this.state.errorContext);
    console.log("Recoverable:", this.state.canRecover);

    // Provide specific guidance based on error type
    switch (this.state.errorType) {
      case "compatibility":
        console.warn("💡 Compatibility issue detected. Check React Native 0.81.4 + Expo 54 compatibility.");
        break;
      case "view_config":
        console.warn("💡 View config error detected. Check component registration and native dependencies.");
        break;
      case "native_module":
        console.warn("💡 Native module error detected. Verify module installation and linking.");
        break;
      case "initialization":
        console.warn("💡 Initialization error detected. Check app startup sequence and service dependencies.");
        break;
      case "memory":
        console.warn("💡 Memory error detected. Check for memory leaks and optimize performance.");
        break;
      case "network":
        console.warn("💡 Network error detected. Check connectivity and API endpoints.");
        break;
    }

    console.groupEnd();
  }

  /**
   * Report error to error reporting service
   */
  private async reportError(error: Error, errorInfo: React.ErrorInfo) {
    if (!this.errorReportingEnabled) return;

    try {
      const enhancedError = {
        ...error,
        context: {
          errorBoundary: true,
          errorType: this.state.errorType,
          recoverable: this.state.canRecover,
          resetCount: this.state.resetCount,
          ...this.state.errorContext,
        },
        componentStack: errorInfo.componentStack,
      };

      await errorReportingService.reportError(enhancedError as Error, "error_boundary");
    } catch (reportingError) {
      console.warn("Failed to report error:", reportingError);
    }
  }

  /**
   * Handle app state changes for recovery
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.setState({ appState: nextAppState });

    // Attempt recovery when app becomes active
    if (nextAppState === "active" && this.state.hasError && this.state.canRecover) {
      console.log("App became active, attempting recovery");
      this.attemptRecovery();
    }
  };

  /**
   * Attempt automatic recovery
   */
  private attemptAutoRecovery() {
    if (this.state.recoveryAttempts >= (this.props.maxRecoveryAttempts || 3)) {
      console.log("Max recovery attempts reached");
      return;
    }

    // Delay recovery based on error type
    const delay = this.getRecoveryDelay();

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, delay);
  }

  /**
   * Get recovery delay based on error type
   */
  private getRecoveryDelay(): number {
    switch (this.state.errorType) {
      case "network":
        return 2000; // Quick retry for network errors
      case "view_config":
        return 1000; // Quick retry for view config errors
      case "initialization":
        return 5000; // Longer delay for initialization errors
      default:
        return 3000;
    }
  }

  /**
   * Manual recovery attempt
   */
  private attemptRecovery = () => {
    if (this.state.isRecovering) return;

    this.setState({
      isRecovering: true,
      recoveryAttempts: this.state.recoveryAttempts + 1,
    });

    // Perform recovery actions based on error type
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        resetCount: this.state.resetCount + 1,
        isRecovering: false,
      });

      // Notify parent of recovery
      this.props.onRecovery?.();
    }, 1000);
  };

  /**
   * Show diagnostic information
   */
  private showDiagnostics = () => {
    const diagnosticInfo = compatibilityChecker.getDiagnosticInfo();
    const errorDetails = {
      error: {
        message: this.state.error?.message,
        name: this.state.error?.name,
        stack: this.state.error?.stack,
      },
      errorType: this.state.errorType,
      context: this.state.errorContext,
      diagnostics: diagnosticInfo,
      recovery: {
        attempts: this.state.recoveryAttempts,
        canRecover: this.state.canRecover,
      },
    };

    Alert.alert("Error Diagnostics", JSON.stringify(errorDetails, null, 2), [{ text: "OK" }]);
  };

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(): { title: string; message: string; actionText: string } {
    const baseMessages = {
      initialization: {
        title: "App Startup Error",
        message: "The app failed to start properly. This might be due to a configuration issue or missing service.",
        actionText: "Restart App",
      },
      compatibility: {
        title: "Compatibility Issue",
        message: "There's a compatibility issue with your device or OS version. Some features may not work correctly.",
        actionText: "Continue Anyway",
      },
      view_config: {
        title: "Component Error",
        message: "A component failed to load. This usually resolves automatically.",
        actionText: "Retry",
      },
      native_module: {
        title: "Module Error",
        message: "A native module failed to load. Try restarting the app.",
        actionText: "Restart",
      },
      network: {
        title: "Connection Error",
        message: "Unable to connect to services. Check your internet connection.",
        actionText: "Retry",
      },
      memory: {
        title: "Memory Error",
        message: "The app is using too much memory. Try closing other apps.",
        actionText: "Restart",
      },
      permission: {
        title: "Permission Error",
        message: "The app needs certain permissions to work properly.",
        actionText: "Grant Permissions",
      },
      general: {
        title: "Something went wrong",
        message: "We encountered an unexpected error. Please try again.",
        actionText: "Try Again",
      },
    };

    return baseMessages[this.state.errorType] || baseMessages.general;
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const theme = this.props.theme || {
        colors: {
          background: "#000",
          surface: "#1a1a1a",
          primary: "#ff6b6b",
          error: "#ff4757",
          warning: "#ffa502",
          text: "#fff",
          textSecondary: "#999",
        },
      };

      const errorMessage = this.getErrorMessage();
      const maxAttempts = this.props.maxRecoveryAttempts || 3;

      return (
        <ScrollView
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Error Icon */}
            <View
              style={[styles.iconContainer, { backgroundColor: (theme.colors.error || theme.colors.primary) + "20" }]}
            >
              <Ionicons
                name={
                  this.state.errorType === "network"
                    ? "wifi-outline"
                    : this.state.errorType === "memory"
                      ? "hardware-chip-outline"
                      : "warning-outline"
                }
                size={32}
                color={theme.colors.error || theme.colors.primary}
              />
            </View>

            {/* Error Title and Message */}
            <Text style={[styles.title, { color: theme.colors.text }]}>{errorMessage.title}</Text>

            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{errorMessage.message}</Text>

            {/* Recovery Status */}
            {this.state.isRecovering && (
              <View style={[styles.recoveryContainer, { backgroundColor: theme.colors.warning + "20" }]}>
                <Text style={[styles.recoveryText, { color: theme.colors.warning }]}>Attempting recovery...</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {this.state.canRecover && this.state.recoveryAttempts < maxAttempts && (
                <Pressable
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={this.attemptRecovery}
                  disabled={this.state.isRecovering}
                >
                  <Text style={styles.buttonText}>
                    {this.state.isRecovering ? "Recovering..." : errorMessage.actionText}
                  </Text>
                </Pressable>
              )}

              {__DEV__ && (
                <Pressable
                  style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary }]}
                  onPress={this.showDiagnostics}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.primary }]}>View Diagnostics</Text>
                </Pressable>
              )}
            </View>

            {/* Recovery Attempts Counter */}
            {this.state.recoveryAttempts > 0 && (
              <Text style={[styles.attemptsText, { color: theme.colors.textSecondary }]}>
                Recovery attempts: {this.state.recoveryAttempts}/{maxAttempts}
              </Text>
            )}

            {/* Development Error Details */}
            {(this.props.showDetailedErrors || __DEV__) && this.state.error && (
              <View style={[styles.errorDetails, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.errorDetailsTitle, { color: theme.colors.text }]}>Error Details</Text>
                <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                    {this.state.error.stack}
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      );
    }

    return React.createElement(React.Fragment, { key: this.state.resetCount }, this.props.children);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    fontSize: 16,
  },
  recoveryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
  },
  recoveryText: {
    fontWeight: "600",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  attemptsText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: "center",
  },
  errorDetails: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    width: "100%",
  },
  errorDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 16,
  },
});

// Enhanced wrapper component with better theme handling
export default function ErrorBoundary(props: Omit<Props, "theme">) {
  let themeObject: { colors: ThemeColors } | undefined;

  try {
    const theme = useTheme();

    if (theme && typeof theme === "object") {
      const themeValue = (theme as any).theme;
      if (themeValue && typeof themeValue === "object" && themeValue.colors) {
        themeObject = { colors: themeValue.colors };
      } else if ((theme as any).colors) {
        themeObject = { colors: (theme as any).colors };
      }
    }
  } catch (error) {
    console.log("ErrorBoundary: Using default theme");
  }

  // Default theme with enhanced colors for RN 0.81.4
  if (!themeObject) {
    themeObject = {
      colors: {
        background: "#000",
        surface: "#1a1a1a",
        primary: "#007AFF",
        error: "#FF3B30",
        warning: "#FF9500",
        text: "#fff",
        textSecondary: "#8E8E93",
      },
    };
  }

  return (
    <ErrorBoundaryClass
      {...props}
      theme={themeObject}
      enableAutoRecovery={props.enableAutoRecovery ?? true}
      maxRecoveryAttempts={props.maxRecoveryAttempts ?? 3}
      showDetailedErrors={props.showDetailedErrors ?? __DEV__}
    />
  );
}
