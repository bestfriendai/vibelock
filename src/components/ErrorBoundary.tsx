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
  resetCount: number;
  isResetting: boolean;
  errorType: 'general' | 'component_registration' | 'view_config' | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, resetCount: 0, isResetting: false, errorType: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Detect specific error types
    const errorMessage = error.message || error.toString();
    let errorType: 'general' | 'component_registration' | 'view_config' = 'general';
    
    if (errorMessage.includes('View config not found') || errorMessage.includes('AutoLayoutView')) {
      errorType = 'view_config';
    } else if (errorMessage.includes('component') && errorMessage.includes('not found')) {
      errorType = 'component_registration';
    }
    
    return { hasError: true, error, errorType };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    // Enhanced logging for component registration errors
    if (__DEV__) {
      console.warn("ErrorBoundary caught an error:", error, errorInfo);
      
      // Special handling for view config errors
      if (this.state.errorType === 'view_config') {
        console.warn('View config error detected. This is likely due to React Native new architecture compatibility issues.');
        console.warn('Consider disabling newArchEnabled in app.json or updating incompatible dependencies.');
      }
      
      if (this.state.errorType === 'component_registration') {
        console.warn('Component registration error detected. Check for missing or incompatible native dependencies.');
      }
    }
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    // First set resetting state to prevent immediate re-render
    this.setState({ isResetting: true }, () => {
      // Longer delay for component registration errors to allow recovery
      const delay = this.state.errorType === 'view_config' || this.state.errorType === 'component_registration' ? 500 : 100;
      
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          resetCount: this.state.resetCount + 1,
          isResetting: false,
          errorType: null,
        });
      }, delay);
    });
  };

  override render() {
    if (this.state.isResetting) {
      // Return null while resetting to prevent flickering
      return null;
    }

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
              {this.state.errorType === 'view_config' ? 'Component Error' : 'Something went wrong'}
            </Text>

            <Text className="text-text-secondary text-center mb-8 leading-6">
              {this.state.errorType === 'view_config' 
                ? 'A component failed to load due to compatibility issues. This may resolve automatically.'
                : this.state.errorType === 'component_registration'
                ? 'A component registration error occurred. Try restarting the app.'
                : 'We encountered an unexpected error. Please try again or restart the app.'}
            </Text>

            <View className="space-y-3 w-full max-w-xs">
              <Pressable className="bg-brand-red rounded-xl py-4 items-center" onPress={this.handleRetry}>
                <Text className="text-black font-semibold text-lg">Try Again</Text>
              </Pressable>

              <Pressable
                className="bg-surface-800 border border-surface-700 rounded-xl py-4 items-center"
                onPress={() => {
                  // In a real app, this could restart the app or navigate to home
                  this.handleRetry();
                }}
              >
                <Text className="text-text-primary font-medium">Go to Home</Text>
              </Pressable>
            </View>

            {__DEV__ && this.state.error && (
              <View className="mt-8 p-4 bg-surface-800 rounded-xl w-full">
                <Text className="text-text-secondary text-xs font-mono">{this.state.error.toString()}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Use resetCount as key to force remount of children when retrying
    if (React.Children.count(this.props.children) === 1) {
      return React.cloneElement(this.props.children as React.ReactElement, {
        key: this.state.resetCount,
      });
    }

    // Handle multiple children
    return React.createElement(
      React.Fragment,
      { key: this.state.resetCount },
      ...React.Children.toArray(this.props.children),
    );
  }
}
