import React from "react";
import { View, Text } from "react-native";

export default function TestingBanner() {
  return (
    <View className="bg-green-500/20 border-b border-green-500/30 px-4 py-2">
      <Text className="text-green-400 text-xs font-medium text-center">
        🔥 FIREBASE INTEGRATED: Real authentication & database enabled
      </Text>
    </View>
  );
}