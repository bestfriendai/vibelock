import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ChatroomsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
        <Text className="text-text-primary text-xl font-semibold mt-4">Chatrooms coming soon</Text>
        <Text className="text-text-secondary mt-2 text-center">Stay tuned for local and global discussions.</Text>
      </View>
    </SafeAreaView>
  );
}
