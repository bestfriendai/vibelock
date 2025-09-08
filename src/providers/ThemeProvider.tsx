import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import useThemeStore from '../state/themeStore';

// Light theme colors
export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    surface: {
      900: '#FFFFFF',  // Main background
      800: '#F8F9FA',  // Card background
      700: '#E9ECEF',  // Secondary surface
      600: '#DEE2E6',  // Border color
      500: '#CED4DA',  // Lighter border
    },
    text: {
      primary: '#212529',    // Main text
      secondary: '#6C757D',  // Secondary text
      muted: '#ADB5BD',      // Muted text
      accent: '#FF8A65',     // Accent text
    },
    border: '#E9ECEF',
    brand: {
      red: '#DC3545',        // Primary brand color
      redLight: '#F8D7DA',   // Light brand background
      redDark: '#721C24',    // Dark brand text
      coral: '#FF6B6B',
      warm: '#FFA726',
    },
    accent: {
      orange: '#FF8A65',
      peach: '#FFCC80',
      pink: '#F8BBD9',
    }
  }
};

// Dark theme colors (existing)
export const darkTheme = {
  colors: {
    background: '#0B0B0F',
    surface: {
      900: '#0B0B0F',
      800: '#141418',
      700: '#1D1D22',
      600: '#26262C',
      500: '#2F2F35',
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#9CA3AF',
      muted: '#6B7280',
      accent: '#FFB74D',
    },
    border: '#2A2A2F',
    brand: {
      red: '#EF4444',
      redDark: '#DC2626',
      coral: '#FF6B6B',
      warm: '#FFA726',
    },
    accent: {
      orange: '#FF8A65',
      peach: '#FFCC80',
      pink: '#F8BBD9',
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
      {children}
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
