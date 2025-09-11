import "react-native-reanimated";
//DO NOT REMOVE THIS CODE
console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
import "./global.css";
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { LogBox } from "react-native";
LogBox.ignoreLogs([
  "Expo AV has been deprecated",
  "Disconnected from Metro",
  // Supabase's PKCE code warns if WebCrypto isn't available on RN.
  // Using plain challenge is acceptable for email/password flows.
  "WebCrypto API is not supported",
]);

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
