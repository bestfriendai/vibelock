import React from 'react';
import { View, Text, Pressable, ViewProps, TextProps, PressableProps } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

// Theme-aware View component
interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'card' | 'modal';
  level?: 900 | 800 | 700 | 600 | 500;
}

export const ThemedView: React.FC<ThemedViewProps> = ({ 
  variant = 'background', 
  level = 900, 
  style, 
  className = '',
  ...props 
}) => {
  const { colors, isDarkMode } = useTheme();
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'surface':
      case 'card':
        return colors.surface[level];
      case 'modal':
        return colors.surface[800];
      case 'background':
      default:
        return colors.background;
    }
  };

  const themeClasses = isDarkMode ? 'dark' : '';
  
  return (
    <View
      className={`${themeClasses} ${className}`}
      style={[
        { backgroundColor: getBackgroundColor() },
        style
      ]}
      {...props}
    />
  );
};

// Theme-aware Text component
interface ThemedTextProps extends TextProps {
  variant?: 'primary' | 'secondary' | 'muted' | 'accent' | 'brand';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
}

export const ThemedText: React.FC<ThemedTextProps> = ({ 
  variant = 'primary',
  size = 'base',
  weight = 'normal',
  style,
  className = '',
  ...props 
}) => {
  const { colors, isDarkMode } = useTheme();
  
  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
        return colors.text.secondary;
      case 'muted':
        return colors.text.muted;
      case 'accent':
        return colors.text.accent;
      case 'brand':
        return colors.brand.red;
      case 'primary':
      default:
        return colors.text.primary;
    }
  };

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  };

  const themeClasses = isDarkMode ? 'dark' : '';
  
  return (
    <Text
      className={`${themeClasses} ${sizeClasses[size]} ${weightClasses[weight]} ${className}`}
      style={[
        { color: getTextColor() },
        style
      ]}
      {...props}
    />
  );
};

// Theme-aware Button component
interface ThemedButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({ 
  variant = 'primary',
  size = 'md',
  style,
  className = '',
  children,
  ...props 
}) => {
  const { colors, isDarkMode } = useTheme();
  
  const getButtonStyles = () => {
    const baseStyles = {
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    const sizeStyles = {
      sm: { paddingHorizontal: 12, paddingVertical: 8 },
      md: { paddingHorizontal: 16, paddingVertical: 12 },
      lg: { paddingHorizontal: 20, paddingVertical: 16 },
    };

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyles,
          ...sizeStyles[size],
          backgroundColor: colors.surface[700],
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          ...baseStyles,
          ...sizeStyles[size],
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.brand.red,
        };
      case 'ghost':
        return {
          ...baseStyles,
          ...sizeStyles[size],
          backgroundColor: 'transparent',
        };
      case 'primary':
      default:
        return {
          ...baseStyles,
          ...sizeStyles[size],
          backgroundColor: colors.brand.red,
        };
    }
  };

  const themeClasses = isDarkMode ? 'dark' : '';
  
  return (
    <Pressable
      className={`${themeClasses} ${className}`}
      style={[getButtonStyles(), style]}
      {...props}
    >
      {children}
    </Pressable>
  );
};

// Theme-aware Card component
interface ThemedCardProps extends ViewProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({ 
  padding = 'md',
  border = true,
  style,
  className = '',
  ...props 
}) => {
  const { colors, isDarkMode } = useTheme();
  
  const paddingStyles = {
    none: {},
    sm: { padding: 12 },
    md: { padding: 16 },
    lg: { padding: 24 },
  };

  const cardStyles = {
    backgroundColor: colors.surface[800],
    borderRadius: 16,
    ...(border && {
      borderWidth: 1,
      borderColor: colors.border,
    }),
    ...paddingStyles[padding],
  };

  const themeClasses = isDarkMode ? 'dark' : '';
  
  return (
    <View
      className={`${themeClasses} ${className}`}
      style={[cardStyles, style]}
      {...props}
    />
  );
};

// Theme-aware utility functions
export const useThemedStyles = () => {
  const { colors, isDarkMode } = useTheme();
  
  return {
    colors,
    isDarkMode,
    getThemeClass: (lightClass: string, darkClass: string) => 
      isDarkMode ? darkClass : lightClass,
    getThemeStyle: (lightStyle: object, darkStyle: object) =>
      isDarkMode ? darkStyle : lightStyle,
  };
};
