import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';

interface CreateTabButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
  testID?: string;
}

export const CreateTabButton: React.FC<CreateTabButtonProps> = ({
  onPress,
  style,
  size = 50,
  testID = 'create-tab-button',
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.brand.red,
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: colors.text.primary,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
      accessibilityLabel="Create new post"
      accessibilityRole="button"
    >
      <Ionicons
        name="add"
        size={size * 0.6}
        color={colors.background}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
});