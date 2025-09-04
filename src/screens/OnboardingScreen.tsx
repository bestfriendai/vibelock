import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="flex-1 justify-center items-center px-6">
        <View className="w-20 h-20 bg-brand-red rounded-full items-center justify-center mb-6">
          <Text className="text-white text-xl font-bold">LRT</Text>
        </View>
        <Text className="text-3xl font-bold text-text-primary mb-4 text-center">
          Welcome to Locker Room Talk
        </Text>
        <Text className="text-text-secondary text-center mb-8 text-lg leading-6">
          Get honest insights about potential dates from people who have actually dated them.
        </Text>
        <Pressable className="bg-brand-red rounded-lg py-4 px-8">
          <Text className="text-white font-semibold text-lg">Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}