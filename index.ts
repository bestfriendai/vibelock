// CRITICAL: Polyfills must be imported first for Expo SDK 54
// This fixes "Property 'crypto' doesn't exist" error
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

// Import react-native-reanimated after polyfills
// Reanimated v4 is included with SDK 54 and configured automatically
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
