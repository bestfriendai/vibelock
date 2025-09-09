import React from 'react';
import { View } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import AdBanner from './AdBanner';
import { useTheme } from '../providers/ThemeProvider';

export default function CustomTabBar(props: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={{ backgroundColor: colors.surface[900] }}>
      {/* Ad banner shows above the tab bar (hidden for premium users) */}
      <AdBanner placement="browse" />

      {/* Standard tab bar with theme-aware styling */}
      <BottomTabBar
        {...props}
        style={{
          backgroundColor: colors.surface[900],
          borderTopColor: colors.border,
          borderTopWidth: 1,
        }}
      />
    </View>
  );
}
