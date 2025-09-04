import React from "react";
import { View, Text } from "react-native";

export default function TestingBanner() {
  return (
    <View className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
      <Text className="text-yellow-400 text-xs font-medium text-center">
        🧪 TESTING MODE: Auto sign-in enabled - No form validation required
      </Text>
    </View>
  );
}