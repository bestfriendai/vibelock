import React, { memo } from "react";
import { View } from "react-native";
import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import AdBanner from "./AdBanner";
import { useTheme } from "../providers/ThemeProvider";

// Memoized for React Navigation v7 performance optimization
const CustomTabBar = memo(function CustomTabBar(props: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={{ backgroundColor: colors.surface[900] }}>
      {/* Ad banner shows above the tab bar (hidden for premium users) */}
      <AdBanner placement="browse" />

      {/* Standard tab bar with theme-aware styling and React Navigation v7 optimizations */}
      <BottomTabBar
        {...props}
        style={{
          backgroundColor: colors.surface[900],
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          // React Navigation v7 performance improvements
          elevation: 0,
          shadowOpacity: 0,
        }}
      />
    </View>
  );
});

export default CustomTabBar;
