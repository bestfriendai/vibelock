import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";

interface OfflineBannerProps {
  onRetry?: () => void;
}

export default function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideBanner = () => {
    setShowBanner(false);
  };

  const updateConnectionState = (connected: boolean, source: string) => {
    console.log(`📶 OfflineBanner: Connection state update from ${source}:`, {
      connected,
      currentlyConnected: isConnected,
      currentlyShowingBanner: showBanner,
      isInitialized,
    });

    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Debounce network state changes to prevent flicker
    debounceTimeoutRef.current = setTimeout(() => {
      setIsConnected(connected);

      // Clear any existing timeout when connection state changes
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // Only show banner if we're initialized and actually disconnected
      if (!connected && !showBanner && isInitialized) {
        console.log(`📶 OfflineBanner: Showing offline banner`);
        setShowBanner(true);
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
      } else if (connected && showBanner) {
        console.log(`📶 OfflineBanner: Hiding offline banner`);
        translateY.value = withSpring(-100);
        opacity.value = withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(hideBanner)();
          }
        });
      }

      debounceTimeoutRef.current = null;
    }, 500); // 500ms debounce to prevent flicker
  };

  useEffect(() => {
    let isMounted = true;

    // Check initial network state
    NetInfo.fetch()
      .then((state) => {
        if (!isMounted) return;

        const isConnected = Boolean(state.isConnected);
        const hasInternetAccess =
          state.isInternetReachable === true || (state.isInternetReachable === null && isConnected);
        const connected = isConnected && hasInternetAccess;

        console.log(`📶 OfflineBanner: Initial network state:`, {
          isConnected,
          isInternetReachable: state.isInternetReachable,
          connected,
          type: state.type,
          details: state.details,
        });

        updateConnectionState(connected, "initial");
        setIsInitialized(true);
      })
      .catch((error) => {
        console.warn(`📶 OfflineBanner: Failed to fetch initial network state:`, error);
        // Assume connected on error to avoid false positives
        if (isMounted) {
          updateConnectionState(true, "initial-error");
          setIsInitialized(true);
        }
      });

    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isMounted) return;

      // Improved network detection logic - consistent with chatStore
      const isConnected = Boolean(state.isConnected);
      const hasInternetAccess =
        state.isInternetReachable === true || (state.isInternetReachable === null && isConnected);
      const connected = isConnected && hasInternetAccess;

      console.log(`📶 OfflineBanner: Network state changed:`, {
        isConnected,
        isInternetReachable: state.isInternetReachable,
        connected,
        type: state.type,
        details: state.details,
      });

      updateConnectionState(connected, "listener");
    });

    return () => {
      isMounted = false;
      unsubscribe();

      // Clean up any pending timeouts on unmount
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [isInitialized]); // Remove showBanner dependency to prevent re-initialization

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const handleRetry = () => {
    console.log(`📶 OfflineBanner: Retry button pressed`);

    if (onRetry) {
      onRetry();
    }

    // Force re-check connection state
    NetInfo.fetch()
      .then((state) => {
        const isConnected = Boolean(state.isConnected);
        const hasInternetAccess =
          state.isInternetReachable === true || (state.isInternetReachable === null && isConnected);
        const connected = isConnected && hasInternetAccess;

        console.log(`📶 OfflineBanner: Retry network check result:`, {
          isConnected,
          isInternetReachable: state.isInternetReachable,
          connected,
          type: state.type,
        });

        updateConnectionState(connected, "retry");
      })
      .catch((error) => {
        console.warn(`📶 OfflineBanner: Retry network check failed:`, error);
      });
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute top-0 left-0 right-0 z-50 bg-red-600 px-4 py-3 flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1">
        <Ionicons name="cloud-offline-outline" size={20} color="white" />
        <Text className="text-white font-medium ml-2 flex-1">No internet connection</Text>
      </View>

      {onRetry && (
        <Pressable onPress={handleRetry} className="bg-white/20 rounded-lg px-3 py-1 ml-3">
          <Text className="text-white font-medium text-sm">Retry</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
