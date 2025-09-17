import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider";
import type { RootStackNavigationProp } from "../navigation/AppNavigator";

interface Props {
  children: ReactNode;
  screenName: string;
  fallbackAction?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export function useScreenErrorBoundary(screenName: string) {
  const navigation = useNavigation<RootStackNavigationProp>();

  const handleError = (error: Error) => {
    console.warn(`Error in ${screenName}:`, error);
    navigation.navigate("MainTabs");
  };

  return { handleError };
}

class ScreenErrorBoundaryComponent extends Component<Props & { navigation: any; theme: any }, State> {
  constructor(props: Props & { navigation: any; theme: any }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn(`ScreenErrorBoundary caught error in ${this.props.screenName}:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.props.navigation.navigate("MainTabs", { screen: "Browse" });
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      const { theme } = this.props;

      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
          <View style={styles.container}>
            <View style={styles.content}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + "33" }]}>
                <Ionicons name="warning" size={32} color={theme.colors.primary} />
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>{this.props.screenName} Error</Text>

              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                Something went wrong while loading this screen. You can try again or go back to the home screen.
              </Text>

              <View style={styles.buttonContainer}>
                <Pressable
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={this.handleRetry}
                >
                  <Text style={styles.buttonText}>Try Again</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={this.handleGoHome}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Go to Home</Text>
                </Pressable>
              </View>

              {__DEV__ && this.state.error && (
                <View style={[styles.errorDetails, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.errorText, { color: theme.colors.textSecondary }]} numberOfLines={6}>
                    {this.state.error.toString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 320,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: "500",
    fontSize: 16,
  },
  errorDetails: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    width: "100%",
    maxHeight: 128,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
});

export default function ScreenErrorBoundary(props: Props) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const themeObject = { colors };
  return <ScreenErrorBoundaryComponent {...props} navigation={navigation} theme={themeObject} />;
}
