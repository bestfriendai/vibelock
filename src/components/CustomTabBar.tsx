import React from 'react';
import { View } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import AdBanner from './AdBanner';

export default function CustomTabBar(props: BottomTabBarProps) {
  return (
    <View>
      {/* Ad banner always shows above the tab bar for demo */}
      <AdBanner placement="browse" />
      
      {/* Standard tab bar - styling handled in navigator screenOptions */}
      <BottomTabBar {...props} />
    </View>
  );
}
