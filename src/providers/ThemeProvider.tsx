import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Appearance, View } from 'react-native';
import useThemeStore from '../state/themeStore';

// Light theme colors - Professional and accessible
export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    surface: {
      900: '#FFFFFF',    // Main background
      800: '#F8F9FA',    // Card background - subtle gray
      700: '#E9ECEF',    // Secondary surface - light gray
      600: '#DEE2E6',    // Tertiary surface - medium gray
      500: '#CED4DA',    // Border/divider color
    },
    text: {
      primary: '#000000',    // Pure black for main text (AAA)
      secondary: '#374151',  // Darker gray for secondary text (AAA)
      muted: '#6B7280',      // Medium gray for muted text (AA)
      accent: '#DC2626',     // Red accent for highlights
    },
    border: '#DEE2E6',       // Consistent border color
    brand: {
      red: '#DC3545',        // Primary brand red (accessible)
      redLight: '#F8D7DA',   // Light red background
      redDark: '#721C24',    // Dark red for text on light backgrounds
      coral: '#FF6B6B',      // Coral accent
      warm: '#FD7E14',       // Orange accent
    },
    accent: {
      orange: '#FD7E14',     // Orange accent
      peach: '#FFE5B4',      // Light peach background
      pink: '#F8D7DA',       // Light pink background
      blue: '#0D6EFD',       // Blue accent for links/actions
      green: '#198754',      // Green for success states
      yellow: '#FFC107',     // Yellow for warnings
    },
    status: {
      success: '#198754',    // Green for success
      warning: '#FFC107',    // Yellow for warnings
      error: '#DC3545',      // Red for errors
      info: '#0DCAF0',       // Cyan for info
    }
  }
};

// Dark theme colors - Pure black theme
export const darkTheme = {
  colors: {
    background: '#000000',
    surface: {
      900: '#000000',    // Main background - pure black
      800: '#000000',    // Card background - pure black
      700: '#1D1D22',    // Secondary surface - medium dark
      600: '#26262C',    // Tertiary surface - lighter dark
      500: '#2F2F35',    // Border/divider color
    },
    text: {
      primary: '#F8F9FA',    // High contrast white for main text
      secondary: '#ADB5BD',  // Light gray for secondary text
      muted: '#6C757D',      // Medium gray for muted text
      accent: '#FFB74D',     // Amber accent for highlights
    },
    border: '#2A2A2F',       // Consistent border color
    brand: {
      red: '#EF4444',        // Primary brand red
      redLight: '#FEE2E2',   // Light red background (for dark theme)
      redDark: '#DC2626',    // Darker red variant
      coral: '#FF6B6B',      // Coral accent
      warm: '#FFA726',       // Orange accent
    },
    accent: {
      orange: '#FF8A65',     // Orange accent
      peach: '#FFCC80',      // Peach accent
      pink: '#F8BBD9',       // Pink accent
      blue: '#60A5FA',       // Blue accent for links/actions
      green: '#34D399',      // Green for success states
      yellow: '#FBBF24',     // Yellow for warnings
    },
    status: {
      success: '#10B981',    // Green for success
      warning: '#F59E0B',    // Yellow for warnings
      error: '#EF4444',      // Red for errors
      info: '#06B6D4',       // Cyan for info
    }
  }
};

interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: typeof lightTheme.colors | typeof darkTheme.colors;
  isDarkMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme, isDarkMode, setTheme, toggleTheme } = useThemeStore();

  // Listen to system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        // This will trigger the theme store to update
        setTheme('system');
      });

      return () => subscription?.remove();
    }
  }, [theme, setTheme]);

  const currentTheme = isDarkMode ? 'dark' : 'light';
  const colors = isDarkMode ? darkTheme.colors : lightTheme.colors;

  const value: ThemeContextType = {
    theme: currentTheme,
    colors,
    isDarkMode,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View className={isDarkMode ? 'dark' : ''} style={{ flex: 1 }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility functions for theme-aware styling
export const getThemeColor = (
  colorPath: string,
  theme: 'light' | 'dark'
): string => {
  const themeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const keys = colorPath.split('.');
  let color: any = themeColors;
  
  for (const key of keys) {
    color = color[key];
    if (color === undefined) {
      console.warn(`Theme color path "${colorPath}" not found`);
      return theme === 'light' ? '#000000' : '#FFFFFF';
    }
  }
  
  return color;
};

// Theme-aware class name helper
export const getThemeClass = (
  lightClass: string,
  darkClass: string,
  isDarkMode: boolean
): string => {
  return isDarkMode ? darkClass : lightClass;
};
