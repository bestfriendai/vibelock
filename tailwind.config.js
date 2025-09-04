/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: { space: false },
  theme: {
    extend: {
      colors: {
        brand: { 
          red: "#FFFFFF", 
          redDark: "#F3F4F6",
          coral: "#FFFFFF",
          warm: "#F3F4F6"
        },
        surface: { 
          900: "#0B0B0F", 
          800: "#141418", 
          700: "#1D1D22", 
          600: "#26262C",
          500: "#2F2F35"
        },
        text: { 
          primary: "#F3F4F6", 
          secondary: "#9CA3AF", 
          muted: "#6B7280",
          accent: "#FFB74D"
        },
        border: { DEFAULT: "#2A2A2F" },
        accent: {
          orange: "#FF8A65",
          peach: "#FFCC80",
          pink: "#F8BBD9"
        }
      },
      borderRadius: { xl: "16px", "2xl": "20px" },
      fontSize: { xs: "10px", sm: "12px", base: "14px", lg: "18px", xl: "20px", "2xl": "24px", "3xl": "32px" },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");
      matchUtilities({ space: (v) => ({ gap: v }) }, { values: spacing, type: ["length", "number", "percentage"] });
      matchUtilities({ "space-x": (v) => ({ columnGap: v }) }, { values: spacing, type: ["length", "number", "percentage"] });
      matchUtilities({ "space-y": (v) => ({ rowGap: v }) }, { values: spacing, type: ["length", "number", "percentage"] });
    }),
  ],
};
