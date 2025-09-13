import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { Appearance, View } from "react-native";
import useThemeStore from "../state/themeStore";

// Light theme colors - Professional and accessible
export const lightTheme = {
  colors: {
    background: "#FFFFFF",
    surface: {
      900: "#FFFFFF", // Main background
      800: "#F8F9FA", // Card background - subtle gray
      700: "#E9ECEF", // Secondary surface - light gray
      600: "#DEE2E6", // Tertiary surface - medium gray
      500: "#CED4DA", // Border/divider color
      400: "#ADB5BD", // Intermediate surface level
      300: "#868E96", // Lighter surface level
      200: "#495057", // Very light surface level
      100: "#343A40", // Lightest surface level
    },
    text: {
      primary: "#000000", // Pure black for main text (AAA)
      secondary: "#374151", // Darker gray for secondary text (AAA)
      muted: "#6B7280", // Medium gray for muted text (AA)
      tertiary: "#9CA3AF", // Very muted text (lighter than muted)
      accent: "#DC2626", // Red accent for highlights
      error: "#DC3545", // Error text states
    },
    border: {
      default: "#DEE2E6", // Consistent border color
      light: "#F1F3F4", // Lighter border variant
      dark: "#ADB5BD", // Darker border variant
    },
    brand: {
      red: "#DC3545", // Primary brand red (accessible)
      redLight: "#F8D7DA", // Light red background
      redDark: "#721C24", // Dark red for text on light backgrounds
      coral: "#FF6B6B", // Coral accent
      warm: "#FD7E14", // Orange accent
    },
    accent: {
      orange: "#FD7E14", // Orange accent
      peach: "#FFE5B4", // Light peach background
      pink: "#F8D7DA", // Light pink background
      blue: "#0D6EFD", // Blue accent for links/actions
      green: "#198754", // Green for success states
      yellow: "#FFC107", // Yellow for warnings
    },
    status: {
      success: "#198754", // Green for success
      warning: "#FFC107", // Yellow for warnings
      error: "#DC3545", // Red for errors
      info: "#0DCAF0", // Cyan for info
      successLight: "#D4EDDA", // Light success background
      warningLight: "#FFF3CD", // Light warning background
      errorLight: "#F8D7DA", // Light error background
      infoLight: "#CCF2FF", // Light info background
    },
  },
};

// High contrast theme colors - Maximum accessibility
export const highContrastTheme = {
  colors: {
    background: "#000000", // Pure black background
    surface: {
      900: "#000000", // Pure black main background
      800: "#1A1A1A", // Very dark gray for cards
      700: "#333333", // Dark gray for secondary surfaces
      600: "#4D4D4D", // Medium gray for tertiary surfaces
      500: "#666666", // Light gray for borders
      400: "#808080", // Intermediate surface level
      300: "#999999", // Lighter surface level
      200: "#B3B3B3", // Very light surface level
      100: "#CCCCCC", // Lightest surface level
    },
    text: {
      primary: "#FFFFFF", // Pure white for main text (AAA)
      secondary: "#E0E0E0", // Very light gray for secondary text (AAA)
      muted: "#B0B0B0", // Light gray for muted text (AA)
      tertiary: "#808080", // Very muted text (lighter than muted)
      accent: "#FFFF00", // Yellow accent for maximum contrast
      error: "#FF0000", // Error text states
    },
    border: {
      default: "#666666", // High contrast border
      light: "#808080", // Lighter border variant
      dark: "#4D4D4D", // Darker border variant
    },
    brand: {
      red: "#FF0000", // Pure red for maximum contrast
      redLight: "#330000", // Dark red background
      redDark: "#FF6666", // Light red for text
      coral: "#FF8080", // Light coral
      warm: "#FFA500", // Orange accent
    },
    accent: {
      orange: "#FFA500", // Orange accent
      peach: "#FFCC80", // Peach accent
      pink: "#FF80FF", // Pink accent
      blue: "#00FFFF", // Blue accent for links/actions
      green: "#00FF00", // Green for success states
      yellow: "#FFFF00", // Yellow for warnings
    },
    status: {
      success: "#00FF00", // Pure green
      warning: "#FFFF00", // Pure yellow
      error: "#FF0000", // Pure red
      info: "#00FFFF", // Pure cyan
      successLight: "#003300", // Light success background
      warningLight: "#333300", // Light warning background
      errorLight: "#330000", // Light error background
      infoLight: "#003333", // Light info background
    },
  },
};

// Dark theme colors - Pure black theme
export const darkTheme = {
  colors: {
    background: "#000000",
    surface: {
      900: "#000000", // Main background - pure black
      800: "#000000", // Card background - pure black
      700: "#1D1D22", // Secondary surface - medium dark
      600: "#26262C", // Tertiary surface - lighter dark
      500: "#2F2F35", // Border/divider color
      400: "#38383E", // Intermediate surface level
      300: "#414147", // Lighter surface level
      200: "#4A4A50", // Very light surface level
      100: "#535359", // Lightest surface level
    },
    text: {
      primary: "#F8F9FA", // High contrast white for main text
      secondary: "#ADB5BD", // Light gray for secondary text
      muted: "#6C757D", // Medium gray for muted text
      tertiary: "#495057", // Very muted text (lighter than muted)
      accent: "#FFB74D", // Amber accent for highlights
      error: "#EF4444", // Error text states
    },
    border: {
      default: "#2A2A2F", // Consistent border color
      light: "#38383E", // Lighter border variant
      dark: "#1C1C21", // Darker border variant
    },
    brand: {
      red: "#EF4444", // Primary brand red
      redLight: "#FEE2E2", // Light red background (for dark theme)
      redDark: "#DC2626", // Darker red variant
      coral: "#FF6B6B", // Coral accent
      warm: "#FFA726", // Orange accent
    },
    accent: {
      orange: "#FF8A65", // Orange accent
      peach: "#FFCC80", // Peach accent
      pink: "#F8BBD9", // Pink accent
      blue: "#60A5FA", // Blue accent for links/actions
      green: "#34D399", // Green for success states
      yellow: "#FBBF24", // Yellow for warnings
    },
    status: {
      success: "#10B981", // Green for success
      warning: "#F59E0B", // Yellow for warnings
      error: "#EF4444", // Red for errors
      info: "#06B6D4", // Cyan for info
      successLight: "#064E3B", // Light success background
      warningLight: "#78350F", // Light warning background
      errorLight: "#7F1D1D", // Light error background
      infoLight: "#164E63", // Light info background
    },
  },
};

// Define the theme colors type
type ThemeColors = {
  background: string;
  surface: {
    900: string;
    800: string;
    700: string;
    600: string;
    500: string;
    400: string;
    300: string;
    200: string;
    100: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    tertiary: string;
    accent: string;
    error: string;
  };
  border: {
    default: string;
    light: string;
    dark: string;
  };
  brand: {
    red: string;
    redLight: string;
    redDark: string;
    coral: string;
    warm: string;
  };
  accent: {
    orange: string;
    peach: string;
    pink: string;
    blue: string;
    green: string;
    yellow: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
    successLight: string;
    warningLight: string;
    errorLight: string;
    infoLight: string;
  };
};

interface ThemeContextType {
  theme: "light" | "dark" | "high-contrast";
  colors: ThemeColors;
  isDarkMode: boolean;
  isHighContrast?: boolean;
  setTheme: (theme: "light" | "dark" | "system" | "high-contrast") => void;
  toggleTheme: () => void;
  toggleHighContrast?: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme, isDarkMode, isHighContrast, setTheme, toggleTheme, toggleHighContrast } = useThemeStore();

  // Listen to system theme changes
  useEffect(() => {
    if (theme === "system") {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        // This will trigger the theme store to update
        setTheme("system");
      });

      return () => subscription?.remove();
    }
    return undefined;
  }, [theme, setTheme]);

  const currentTheme = isHighContrast ? "high-contrast" : isDarkMode ? "dark" : "light";
  const colors = isHighContrast ? highContrastTheme.colors : isDarkMode ? darkTheme.colors : lightTheme.colors;

  const value: ThemeContextType = {
    theme: currentTheme,
    colors,
    isDarkMode,
    isHighContrast,
    setTheme,
    toggleTheme,
    toggleHighContrast,
  };

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View className={isDarkMode ? "dark" : ""} style={{ flex: 1 }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Utility functions for theme-aware styling
export const getThemeColor = (colorPath: string, theme: "light" | "dark" | "high-contrast"): string => {
  const themeColors =
    theme === "high-contrast" ? highContrastTheme.colors : theme === "light" ? lightTheme.colors : darkTheme.colors;
  const keys = colorPath.split(".");
  let color: any = themeColors;

  for (const key of keys) {
    color = color[key];
    if (color === undefined) {
      console.warn(`Theme color path "${colorPath}" not found`);
      return theme === "light" ? "#000000" : "#FFFFFF";
    }
  }

  return color;
};

// Theme-aware class name helper
export const getThemeClass = (lightClass: string, darkClass: string, isDarkMode: boolean): string => {
  return isDarkMode ? darkClass : lightClass;
};
