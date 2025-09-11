import React, { useEffect } from "react";
import { Pressable, Text, PressableProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { cn } from "../utils/cn";

interface AnimatedButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

const AnimatedButton = React.forwardRef<Pressable, AnimatedButtonProps>(({
  title,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  className,
  textClassName,
  onPress,
  ...props
}, ref) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Loading spinner animation
  useEffect(() => {
    if (loading) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      rotation.value = 0;
    }
  }, [loading]);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = (event: any) => {
    if (onPress && !loading && !disabled) {
      runOnJS(onPress)(event);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-brand-red";
      case "secondary":
        return "bg-surface-700 border border-surface-600";
      case "ghost":
        return "bg-transparent";
      default:
        return "bg-brand-red";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return "py-2 px-4";
      case "medium":
        return "py-3 px-6";
      case "large":
        return "py-4 px-8";
      default:
        return "py-3 px-6";
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "text-black";
      case "secondary":
        return "text-text-primary";
      case "ghost":
        return "text-brand-red";
      default:
        return "text-black";
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case "small":
        return "text-sm";
      case "medium":
        return "text-base";
      case "large":
        return "text-lg";
      default:
        return "text-base";
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        ref={ref}
        className={cn(
          "rounded-lg items-center justify-center",
          getVariantStyles(),
          getSizeStyles(),
          (loading || disabled) && "opacity-50",
          className,
        )}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={loading || disabled}
        {...props}
      >
        {loading ? (
          <Animated.View
            style={spinnerStyle}
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
          />
        ) : (
          <Text className={cn("font-semibold", getTextVariantStyles(), getTextSizeStyles(), textClassName)}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
