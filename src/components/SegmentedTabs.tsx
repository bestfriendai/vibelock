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
    <View className="flex-row items-center justify-between px-4">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className="flex-1 py-3 items-center"
            hitSlop={8}
          >
            <Text className={active ? "text-text-primary font-semibold text-sm" : "text-text-secondary font-medium text-sm"}>
              {t.label}
            </Text>
            <View className={`h-0.5 mt-2 w-full ${active ? "bg-brand-red" : "bg-transparent"}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
