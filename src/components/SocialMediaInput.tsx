import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SocialMediaHandles } from "../types";
import { useTheme } from "../providers/ThemeProvider";

interface SocialPlatform {
  key: keyof SocialMediaHandles;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  prefix: string;
  color: string;
  maxLength: number;
  pattern: RegExp;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    key: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    placeholder: "username",
    prefix: "@",
    color: "#E4405F",
    maxLength: 30,
    pattern: /^[a-zA-Z0-9._]{1,30}$/,
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "logo-tiktok",
    placeholder: "username",
    prefix: "@",
    color: "#000000",
    maxLength: 24,
    pattern: /^[a-zA-Z0-9._]{1,24}$/,
  },
  {
    key: "snapchat",
    label: "Snapchat",
    icon: "camera",
    placeholder: "username",
    prefix: "",
    color: "#FFFC00",
    maxLength: 15,
    pattern: /^[a-zA-Z0-9._-]{1,15}$/,
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    icon: "logo-twitter",
    placeholder: "username",
    prefix: "@",
    color: "#1DA1F2",
    maxLength: 15,
    pattern: /^[a-zA-Z0-9_]{1,15}$/,
  },
];

interface Props {
  socialMedia: SocialMediaHandles;
  onSocialMediaChange: (socialMedia: SocialMediaHandles) => void;
}

export default function SocialMediaInput({ socialMedia, onSocialMediaChange }: Props) {
  const { colors } = useTheme();
  const [errors, setErrors] = useState<Partial<SocialMediaHandles>>({});
  const [focused, setFocused] = useState<keyof SocialMediaHandles | null>(null);

  const validateUsername = (platform: SocialPlatform, value: string): string | null => {
    if (!value) return null;

    // Remove @ prefix if user typed it
    const cleanValue = value.startsWith("@") ? value.slice(1) : value;

    if (!platform.pattern.test(cleanValue)) {
      return `Invalid ${platform.label} username format`;
    }

    return null;
  };

  const handleInputChange = (platform: SocialPlatform, value: string) => {
    // Remove @ prefix if user typed it (we'll add it in display)
    const cleanValue = value.startsWith("@") ? value.slice(1) : value;

    // Validate the input
    const error = validateUsername(platform, cleanValue);
    setErrors((prev) => ({
      ...prev,
      [platform.key]: error,
    }));

    // Update the social media handles
    onSocialMediaChange({
      ...socialMedia,
      [platform.key]: cleanValue || undefined,
    });
  };

  const handleFocus = (platformKey: keyof SocialMediaHandles) => {
    setFocused(platformKey);
  };

  const handleBlur = () => {
    setFocused(null);
  };

  const clearInput = (platformKey: keyof SocialMediaHandles) => {
    onSocialMediaChange({
      ...socialMedia,
      [platformKey]: undefined,
    });
    setErrors((prev) => ({
      ...prev,
      [platformKey]: null,
    }));
  };

  return (
    <View className="space-y-4">
      {SOCIAL_PLATFORMS.map((platform) => {
        const value = socialMedia[platform.key] || "";
        const error = errors[platform.key];
        const isFocused = focused === platform.key;
        const hasValue = value.length > 0;

        return (
          <View key={platform.key}>
            {/* Platform Label */}
            <View className="flex-row items-center mb-2">
              <Ionicons name={platform.icon} size={20} color={platform.color} />
              <Text className="font-medium ml-2" style={{ color: colors.text.primary }}>
                {platform.label}
              </Text>
            </View>

            {/* Input Container */}
            <View
              className="flex-row items-center border rounded-xl px-4 py-3"
              style={{
                backgroundColor: colors.surface[800],
                borderColor: isFocused ? colors.brand.red : error ? "#EF4444" : colors.border,
              }}
            >
              {/* Prefix */}
              {platform.prefix && (
                <Text className="font-medium mr-1" style={{ color: colors.text.secondary }}>
                  {platform.prefix}
                </Text>
              )}

              {/* Text Input */}
              <TextInput
                className="flex-1 font-medium"
                style={{ color: colors.text.primary }}
                placeholder={platform.placeholder}
                placeholderTextColor={colors.text.muted}
                value={value}
                onChangeText={(text) => handleInputChange(platform, text)}
                onFocus={() => handleFocus(platform.key)}
                onBlur={handleBlur}
                maxLength={platform.maxLength}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />

              {/* Clear Button */}
              {hasValue && (
                <Pressable onPress={() => clearInput(platform.key)} className="ml-2 p-1" hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.text.muted} />
                </Pressable>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <View className="flex-row items-center mt-2">
                <Ionicons name="warning" size={14} color="#EF4444" />
                <Text className="text-sm ml-1" style={{ color: "#EF4444" }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Character Count */}
            {hasValue && (
              <Text className="text-xs mt-1 text-right" style={{ color: colors.text.muted }}>
                {value.length}/{platform.maxLength}
              </Text>
            )}
          </View>
        );
      })}

      {/* Privacy Notice */}
      <View className="rounded-xl p-4 mt-4" style={{ backgroundColor: colors.surface[800] }}>
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={20} color={colors.text.muted} />
          <View className="ml-3 flex-1">
            <Text className="font-medium mb-1" style={{ color: colors.text.secondary }}>
              Privacy Notice
            </Text>
            <Text className="text-sm leading-5" style={{ color: colors.text.muted }}>
              Social media handles will be displayed publicly in your review to help others verify your experience. Only
              add handles you're comfortable sharing.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
