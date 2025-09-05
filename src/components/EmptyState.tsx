import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon = "document-outline",
  title,
  description,
  actionText,
  onAction,
  className = "",
}: Props) {
  return (
    <View className={`items-center justify-center py-12 px-6 ${className}`}>
      <View className="w-20 h-20 bg-surface-800 rounded-full items-center justify-center mb-6">
        <Ionicons name={icon} size={32} color="#9CA3AF" />
      </View>

      <Text className="text-text-primary text-xl font-bold mb-3 text-center">{title}</Text>

      <Text className="text-text-secondary text-center mb-8 leading-6 max-w-sm">{description}</Text>

      {actionText && onAction && (
        <Pressable className="bg-brand-red rounded-xl px-6 py-3" onPress={onAction}>
          <Text className="text-black font-semibold">{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}
