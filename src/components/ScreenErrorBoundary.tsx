import React, { Component, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Props {
  children: ReactNode;
  screenName: string;
  fallbackAction?: () => void;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// HOC to provide navigation to class component
const withNavigation = (WrappedComponent: any) => {
  return (props: any) => {
    const navigation = useNavigation();
    return <WrappedComponent {...props} navigation={navigation} />;
  };
};

class ScreenErrorBoundaryComponent extends Component<Props & { navigation: any }, State> {
  constructor(props: Props & { navigation: any }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
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

  handleCustomAction = () => {
    if (this.props.fallbackAction) {
      this.props.fallbackAction();
    } else {
      this.handleGoHome();
    }
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-surface-900">
          <View className="flex-1 items-center justify-center px-6">
            <View className="items-center">
              <View className="w-20 h-20 bg-brand-red/20 rounded-full items-center justify-center mb-6">
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>

              <Text className="text-text-primary text-xl font-bold mb-2 text-center">
                {this.props.screenName} Error
              </Text>

              <Text className="text-text-secondary text-center mb-8 leading-6">
                Something went wrong while loading this screen. You can try again or go back to the home screen.
              </Text>

              <View className="space-y-3 w-full max-w-xs">
                <Pressable className="bg-brand-red rounded-xl py-4 items-center" onPress={this.handleRetry}>
                  <Text className="text-white font-semibold text-lg">Try Again</Text>
                </Pressable>

                <Pressable
                  className="bg-surface-800 border border-surface-700 rounded-xl py-4 items-center"
                  onPress={this.handleGoHome}
                >
                  <Text className="text-text-primary font-medium">Go to Home</Text>
                </Pressable>

                {this.props.fallbackAction && (
                  <Pressable
                    className="bg-surface-800 border border-surface-700 rounded-xl py-4 items-center"
                    onPress={this.handleCustomAction}
                  >
                    <Text className="text-text-primary font-medium">Alternative Action</Text>
                  </Pressable>
                )}
              </View>

              {__DEV__ && this.state.error && (
                <View className="mt-8 p-4 bg-surface-800 rounded-xl w-full max-h-32">
                  <Text className="text-text-secondary text-xs font-mono" numberOfLines={6}>
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

const ScreenErrorBoundary = withNavigation(ScreenErrorBoundaryComponent);

export default ScreenErrorBoundary;
