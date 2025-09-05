import React, { useState, forwardRef } from "react";
import { View, Text, TextInput, TextInputProps, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
}

const AnimatedInput = forwardRef<TextInput, AnimatedInputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerClassName,
      inputClassName,
      labelClassName,
      errorClassName,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnimation = useSharedValue(0);
    const errorAnimation = useSharedValue(0);

    const handleFocus = (event: any) => {
      setIsFocused(true);
      focusAnimation.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      onFocus?.(event);
    };

    const handleBlur = (event: any) => {
      setIsFocused(false);
      focusAnimation.value = withSpring(0, {
        damping: 15,
        stiffness: 300,
      });
      onBlur?.(event);
    };

    React.useEffect(() => {
      errorAnimation.value = withTiming(error ? 1 : 0, { duration: 200 });
    }, [error]);

    const containerAnimatedStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(
        focusAnimation.value,
        [0, 1],
        [error ? "#FFFFFF" : "#2A2A2F", error ? "#FFFFFF" : "#FFFFFF"],
      ),
      transform: [
        {
          scale: withSpring(isFocused ? 1.02 : 1, {
            damping: 20,
            stiffness: 300,
          }),
        },
      ],
    }));

    const labelAnimatedStyle = useAnimatedStyle(() => ({
      color: interpolateColor(focusAnimation.value, [0, 1], ["#9CA3AF", "#FFFFFF"]),
      transform: [
        {
          scale: withSpring(isFocused ? 0.9 : 1, {
            damping: 15,
            stiffness: 300,
          }),
        },
      ],
    }));

    const errorAnimatedStyle = useAnimatedStyle(() => ({
      opacity: errorAnimation.value,
      transform: [
        {
          translateY: withTiming(error ? 0 : -10, { duration: 200 }),
        },
      ],
    }));

    return (
      <View className={cn("space-y-2", containerClassName)}>
        {label && (
          <Animated.Text style={labelAnimatedStyle} className={cn("font-medium", labelClassName)}>
            {label}
          </Animated.Text>
        )}

        <Animated.View
          style={containerAnimatedStyle}
          className="border bg-surface-800 rounded-lg flex-row items-center"
        >
          {leftIcon && (
            <View className="pl-4">
              <Ionicons name={leftIcon} size={20} color="#9CA3AF" />
            </View>
          )}

          <AnimatedTextInput
            ref={ref}
            className={cn(
              "flex-1 px-4 py-3 text-text-primary",
              leftIcon && "pl-2",
              rightIcon && "pr-2",
              inputClassName,
            )}
            placeholderTextColor="#9CA3AF"
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {rightIcon && (
            <Pressable className="pr-4" onPress={onRightIconPress}>
              <Ionicons name={rightIcon} size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </Animated.View>

        {error && (
          <Animated.View style={errorAnimatedStyle}>
            <Text className={cn("text-brand-red text-sm", errorClassName)}>{error}</Text>
          </Animated.View>
        )}
      </View>
    );
  },
);

AnimatedInput.displayName = "AnimatedInput";

export default AnimatedInput;
