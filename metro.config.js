// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// React Native 0.81 specific configurations
config.resolver.sourceExts.push("cjs");
config.resolver.unstable_enablePackageExports = true;

// Hermes compatibility for React Native 0.81
config.transformer.hermesParser = true;
config.transformer.unstable_allowRequireContext = true;

// Resolver configuration for React Native 0.81
config.resolver.platforms = ["ios", "android", "native", "web"];
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Add React alias to ensure consistent version usage
config.resolver.alias = {
  react: require.resolve("react"),
  "react-dom": require.resolve("react-dom"),
};

// New Architecture support - disabled for compatibility
// config.transformer.asyncRequireModulePath = require.resolve("metro-runtime/src/modules/asyncRequire");

// SDK 54 improvements - experimentalImportSupport is enabled by default
// No need to set it explicitly as it's the default now

// Enable live bindings for better ESM support (default in SDK 54)
// Can be disabled with EXPO_UNSTABLE_LIVE_BINDINGS=false if needed

module.exports = withNativeWind(config, { input: "./global.css" });
