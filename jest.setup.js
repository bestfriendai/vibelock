/* global jest */
// Minimal Jest setup to avoid property configuration errors

// Gesture Handler setup - only import, don't modify properties
try {
  require("react-native-gesture-handler/jestSetup");
} catch (_error) {
  // Ignore if gesture handler setup fails
}

// Mock Reanimated v4 without modifying properties
jest.mock("react-native-reanimated", () => {
  try {
    const Reanimated = require("react-native-reanimated/mock");
    return Reanimated;
  } catch (_error) {
    // Return a basic mock if the official mock fails
    return {
      default: {},
      useSharedValue: jest.fn(() => ({ value: 0 })),
      useDerivedValue: jest.fn(() => ({ value: 0 })),
      useAnimatedStyle: jest.fn(() => ({})),
      withTiming: jest.fn((value) => value),
      withSpring: jest.fn((value) => value),
      runOnJS: jest.fn((fn) => fn),
    };
  }
});

// Minimal console warning filter without prototype modification
const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  const text = String(msg);
  if (text.includes("useNativeDriver") || text.includes("useNativeDriver was not specified")) {
    return;
  }
  return originalWarn.call(console, msg, ...args);
};
