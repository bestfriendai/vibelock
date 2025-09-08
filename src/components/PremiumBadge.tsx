import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'badge' | 'pill' | 'icon';
  showText?: boolean;
}

export default function PremiumBadge({ 
  size = 'medium', 
  variant = 'badge',
  showText = true 
}: PremiumBadgeProps) {
  const { colors } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-0.5',
          text: 'text-xs',
          icon: 12,
        };
      case 'large':
        return {
          container: 'px-4 py-2',
          text: 'text-base',
          icon: 20,
        };
      default: // medium
        return {
          container: 'px-3 py-1',
          text: 'text-sm',
          icon: 16,
        };
    }
  };

  const styles = getSizeStyles();

  if (variant === 'icon') {
    return (
      <View 
        className="rounded-full items-center justify-center"
        style={{ 
          backgroundColor: 'linear-gradient(45deg, #F59E0B, #F97316)',
          width: styles.icon + 8,
          height: styles.icon + 8,
        }}
      >
        <Ionicons name="diamond" size={styles.icon} color="white" />
      </View>
    );
  }

  if (variant === 'pill') {
    return (
      <View 
        className={`rounded-full flex-row items-center ${styles.container}`}
        style={{ 
          backgroundColor: '#F59E0B',
        }}
      >
        <Ionicons name="diamond" size={styles.icon} color="white" />
        {showText && (
          <Text className={`text-white font-bold ml-1 ${styles.text}`}>
            Plus
          </Text>
        )}
      </View>
    );
  }

  // Default badge variant
  return (
    <View 
      className={`rounded ${styles.container} flex-row items-center`}
      style={{ 
        backgroundColor: '#F59E0B',
      }}
    >
      <Ionicons name="diamond" size={styles.icon} color="white" />
      {showText && (
        <Text className={`text-white font-bold ml-1 ${styles.text}`}>
          Plus
        </Text>
      )}
    </View>
  );
}

// Premium status indicator for user profiles
export function PremiumStatusIndicator({ isPremium }: { isPremium: boolean }) {
  const { colors } = useTheme();

  if (!isPremium) return null;

  return (
    <View className="flex-row items-center">
      <PremiumBadge size="small" variant="pill" />
      <Text 
        className="text-xs ml-2"
        style={{ color: colors.text.muted }}
      >
        Verified Plus Member
      </Text>
    </View>
  );
}

// Premium feature lock overlay
export function PremiumFeatureLock({ 
  featureName, 
  onUpgrade 
}: { 
  featureName: string; 
  onUpgrade: () => void; 
}) {
  const { colors } = useTheme();

  return (
    <View 
      className="absolute inset-0 rounded-lg items-center justify-center"
      style={{ 
        backgroundColor: colors.surface[900] + 'E6', // 90% opacity
      }}
    >
      <View 
        className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-full p-4 mb-3"
      >
        <Ionicons name="diamond" size={24} color="white" />
      </View>
      <Text 
        className="font-bold text-lg mb-2"
        style={{ color: colors.text.primary }}
      >
        Plus Feature
      </Text>
      <Text 
        className="text-center text-sm mb-4 px-4"
        style={{ color: colors.text.secondary }}
      >
        {featureName} is available for Plus members
      </Text>
      <View 
        className="bg-amber-500 px-6 py-2 rounded-full"
        onTouchEnd={onUpgrade}
      >
        <Text className="text-white font-bold">Upgrade to Plus</Text>
      </View>
    </View>
  );
}
