import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";

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
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const colorMap = {
    red: "bg-brand-red",
    green: "bg-green-500",
    blue: "bg-blue-500",
  };

  const iconColorMap = {
    red: "#FFFFFF",
    green: "#22C55E",
    blue: "#3B82F6",
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[animatedBackdropStyle]} className="flex-1 bg-black/50 items-center justify-center px-6">
        <Pressable className="absolute inset-0" onPress={onCancel} />

        <Animated.View
          style={[animatedModalStyle]}
          className="bg-surface-800 rounded-2xl p-6 w-full max-w-sm border border-surface-700"
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View className={`w-16 h-16 ${colorMap[confirmColor]}/20 rounded-full items-center justify-center`}>
              <Ionicons name={icon} size={24} color={iconColorMap[confirmColor]} />
            </View>
          </View>

          {/* Title */}
          <Text className="text-text-primary text-xl font-bold text-center mb-3">{title}</Text>

          {/* Message */}
          <Text className="text-text-secondary text-center mb-8 leading-6">{message}</Text>

          {/* Actions */}
          <View className="space-y-3">
            <Pressable className={`${colorMap[confirmColor]} rounded-xl py-4 items-center`} onPress={onConfirm}>
              <Text className="text-white font-semibold text-lg">{confirmText}</Text>
            </Pressable>

            <Pressable
              className="bg-surface-700 border border-surface-600 rounded-xl py-4 items-center"
              onPress={onCancel}
            >
              <Text className="text-text-primary font-medium">{cancelText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
