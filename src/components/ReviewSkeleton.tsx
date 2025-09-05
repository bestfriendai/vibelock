import React, { useEffect } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

const ShimmerView = ({ className, style }: { className?: string; style?: any }) => {
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerTranslate.value, [-1, 1], [-100, 100]);

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View className={`bg-surface-700 rounded overflow-hidden ${className || ""}`} style={style}>
      <Animated.View style={[animatedStyle, { width: "100%", height: "100%" }]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.1)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

export default function ReviewSkeleton() {
  return (
    <View className="bg-surface-800 rounded-2xl p-6 mb-6 border border-border">
      {/* Header skeleton */}
      <View className="flex-row items-center mb-4">
        <ShimmerView className="rounded-full mr-3" style={{ width: 40, height: 40 }} />
        <View className="flex-1">
          <ShimmerView className="mb-2" style={{ width: 96, height: 16 }} />
          <ShimmerView style={{ width: 64, height: 12 }} />
        </View>
        <ShimmerView style={{ width: 32, height: 16 }} />
      </View>

      {/* Flags skeleton */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        <ShimmerView className="rounded-full" style={{ width: 80, height: 24 }} />
        <ShimmerView className="rounded-full" style={{ width: 64, height: 24 }} />
        <ShimmerView className="rounded-full" style={{ width: 96, height: 24 }} />
      </View>

      {/* Text skeleton */}
      <View className="mb-4">
        <ShimmerView className="mb-2" style={{ width: "100%", height: 16 }} />
        <ShimmerView className="mb-2" style={{ width: "100%", height: 16 }} />
        <ShimmerView style={{ width: "75%", height: 16 }} />
      </View>

      {/* Media skeleton */}
      <View className="flex-row space-x-2 mb-4">
        <ShimmerView className="rounded-xl" style={{ width: 80, height: 80 }} />
        <ShimmerView className="rounded-xl" style={{ width: 80, height: 80 }} />
        <ShimmerView className="rounded-xl" style={{ width: 80, height: 80 }} />
      </View>

      {/* Footer skeleton */}
      <View className="flex-row items-center justify-between pt-4 border-t border-border">
        <View className="flex-row space-x-4">
          <ShimmerView style={{ width: 48, height: 16 }} />
          <ShimmerView style={{ width: 48, height: 16 }} />
        </View>
        <ShimmerView style={{ width: 24, height: 16 }} />
      </View>
    </View>
  );
}
