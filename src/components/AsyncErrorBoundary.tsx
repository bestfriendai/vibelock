import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  onRetry?: () => Promise<void>;
  retryText?: string;
  errorTitle?: string;
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

export default class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error("AsyncErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = async () => {
    if (this.props.onRetry) {
      this.setState({ isRetrying: true });
      try {
        await this.props.onRetry();
        this.setState({ hasError: false, error: null, isRetrying: false });
      } catch (error) {
        console.error("Retry failed:", error);
        this.setState({
          hasError: true,
          error: error instanceof Error ? error : new Error("Retry failed"),
          isRetrying: false,
        });
      }
    } else {
      this.setState({ hasError: false, error: null, isRetrying: false });
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center px-6 bg-surface-900/50">
          <View className="items-center bg-surface-800 rounded-xl p-6 w-full max-w-sm">
            <View className="w-16 h-16 bg-brand-red/20 rounded-full items-center justify-center mb-4">
              <Ionicons name="cloud-offline" size={24} color="#EF4444" />
            </View>

            <Text className="text-text-primary text-lg font-bold mb-2 text-center">
              {this.props.errorTitle || "Connection Error"}
            </Text>

            <Text className="text-text-secondary text-center mb-6 leading-5">
              {this.props.errorMessage ||
                "Something went wrong while loading data. Please check your connection and try again."}
            </Text>

            <Pressable
              className={`rounded-xl py-3 px-6 items-center w-full ${
                this.state.isRetrying ? "bg-surface-700" : "bg-brand-red"
              }`}
              onPress={this.handleRetry}
              disabled={this.state.isRetrying}
            >
              {this.state.isRetrying ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-semibold ml-2">Retrying...</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold">{this.props.retryText || "Try Again"}</Text>
              )}
            </Pressable>

            {__DEV__ && this.state.error && (
              <View className="mt-4 p-3 bg-surface-900 rounded-lg w-full">
                <Text className="text-text-secondary text-xs font-mono" numberOfLines={4}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
