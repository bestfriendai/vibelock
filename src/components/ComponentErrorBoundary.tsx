import React, { Component, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  showRetry?: boolean;
  onError?: (error: Error, errorInfo: any) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 m-2">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-brand-red/20 rounded-full items-center justify-center mr-3">
              <Ionicons name="warning" size={16} color="#EF4444" />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-medium text-sm">Component Error</Text>
              <Text className="text-text-secondary text-xs">{this.props.componentName} failed to load</Text>
            </View>
          </View>

          {this.props.showRetry !== false && (
            <Pressable className="bg-surface-700 rounded-lg py-2 px-3 items-center" onPress={this.handleRetry}>
              <Text className="text-text-primary text-sm font-medium">Retry</Text>
            </Pressable>
          )}

          {__DEV__ && this.state.error && (
            <View className="mt-3 p-2 bg-surface-900 rounded-lg">
              <Text className="text-text-secondary text-xs font-mono" numberOfLines={3}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
