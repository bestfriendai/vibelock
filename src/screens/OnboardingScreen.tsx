import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const onboardingSteps = [
  {
    icon: "eye-outline",
    title: "Browse Anonymously",
    description: "See what others are saying about potential dates in your area. All reviews are completely anonymous."
  },
  {
    icon: "chatbubble-outline", 
    title: "Share Your Experience",
    description: "Help others by sharing your dating experiences. Your identity stays protected while helping the community."
  },
  {
    icon: "people-outline",
    title: "Connect Safely",
    description: "Join location-based chat rooms to discuss dating experiences and get advice from your local community."
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Navigate to auth screen or main app
      navigation.navigate("Auth");
    }
  };

  const handleSkip = () => {
    navigation.navigate("Auth");
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="flex-1">
        {/* Skip Button */}
        <View className="flex-row justify-end px-6 pt-4">
          <Pressable onPress={handleSkip}>
            <Text className="text-text-secondary font-medium">Skip</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 justify-center items-center px-6">
            {/* Logo */}
            <View className="w-24 h-24 bg-brand-red rounded-full items-center justify-center mb-8">
              <Text className="text-white text-2xl font-bold">LRT</Text>
            </View>

            {/* Step Icon */}
            <View className="w-20 h-20 bg-surface-800 rounded-full items-center justify-center mb-8">
              <Ionicons name={currentStepData.icon as any} size={32} color="#FF6B6B" />
            </View>

            {/* Step Content */}
            <Text className="text-3xl font-bold text-text-primary mb-4 text-center">
              {currentStepData.title}
            </Text>
            <Text className="text-text-secondary text-center mb-12 text-lg leading-7 px-4">
              {currentStepData.description}
            </Text>

            {/* Progress Indicators */}
            <View className="flex-row space-x-2 mb-8">
              {onboardingSteps.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? "bg-brand-red" : "bg-surface-700"
                  }`}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View className="px-6 pb-8">
          <Pressable
            className="bg-brand-red rounded-lg py-4 items-center mb-4"
            onPress={handleNext}
          >
            <Text className="text-white font-semibold text-lg">
              {currentStep === onboardingSteps.length - 1 ? "Get Started" : "Next"}
            </Text>
          </Pressable>

          {currentStep > 0 && (
            <Pressable
              className="py-3 items-center"
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text className="text-text-secondary font-medium">Back</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}