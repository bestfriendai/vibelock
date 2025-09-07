import React, { useEffect, useState } from "react";
import { View, Text, AccessibilityInfo } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";

interface Props {
  size?: "small" | "medium" | "large";
  color?: string;
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ size = "medium", color = "#FFFFFF", text, className = "" }: Props) {
  const rotation = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const sizeMap = {
    small: 20,
    medium: 32,
    large: 48,
  };

  const spinnerSize = sizeMap[size];

  useEffect(() => {
    // Check for reduced motion preference
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    if (!reduceMotion) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      className={`items-center justify-center ${className}`}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={text || "Loading"}
    >
      <Animated.View style={[reduceMotion ? {} : animatedStyle]}>
        <View
          className="rounded-full border-2 border-transparent"
          style={{
            width: spinnerSize,
            height: spinnerSize,
            borderTopColor: color,
            borderRightColor: `${color}40`,
            borderBottomColor: `${color}20`,
            borderLeftColor: `${color}60`,
          }}
        />
      </Animated.View>

      {text && <Text className="text-text-secondary text-sm mt-3 font-medium">{text}</Text>}
    </View>
  );
}
