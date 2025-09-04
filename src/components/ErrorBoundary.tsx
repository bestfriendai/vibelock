import React, { Component, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 items-center justify-center px-6 bg-surface-900">
          <View className="items-center">
            <View className="w-20 h-20 bg-brand-red/20 rounded-full items-center justify-center mb-6">
              <Ionicons name="warning" size={32} color="#FFFFFF" />
            </View>
            
            <Text className="text-text-primary text-xl font-bold mb-2 text-center">
              Something went wrong
            </Text>
            
            <Text className="text-text-secondary text-center mb-8 leading-6">
              We encountered an unexpected error. Please try again or restart the app.
            </Text>

            <View className="space-y-3 w-full max-w-xs">
              <Pressable
                className="bg-brand-red rounded-xl py-4 items-center"
                onPress={this.handleRetry}
              >
                <Text className="text-black font-semibold text-lg">
                  Try Again
                </Text>
              </Pressable>

              <Pressable
                className="bg-surface-800 border border-surface-700 rounded-xl py-4 items-center"
                onPress={() => {
                  // In a real app, this could restart the app or navigate to home
                  this.handleRetry();
                }}
              >
                <Text className="text-text-primary font-medium">
                  Go to Home
                </Text>
              </Pressable>
            </View>

            {__DEV__ && this.state.error && (
              <View className="mt-8 p-4 bg-surface-800 rounded-xl w-full">
                <Text className="text-text-secondary text-xs font-mono">
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