import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from 'react-native';

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  getSystemTheme: () => "light" | "dark";
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark", // Default to dark since the app is currently dark-themed
      isDarkMode: true,

      getSystemTheme: () => {
        const systemColorScheme = Appearance.getColorScheme();
        return systemColorScheme === 'dark' ? 'dark' : 'light';
      },

      setTheme: (theme: Theme) => {
        set((state) => {
          let isDarkMode = state.isDarkMode;
          
          if (theme === "light") {
            isDarkMode = false;
          } else if (theme === "dark") {
            isDarkMode = true;
          } else if (theme === "system") {
            // Use real system theme detection
            const systemTheme = get().getSystemTheme();
            isDarkMode = systemTheme === 'dark';
          }

          return {
            theme,
            isDarkMode,
          };
        });
      },

      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === "dark" ? "light" : "dark";
        get().setTheme(newTheme);
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;
