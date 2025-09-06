import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark", // Default to dark since the app is currently dark-themed
      isDarkMode: true,

      setTheme: (theme: Theme) => {
        set((state) => {
          let isDarkMode = state.isDarkMode;
          
          if (theme === "light") {
            isDarkMode = false;
          } else if (theme === "dark") {
            isDarkMode = true;
          } else if (theme === "system") {
            // For now, default to dark when system is selected
            // In a full implementation, you'd check the system theme
            isDarkMode = true;
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
