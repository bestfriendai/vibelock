/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  corePlugins: { space: false },
  theme: {
    extend: {
      colors: {
        // Dark theme colors (default)
        brand: {
          red: "#EF4444",
          redDark: "#DC2626",
          coral: "#FF6B6B",
          warm: "#FFA726",
        },
        surface: {
          900: "#0B0B0F",
          800: "#141418",
          700: "#1D1D22",
          600: "#26262C",
          500: "#2F2F35",
        },
        text: {
          primary: "#F3F4F6",
          secondary: "#9CA3AF",
          muted: "#6B7280",
          accent: "#FFB74D",
        },
        border: { DEFAULT: "#2A2A2F" },
        accent: {
          orange: "#FF8A65",
          peach: "#FFCC80",
          pink: "#F8BBD9",
        },
        // Light theme colors
        light: {
          brand: {
            red: "#DC3545",
            redLight: "#F8D7DA",
            redDark: "#721C24",
            coral: "#FF6B6B",
            warm: "#FFA726",
          },
          surface: {
            900: "#FFFFFF",
            800: "#F8F9FA",
            700: "#E9ECEF",
            600: "#DEE2E6",
            500: "#CED4DA",
          },
          text: {
            primary: "#212529",
            secondary: "#6C757D",
            muted: "#ADB5BD",
            accent: "#FF8A65",
          },
          border: "#E9ECEF",
          accent: {
            orange: "#FF8A65",
            peach: "#FFCC80",
            pink: "#F8BBD9",
          },
        },
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
      matchUtilities(
        { "space-x": (v) => ({ columnGap: v }) },
        { values: spacing, type: ["length", "number", "percentage"] },
      );
      matchUtilities(
        { "space-y": (v) => ({ rowGap: v }) },
        { values: spacing, type: ["length", "number", "percentage"] },
      );
    }),
  ],
};
