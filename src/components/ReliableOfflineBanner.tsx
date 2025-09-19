import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { createReliableNetworkMonitor, reliableNetworkCheck, NetworkCheckResult } from "../utils/reliableNetworkCheck";

interface ReliableOfflineBannerProps {
  onRetry?: () => void;
  useReliableCheck?: boolean;
}

export default function ReliableOfflineBanner({ onRetry, useReliableCheck = true }: ReliableOfflineBannerProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<NetworkCheckResult | null>(null);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const hideBanner = () => {
    setShowBanner(false);
  };

  const handleNetworkStateChange = (isOnline: boolean, details: NetworkCheckResult) => {
    console.log(`📶 ReliableOfflineBanner: Network state changed:`, {
      isOnline,
      method: details.method,
      details: details.details
    });

    setLastCheckResult(details);
    setIsConnected(isOnline);

    if (!isOnline && !showBanner) {
      console.log(`📶 ReliableOfflineBanner: Showing offline banner (method: ${details.method})`);
      setShowBanner(true);
      translateY.value = withSpring(0);
      opacity.value = withTiming(1);
    } else if (isOnline && showBanner) {
      console.log(`📶 ReliableOfflineBanner: Hiding offline banner (method: ${details.method})`);
      translateY.value = withSpring(-100);
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(hideBanner)();
        }
      });
    }
  };

  useEffect(() => {
    // Initial check
    reliableNetworkCheck().then((result) => {
      handleNetworkStateChange(result.isOnline, result);
    });

    // Set up monitoring
    const cleanup = createReliableNetworkMonitor(
      handleNetworkStateChange,
      {
        useReliableCheck,
        checkInterval: useReliableCheck ? 30000 : 0, // Check every 30s if using reliable method
        debounceMs: 1000 // 1 second debounce
      }
    );

    cleanupRef.current = cleanup;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [useReliableCheck]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const handleRetry = async () => {
    console.log(`📶 ReliableOfflineBanner: Retry button pressed`);
    
    if (onRetry) {
      onRetry();
    }
    
    // Force a reliable network check
    try {
      const result = await reliableNetworkCheck();
      console.log(`📶 ReliableOfflineBanner: Retry check result:`, result);
      handleNetworkStateChange(result.isOnline, result);
    } catch (error) {
      console.warn(`📶 ReliableOfflineBanner: Retry check failed:`, error);
    }
  };

  if (!showBanner) {
    return null;
  }

  const getMethodColor = () => {
    if (!lastCheckResult) return "bg-red-600";
    
    switch (lastCheckResult.method) {
      case 'fetch':
        return "bg-red-700"; // Fetch-based detection (more reliable)
      case 'netinfo':
        return "bg-red-500"; // NetInfo-based detection
      case 'combined':
        return "bg-red-600"; // Combined detection
      default:
        return "bg-red-600";
    }
  };

  const getMethodText = () => {
    if (!lastCheckResult) return "No internet connection";
    
    const baseText = "No internet connection";
    if (useReliableCheck) {
      return `${baseText} (${lastCheckResult.method})`;
    }
    return baseText;
  };

  return (
    <Animated.View
      style={[animatedStyle]}
      className={`absolute top-0 left-0 right-0 z-50 ${getMethodColor()} px-4 py-3 flex-row items-center justify-between`}
    >
      <View className="flex-row items-center flex-1">
        <Ionicons name="cloud-offline-outline" size={20} color="white" />
        <View className="ml-2 flex-1">
          <Text className="text-white font-medium">{getMethodText()}</Text>
          {lastCheckResult && useReliableCheck && (
            <Text className="text-white/70 text-xs">
              Method: {lastCheckResult.method} | 
              {lastCheckResult.details.fetch && ` Fetch: ${lastCheckResult.details.fetch.responseTime}ms`}
              {lastCheckResult.details.netinfo && ` NetInfo: ${lastCheckResult.details.netinfo.type}`}
            </Text>
          )}
        </View>
      </View>

      <Pressable onPress={handleRetry} className="bg-white/20 rounded-lg px-3 py-1 ml-3">
        <Text className="text-white font-medium text-sm">Retry</Text>
      </Pressable>
    </Animated.View>
  );
}
