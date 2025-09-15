// Initialize property guards and debugging before any other imports
import { initializePropertyGuards } from "./src/utils/propertyGuards";
import { initializeHermesCompatibility } from "./src/utils/hermesCompatibility";

// Enable property conflict monitoring and Hermes compatibility
try {
  console.log("[Index] Initializing property guards and Hermes compatibility...");

  // Initialize Hermes compatibility first to set up engine-specific workarounds
  const hermesInfo = initializeHermesCompatibility();
  console.log("[Index] Hermes engine info:", hermesInfo);

  // Initialize property guards to monitor for conflicts
  initializePropertyGuards();

  console.log("[Index] Property guards and Hermes compatibility initialized successfully");
} catch (error) {
  console.error("[Index] Failed to initialize property guards:", error);
  // Continue loading but with reduced safety
}

// Load polyfills using the centralized configuration
import { loadPolyfillsSync, validatePolyfills } from "./src/config/polyfillConfig";

// Load polyfills with conflict detection
try {
  console.log("[Index] Loading polyfills with conflict detection...");
  const polyfillResults = loadPolyfillsSync();

  // Log polyfill loading results
  for (const result of polyfillResults) {
    if (result.success) {
      console.log(`[Index] ✅ Polyfill ${result.name} loaded successfully`);
    } else if (result.skipped) {
      console.log(`[Index] ⏭️ Polyfill ${result.name} skipped: ${result.skipReason}`);
    } else {
      console.error(`[Index] ❌ Polyfill ${result.name} failed:`, result.error?.message);
    }
  }

  // Validate that all required polyfills are working
  const polyfillsValid = validatePolyfills();
  if (!polyfillsValid) {
    console.warn("[Index] Some required polyfills failed validation");
  }
} catch (error) {
  console.error("[Index] Critical error during polyfill loading:", error);

  // Fallback to direct imports as last resort
  console.log("[Index] Falling back to direct polyfill imports...");
  try {
    require("react-native-get-random-values");
    require("react-native-url-polyfill/auto");
  } catch (fallbackError) {
    console.error("[Index] Fallback polyfill loading also failed:", fallbackError);
  }
}

// Import react-native-reanimated after polyfills are loaded
import "react-native-reanimated";

//DO NOT REMOVE THIS CODE
import "./global.css";

import { LogBox } from "react-native";
LogBox.ignoreLogs([
  "Expo AV has been deprecated",
  "Disconnected from Metro",
  // Supabase's PKCE code warns if WebCrypto isn't available on RN.
  // Using plain challenge is acceptable for email/password flows.
  "WebCrypto API is not supported",
  // Property guard warnings (expected during debugging)
  "PropertyGuards",
  "HermesCompatibility",
]);

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
