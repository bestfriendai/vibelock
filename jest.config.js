export default {
  preset: "jest-expo",
  // Let jest-expo handle transforms; add common RN packages to ignore-exception list
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|react-native-worklets|@shopify/flash-list|expo(nent)?|@expo(nent)?|expo-modules-core|@expo/vector-icons|react-native-svg|react-native-css-interop|expo-font|expo-asset|expo-constants|react-native-url-polyfill|expo-secure-store)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testEnvironment: "node",

  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.(ts|tsx|js)", "**/*.(test|spec).(ts|tsx|js)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/navigation/**", "!src/App.tsx", "!src/main.tsx"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
