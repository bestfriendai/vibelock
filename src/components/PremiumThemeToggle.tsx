import React from 'react';
import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import useSubscriptionStore from '../state/subscriptionStore';

interface PremiumThemeToggleProps {
  onShowPaywall?: () => void;
}

export default function PremiumThemeToggle({ onShowPaywall }: PremiumThemeToggleProps) {
  const { theme, colors, isDarkMode, setTheme } = useTheme();
  const { isPremium } = useSubscriptionStore();

  const handleThemeToggle = () => {
    if (!isPremium) {
      // Show upgrade prompt for non-premium users
      Alert.alert(
        'Premium Feature',
        'Theme customization is available for Locker Room Talk Plus members. Upgrade to unlock light mode and other premium features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => {
              // Show paywall modal instead of navigating
              if (onShowPaywall) {
                onShowPaywall();
              }
            }
          }
        ]
      );
      return;
    }

    // Toggle theme for premium users
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <View 
      className="rounded-lg mb-6"
      style={{ backgroundColor: colors.surface[800] }}
    >
      <View className="p-5 border-b" style={{ borderColor: colors.border }}>
        <Text 
          className="font-semibold"
          style={{ color: colors.text.primary }}
        >
          Appearance
        </Text>
      </View>
      
      <Pressable 
        className="p-5"
        onPress={handleThemeToggle}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons 
              name={isDarkMode ? 'moon' : 'sunny'} 
              size={20} 
              color={colors.text.muted} 
            />
            <Text 
              className="font-medium ml-3"
              style={{ color: colors.text.primary }}
            >
              Theme
            </Text>
          </View>
          
          <View className="flex-row items-center">
            {isPremium ? (
              <>
                <Text 
                  className="text-sm mr-3 capitalize"
                  style={{ color: colors.text.secondary }}
                >
                  {isDarkMode ? 'Dark' : 'Light'}
                </Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={handleThemeToggle}
                  trackColor={{ 
                    false: colors.surface[600], 
                    true: colors.brand.red 
                  }}
                  thumbColor={isDarkMode ? colors.brand.red : '#f4f3f4'}
                />
              </>
            ) : (
              <View className="flex-row items-center">
                <Text 
                  className="text-sm mr-3"
                  style={{ color: colors.text.muted }}
                >
                  Dark Only
                </Text>
                <Pressable
                  onPress={handleThemeToggle}
                  className="bg-amber-500 px-3 py-1 rounded-full"
                >
                  <Text className="text-white text-xs font-medium">Plus</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
        
        {!isPremium && (
          <Text 
            className="text-xs mt-2"
            style={{ color: colors.text.muted }}
          >
            Upgrade to Plus to customize your theme and unlock light mode
          </Text>
        )}
      </Pressable>
    </View>
  );
}
