// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// React Native 0.79.5 specific configurations
config.resolver.useWatchman = false;
config.resolver.sourceExts.push("cjs");
config.resolver.unstable_enablePackageExports = false;

// New Hermes compatibility for React Native 0.79.5
config.transformer.hermesParser = true;
config.transformer.unstable_allowRequireContext = true;

// Enhanced resolver configuration for September 2025 standards
config.resolver.platforms = ["ios", "android", "native", "web"];
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = withNativeWind(config, { input: "./global.css" });
