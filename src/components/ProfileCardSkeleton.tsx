import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 48) / 2;

interface Props {
  cardHeight?: number;
}

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
    <View className={`bg-surface-600 rounded overflow-hidden ${className || ""}`} style={style}>
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

export default function ProfileCardSkeleton({ cardHeight = 280 }: Props) {
  return (
    <View className="bg-surface-800 rounded-2xl mb-4 overflow-hidden" style={{ width: cardWidth, height: cardHeight }}>
      {/* Image skeleton with shimmer */}
      <View className="flex-1 bg-surface-700 relative">
        <ShimmerView style={{ width: "100%", height: "100%" }} />
      </View>

      {/* Gradient overlay skeleton */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)"]}
        className="absolute bottom-0 left-0 right-0"
        style={{ height: cardHeight * 0.6 }}
      />

      {/* Button skeletons with shimmer */}
      <View className="absolute top-3 right-3">
        <ShimmerView className="rounded-full" style={{ width: 32, height: 32 }} />
      </View>
      <View className="absolute top-3 left-3">
        <ShimmerView className="rounded-full" style={{ width: 32, height: 32 }} />
      </View>

      {/* Content skeleton with shimmer */}
      <View className="absolute bottom-0 left-0 right-0 p-4">
        <View className="mb-2">
          <ShimmerView className="mb-2" style={{ width: "75%", height: 20 }} />
        </View>
        <View className="mb-1">
          <ShimmerView className="mb-1" style={{ width: "100%", height: 12 }} />
        </View>
        <View className="mb-3">
          <ShimmerView style={{ width: "85%", height: 12 }} />
        </View>

        {/* Flag skeletons with shimmer */}
        <View className="flex-row gap-1">
          <ShimmerView className="rounded-full" style={{ width: 64, height: 20 }} />
          <ShimmerView className="rounded-full" style={{ width: 48, height: 20 }} />
        </View>
      </View>
    </View>
  );
}
