import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { cn } from "../utils/cn";

interface ProgressIndicatorProps {
  steps: number;
  currentStep: number;
  className?: string;
  activeColor?: string;
  inactiveColor?: string;
}

export default function ProgressIndicator({
  steps,
  currentStep,
  className,
  activeColor = "#FFFFFF",
  inactiveColor = "#2A2A2F",
}: ProgressIndicatorProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(currentStep / (steps - 1), {
      damping: 15,
      stiffness: 200,
    });
  }, [currentStep, steps]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <View className={cn("space-y-4", className)}>
      {/* Progress Bar */}
      <View className="h-1 bg-surface-700 rounded-full overflow-hidden">
        <Animated.View style={[progressBarStyle, { backgroundColor: activeColor, height: "100%", borderRadius: 9999 }]} />
      </View>

      {/* Step Indicators */}
      <View className="flex-row justify-between">
        {Array.from({ length: steps }).map((_, index) => (
          <StepIndicator
            key={index}
            isActive={index <= currentStep}
            isCompleted={index < currentStep}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
        ))}
      </View>
    </View>
  );
}

interface StepIndicatorProps {
  isActive: boolean;
  isCompleted: boolean;
  activeColor: string;
  inactiveColor: string;
}

function StepIndicator({ isActive, isCompleted, activeColor, inactiveColor }: StepIndicatorProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.2, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (isCompleted) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(0.8, { duration: 200 });
    } else {
      scale.value = withSpring(0.8, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(0.5, { duration: 200 });
    }
  }, [isActive, isCompleted]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    backgroundColor: isActive || isCompleted ? activeColor : inactiveColor,
  }));

  return <Animated.View style={animatedStyle} className="w-2 h-2 rounded-full" />;
}
