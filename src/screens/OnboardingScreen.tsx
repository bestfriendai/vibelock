import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to LockerRoom
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Get honest insights about potential dates from people who have actually dated them.
        </Text>
        <Pressable className="bg-red-500 rounded-lg py-4 px-8">
          <Text className="text-white font-semibold">Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}