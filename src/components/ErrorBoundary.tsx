import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  theme?: { colors: ThemeColors };
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetCount: number;
  errorType: "general" | "component_registration" | "view_config" | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, resetCount: 0, errorType: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorMessage = error.message || error.toString();
    let errorType: State['errorType'] = "general";

    if (errorMessage.includes("View config") || errorMessage.includes("AutoLayout")) {
      errorType = "view_config";
    } else if (errorMessage.includes("component") && errorMessage.includes("not found")) {
      errorType = "component_registration";
    }

    return { hasError: true, error, errorType };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.warn("ErrorBoundary caught an error:", error, errorInfo);

      if (this.state.errorType === "view_config") {
        console.warn("View config error detected. Check React Native architecture compatibility.");
      }

      if (this.state.errorType === "component_registration") {
        console.warn("Component registration error detected. Check for missing native dependencies.");
      }
    }
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      resetCount: this.state.resetCount + 1,
      errorType: null,
    });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const theme = this.props.theme || {
        colors: {
          background: '#000',
          surface: '#1a1a1a',
          primary: '#ff0000',
          text: '#fff',
          textSecondary: '#999',
        },
      };

      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '33' }]}>
              <Ionicons name="warning" size={32} color={theme.colors.text} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              {this.state.errorType === "view_config" ? "Component Error" : "Something went wrong"}
            </Text>

            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              {this.state.errorType === "view_config"
                ? "A component failed to load. This may resolve automatically."
                : this.state.errorType === "component_registration"
                  ? "A component registration error occurred. Try restarting the app."
                  : "We encountered an unexpected error. Please try again."}
            </Text>

            <View style={styles.buttonContainer}>
              <Pressable style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={this.handleRetry}>
                <Text style={styles.buttonText}>Try Again</Text>
              </Pressable>
            </View>

            {__DEV__ && this.state.error && (
              <View style={[styles.errorDetails, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return React.createElement(
      React.Fragment,
      { key: this.state.resetCount },
      this.props.children,
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 18,
  },
  errorDetails: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default function ErrorBoundary(props: Omit<Props, 'theme'>) {
  // Try to use theme from context, but provide a fallback
  let themeObject: { colors: ThemeColors } | undefined;

  try {
    const theme = useTheme();
    // Extract colors from the theme
    if (theme && typeof theme === 'object') {
      const themeValue = (theme as any).theme;
      if (themeValue && typeof themeValue === 'object' && themeValue.colors) {
        themeObject = { colors: themeValue.colors };
      } else if ((theme as any).colors) {
        themeObject = { colors: (theme as any).colors };
      }
    }
  } catch (error) {
    // If useTheme fails (e.g., not in ThemeProvider), use default theme
    console.log('ErrorBoundary: Using default theme as ThemeProvider not available');
  }

  // If no theme available, use default
  if (!themeObject) {
    themeObject = {
      colors: {
        background: '#000',
        surface: '#1a1a1a',
        primary: '#ff0000',
        text: '#fff',
        textSecondary: '#999',
      }
    };
  }

  return <ErrorBoundaryClass {...props} theme={themeObject} />;
}