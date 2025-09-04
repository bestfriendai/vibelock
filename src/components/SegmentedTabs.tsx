import React from "react";
import { View, Pressable, Text } from "react-native";

interface TabItem {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
}

export default function SegmentedTabs({ tabs, value, onChange }: SegmentedTabsProps) {
  return (
    <View className="flex-row items-center space-x-4 px-2">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className="py-2"
            hitSlop={6}
          >
            <Text className={active ? "text-brand-red font-semibold" : "text-text-secondary font-medium"}>
              {t.label}
            </Text>
            <View className={`h-0.5 mt-1 ${active ? "bg-brand-red" : "bg-transparent"}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
