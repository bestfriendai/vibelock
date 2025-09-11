// Gesture Handler setup to silence warnings in tests
import "react-native-gesture-handler/jestSetup";

// Mock Reanimated v4
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  // The mock has a default export, but some code may access methods on the default directly
  // Ensure it doesn't crash in tests
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence native animation warnings in test output
jest.spyOn(global.console, "warn").mockImplementation((msg, ...args) => {
  const text = String(msg);
  if (text.includes("useNativeDriver") || text.includes("useNativeDriver was not specified")) return;
  // @ts-ignore
  return console.__proto__.warn.call(console, msg, ...args);
});

