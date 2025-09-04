import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  Easing
} from "react-native-reanimated";

interface Props {
  size?: "small" | "medium" | "large";
  color?: string;
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = "medium", 
  color = "#FF6B6B", 
  text,
  className = ""
}: Props) {
  const rotation = useSharedValue(0);

  const sizeMap = {
    small: 20,
    medium: 32,
    large: 48
  };

  const spinnerSize = sizeMap[size];

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className={`items-center justify-center ${className}`}>
      <Animated.View style={[animatedStyle]}>
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
      
      {text && (
        <Text className="text-text-secondary text-sm mt-3 font-medium">
          {text}
        </Text>
      )}
    </View>
  );
}