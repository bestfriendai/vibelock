import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "red" | "green" | "blue";
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "red",
  icon = "warning",
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getConfirmButtonColor = () => {
    switch (confirmColor) {
      case "green":
        return colors.accent.green;
      case "blue":
        return colors.accent.blue;
      case "red":
      default:
        return colors.brand.red;
    }
  };

  const getIconColor = () => {
    switch (confirmColor) {
      case "green":
        return colors.accent.green;
      case "blue":
        return colors.accent.blue;
      case "red":
      default:
        return colors.brand.red;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <Animated.View style={[animatedBackdropStyle]} className="flex-1 bg-black/50 items-center justify-center px-6">
        <Pressable className="absolute inset-0" onPress={onCancel} />

        <Animated.View
          style={[
            animatedModalStyle,
            {
              backgroundColor: colors.surface[800],
              borderColor: colors.surface[700],
            },
          ]}
          className="rounded-2xl p-6 w-full max-w-sm border"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`${title}: ${message}`}
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: getIconColor() + "20" }}
            >
              <Ionicons name={icon} size={24} color={getIconColor()} />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-center mb-3" style={{ color: colors.text.primary }}>
            {title}
          </Text>

          {/* Message */}
          <Text className="text-center mb-8 leading-6" style={{ color: colors.text.secondary }}>
            {message}
          </Text>

          {/* Actions */}
          <View className="space-y-3">
            <Pressable
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: getConfirmButtonColor() }}
              onPress={onConfirm}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${confirmText} - ${title}`}
              accessibilityHint={`Double tap to ${confirmText.toLowerCase()}`}
            >
              <Text className="font-semibold text-lg" style={{ color: "#FFFFFF" }}>
                {confirmText}
              </Text>
            </Pressable>

            <Pressable
              className="rounded-xl py-4 items-center border"
              style={{
                backgroundColor: colors.surface[700],
                borderColor: colors.surface[600],
              }}
              onPress={onCancel}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${cancelText} - dismiss dialog`}
              accessibilityHint={`Double tap to ${cancelText.toLowerCase()} and close dialog`}
            >
              <Text className="font-medium" style={{ color: colors.text.primary }}>
                {cancelText}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
