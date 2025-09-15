// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// React Native 0.81 specific configurations
config.resolver.sourceExts.push("cjs");
// Removed unstable_enablePackageExports for production stability
// config.resolver.unstable_enablePackageExports = true;

// Hermes compatibility for React Native 0.81
config.transformer.hermesParser = true;
// Enable async imports for better performance
config.transformer.asyncRequireModulePath = require.resolve("metro-runtime/src/modules/asyncRequire");
// Improved error handling for Hermes
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Production optimizations
config.transformer.inlineRequires = true;

// Resolver configuration for React Native 0.81
config.resolver.platforms = ["ios", "android", "native", "web"];
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Property conflict resolution strategies
config.resolver.alias = {
  react: require.resolve("react"),
  "react-dom": require.resolve("react-dom"),
  // Add aliases to prevent duplicate property definitions
  "react-native-reanimated": require.resolve("react-native-reanimated"),
  "react-native-url-polyfill": require.resolve("react-native-url-polyfill"),
  "react-native-get-random-values": require.resolve("react-native-get-random-values"),
};

// Enhanced resolver for property conflict handling
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check for modules that might cause property conflicts
  const problematicModules = ["react-native-reanimated", "react-native-url-polyfill", "react-native-get-random-values"];

  if (problematicModules.includes(moduleName)) {
    console.log(`[Metro] Resolving potentially problematic module: ${moduleName}`);
  }

  try {
    // Use default resolution
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    // Enhanced error handling for module resolution
    console.error(`[Metro] Failed to resolve module ${moduleName}:`, error.message);
    throw error;
  }
};

// New Architecture support - now enabled above for better performance

// SDK 54 improvements - experimentalImportSupport is enabled by default
// No need to set it explicitly as it's the default now

// Enable live bindings for better ESM support (default in SDK 54)
// Can be disabled with EXPO_UNSTABLE_LIVE_BINDINGS=false if needed

module.exports = withNativeWind(config, { input: "./global.css" });
