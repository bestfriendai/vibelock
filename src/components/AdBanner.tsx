import React from "react";
import { View, Text } from "react-native";
import useSubscriptionStore from "../state/subscriptionStore";

interface Props { placement: "browse" | "chat" }

export default function AdBanner({ placement }: Props) {
  const { isPremium } = useSubscriptionStore();
  if (isPremium) return null;

  return (
    <View className="absolute left-0 right-0 bottom-0 items-center pb-2">
      <View className="w-11/12 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 items-center">
        <Text className="text-text-secondary text-xs">Ad Banner • {placement}</Text>
        <Text className="text-text-muted text-[10px] mt-1">Placeholder (connect AdMob later)</Text>
      </View>
    </View>
  );
}

