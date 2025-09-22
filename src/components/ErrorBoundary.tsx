import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, AppState, AppStateStatus } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import * as Sentry from "@sentry/react-native";
import { errorReportingService } from "../services/errorReporting";
import { compatibilityChecker } from "../utils/compatibilityUtils";
import { AppError, ErrorType } from "../utils/errorHandling";

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
  phase: "unknown" | "runtime";
  services: string[];
  compatibility: {
    isCompatible: boolean;
    issues: string[];
    platform: string;
  };
  platform: string;
  isInitialized: boolean;
}

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
        compatibility: {
          isCompatible: true,
          issues: [],
          platform: "unknown",
        },
        platform: "unknown",
        isInitialized: false,
      },
    };

    this.errorReportingEnabled = errorReportingService.isInitialized();
  }

  override componentDidMount() {
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

  static classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message || error.toString();

    if (RN_0814_ERROR_PATTERNS.initialization.test(errorMessage)) return "initialization";
    if (RN_0814_ERROR_PATTERNS.compatibility.test(errorMessage)) return "compatibility";
    if (RN_0814_ERROR_PATTERNS.hermes.test(errorMessage)) return "compatibility";
    if (RN_0814_ERROR_PATTERNS.newArchitecture.test(errorMessage)) return "compatibility";
    if (RN_0814_ERROR_PATTERNS.viewConfig.test(errorMessage)) return "view_config";
    if (RN_0814_ERROR_PATTERNS.nativeModule.test(errorMessage)) return "native_module";
    if (RN_0814_ERROR_PATTERNS.memory.test(errorMessage)) return "memory";
    if (RN_0814_ERROR_PATTERNS.permission.test(errorMessage)) return "permission";
    if (RN_0814_ERROR_PATTERNS.network.test(errorMessage)) return "network";
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
    if (errorMessage.includes("View config") || errorMessage.includes("AutoLayout")) {
      return "view_config";
    }
    if (errorMessage.includes("component") && errorMessage.includes("not found")) {
      return "component_registration";
    }
    return "general";
  }

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
      return {
        phase: "unknown",
        services: [],
        compatibility: {
          isCompatible: true,
          issues: [],
          platform: "unknown",
        },
        platform: "unknown",
        isInitialized: false,
      };
    }
  }

  static assessRecoverability(error: Error, errorType: ErrorClassification): boolean {
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
        return !error.message.includes("critical");
      default:
        return true;
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    this.setState({ errorInfo });
    if (__DEV__) {
      this.logDevelopmentError(error, errorInfo);
    }

    this.reportError(error, errorInfo);
    this.props.onError?.(error, errorInfo);

    if (this.props.enableAutoRecovery && this.state.canRecover) {
      this.attemptAutoRecovery();
    }
  }

  private logDevelopmentError(error: Error, errorInfo: React.ErrorInfo) {
    console.group("🚨 ErrorBoundary caught an error");
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    switch (this.state.errorType) {
      case "compatibility":
        break;
      case "view_config":
        break;
      case "native_module":
        break;
      case "initialization":
        break;
      case "memory":
        break;
      case "network":
        break;
    }
    console.groupEnd();
  }

  private async reportError(error: Error, errorInfo: React.ErrorInfo) {
    if (!this.errorReportingEnabled) return;

    try {
      await errorReportingService.reportError(error, {
        context: "error_boundary",
        errorBoundary: true,
        errorType: this.state.errorType,
        recoverable: this.state.canRecover,
        resetCount: this.state.resetCount,
        ...this.state.errorContext,
        componentStack: errorInfo.componentStack,
      });
    } catch (reportingError) {}
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.setState({ appState: nextAppState });

    if (nextAppState === "active" && this.state.hasError && this.state.canRecover) {
      this.attemptRecovery();
    }
  };

  private attemptAutoRecovery() {
    if (this.state.recoveryAttempts >= (this.props.maxRecoveryAttempts || 3)) {
      return;
    }

    const delay = this.getRecoveryDelay();

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, delay);
  }

  private getRecoveryDelay(): number {
    switch (this.state.errorType) {
      case "network":
        return 2000;
      case "view_config":
        return 1000;
      case "initialization":
        return 5000;
      default:
        return 3000;
    }
  }

  private attemptRecovery = () => {
    if (this.state.isRecovering) return;

    this.setState({
      isRecovering: true,
      recoveryAttempts: this.state.recoveryAttempts + 1,
    });

    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        resetCount: this.state.resetCount + 1,
        isRecovering: false,
      });

      this.props.onRecovery?.();
    }, 1000);
  };

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
      component_registration: {
        title: "Component Registration Error",
        message: "A component failed to register properly. This usually resolves with a restart.",
        actionText: "Restart",
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
      filesystem: {
        title: "File System Error",
        message: "There was an issue accessing the file system. Try restarting the app.",
        actionText: "Restart",
      },
      general: {
        title: "Something went wrong",
        message: "We encountered an unexpected error. Please try again.",
        actionText: "Try Again",
      },
    };

    return baseMessages[this.state.errorType as keyof typeof baseMessages] || baseMessages.general;
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

            <Text style={[styles.title, { color: theme.colors.text }]}>{errorMessage.title}</Text>

            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{errorMessage.message}</Text>

            {this.state.isRecovering && (
              <View style={[styles.recoveryContainer, { backgroundColor: theme.colors.warning + "20" }]}>
                <Text style={[styles.recoveryText, { color: theme.colors.warning }]}>Attempting recovery...</Text>
              </View>
            )}

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

            {this.state.recoveryAttempts > 0 && (
              <Text style={[styles.attemptsText, { color: theme.colors.textSecondary }]}>
                Recovery attempts: {this.state.recoveryAttempts}/{maxAttempts}
              </Text>
            )}

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
  } catch {}

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
