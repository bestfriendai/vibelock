import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from "react-native-reanimated";

interface OfflineBannerProps {
  onRetry?: () => void;
}

export default function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setIsConnected(connected);

      if (!connected && !showBanner) {
        setShowBanner(true);
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
      } else if (connected && showBanner) {
        translateY.value = withSpring(-100);
        opacity.value = withTiming(0);
        setTimeout(() => setShowBanner(false), 300);
      }
    });

    return unsubscribe;
  }, [showBanner, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    // Check connection again
    NetInfo.fetch().then(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      if (connected) {
        translateY.value = withSpring(-100);
        opacity.value = withTiming(0);
        setTimeout(() => setShowBanner(false), 300);
      }
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
        <Text className="text-white font-medium ml-2 flex-1">
          No internet connection
        </Text>
      </View>
      
      {onRetry && (
        <Pressable
          onPress={handleRetry}
          className="bg-white/20 rounded-lg px-3 py-1 ml-3"
        >
          <Text className="text-white font-medium text-sm">Retry</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
