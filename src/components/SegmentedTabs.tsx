import React from "react";
import { View, Pressable, Text } from "react-native";
import { useTheme } from "../providers/ThemeProvider";

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
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center justify-between px-4">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className="flex-1 py-4 items-center"
            hitSlop={8}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={`${t.label} tab`}
            accessibilityState={{ selected: active }}
            accessibilityHint={`Switch to ${t.label} category`}
          >
            <Text
              className={`text-sm ${active ? "font-semibold" : "font-medium"}`}
              style={{
                color: active ? colors.text.primary : colors.text.secondary,
              }}
            >
              {t.label}
            </Text>
            <View
              className="h-0.5 mt-2 w-full"
              style={{
                backgroundColor: active ? colors.brand.red : "transparent",
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
