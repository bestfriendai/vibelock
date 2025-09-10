import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

export type Theme = "light" | "dark" | "system" | "high-contrast";

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  isHighContrast: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleHighContrast: () => void;
  getSystemTheme: () => "light" | "dark";
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark", // Default to dark since the app is currently dark-themed
      isDarkMode: true,
      isHighContrast: false,

      getSystemTheme: () => {
        const systemColorScheme = Appearance.getColorScheme();
        return systemColorScheme === "dark" ? "dark" : "light";
      },

      setTheme: (theme: Theme) => {
        set((state) => {
          let isDarkMode = state.isDarkMode;
          let isHighContrast = state.isHighContrast;

          if (theme === "light") {
            isDarkMode = false;
            isHighContrast = false;
          } else if (theme === "dark") {
            isDarkMode = true;
            isHighContrast = false;
          } else if (theme === "high-contrast") {
            isDarkMode = true;
            isHighContrast = true;
          } else if (theme === "system") {
            // Use real system theme detection
            const systemTheme = get().getSystemTheme();
            isDarkMode = systemTheme === "dark";
            isHighContrast = false;
          }

          return {
            theme,
            isDarkMode,
            isHighContrast,
          };
        });
      },

      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === "dark" ? "light" : "dark";
        get().setTheme(newTheme);
      },

      toggleHighContrast: () => {
        const { isHighContrast } = get();
        const newTheme = isHighContrast ? "dark" : "high-contrast";
        get().setTheme(newTheme);
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useThemeStore;
