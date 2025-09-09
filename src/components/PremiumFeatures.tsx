import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

interface PremiumFeatureProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  isNew?: boolean;
}

const PremiumFeature: React.FC<PremiumFeatureProps> = ({ icon, title, description, isNew }) => {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-start mb-4">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.brand.red + "20" }}
      >
        <Ionicons name={icon} size={20} color={colors.brand.red} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold text-base" style={{ color: colors.text.primary }}>
            {title}
          </Text>
          {isNew && (
            <View className="bg-amber-500 rounded-full px-2 py-0.5 ml-2">
              <Text className="text-white text-xs font-bold">NEW</Text>
            </View>
          )}
        </View>
        <Text className="text-sm mt-1 leading-5" style={{ color: colors.text.secondary }}>
          {description}
        </Text>
      </View>
    </View>
  );
};

export default function PremiumFeatures() {
  const { colors } = useTheme();

  const features = [
    {
      icon: "eye-off-outline" as const,
      title: "Ad-Free Experience",
      description: "Enjoy uninterrupted browsing without banner ads or interruptions",
    },
    {
      icon: "color-palette-outline" as const,
      title: "Light & Dark Themes",
      description: "Switch between beautiful light and dark modes to match your style",
      isNew: true,
    },
    {
      icon: "filter-outline" as const,
      title: "Advanced Filters",
      description: "Filter reviews by date ranges, sentiment, location radius, and media types",
    },
    {
      icon: "trending-up-outline" as const,
      title: "Priority Review Placement",
      description: "Your reviews get higher visibility and better placement in feeds",
    },
    {
      icon: "document-text-outline" as const,
      title: "Extended Review Length",
      description: "Write detailed reviews up to 1000 characters (vs 500 for free users)",
    },
    {
      icon: "images-outline" as const,
      title: "More Media Uploads",
      description: "Upload up to 10 photos/videos per review (vs 6 for free users)",
    },
    {
      icon: "chatbubbles-outline" as const,
      title: "Premium Chat Rooms",
      description: "Access exclusive discussion rooms for verified Plus members only",
    },
    {
      icon: "analytics-outline" as const,
      title: "Review Analytics",
      description: "See detailed metrics on your review performance and engagement",
    },
    {
      icon: "shield-checkmark-outline" as const,
      title: "Verification Badge",
      description: "Get a verified member indicator while maintaining full anonymity",
    },
    {
      icon: "download-outline" as const,
      title: "Export Reviews",
      description: "Download your reviews as PDF for personal records or backup",
    },
  ];

  return (
    <View className="rounded-xl p-6" style={{ backgroundColor: colors.surface[800] }}>
      <View className="flex-row items-center mb-6">
        <View className="bg-gradient-to-r from-amber-500 to-orange-500 w-8 h-8 rounded-full items-center justify-center mr-3">
          <Ionicons name="diamond" size={16} color="white" />
        </View>
        <Text className="text-xl font-bold" style={{ color: colors.text.primary }}>
          Locker Room Talk Plus
        </Text>
      </View>

      <Text className="text-base mb-6 leading-6" style={{ color: colors.text.secondary }}>
        Unlock the full potential of anonymous dating reviews with premium features designed for serious users.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {features.map((feature, index) => (
          <PremiumFeature
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            isNew={feature.isNew}
          />
        ))}
      </ScrollView>

      <View className="mt-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface[700] }}>
        <Text className="text-center font-semibold" style={{ color: colors.brand.red }}>
          Starting at $4.99/month
        </Text>
        <Text className="text-center text-sm mt-1" style={{ color: colors.text.muted }}>
          Cancel anytime • 7-day free trial
        </Text>
      </View>
    </View>
  );
}
