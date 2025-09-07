import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import useSubscriptionStore from "../state/subscriptionStore";

interface Props { placement: "browse" | "chat" }

export default function AdBanner({ placement }: Props) {
  const { isPremium } = useSubscriptionStore();
  const insets = useSafeAreaInsets();
  if (isPremium) return null;

  // Fixed positioning: 52px base tab bar height + bottom safe area + 8px spacing
  const bottomPosition = 52 + (insets.bottom || 0) + 8;

  return (
    <View
      className="absolute left-0 right-0 items-center z-10"
      style={{ bottom: bottomPosition }}
    >
      <View className="w-11/12 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 items-center">
        <Text className="text-text-secondary text-xs">Ad Banner • {placement}</Text>
        <Text className="text-text-muted text-[10px] mt-1">Placeholder (connect AdMob later)</Text>
      </View>
    </View>
  );
}
