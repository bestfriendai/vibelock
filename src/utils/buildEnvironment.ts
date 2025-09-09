import Constants from "expo-constants";
import { Platform } from "react-native";

export interface BuildEnvironment {
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  isProduction: boolean;
  hasNativeModules: boolean;
}

export const getBuildEnvironment = (): BuildEnvironment => {
  const isExpoGo = Constants.appOwnership === "expo";
  const isDevelopmentBuild = Constants.appOwnership === "standalone" && __DEV__;
  const isProduction = Constants.appOwnership === "standalone" && !__DEV__;

  // Check if native modules are available
  let hasNativeModules = false;
  try {
    // Try to check if we're in a development build with native modules
    // Use a safer approach that doesn't cause runtime errors
    const purchases = require.resolve("react-native-purchases");
    hasNativeModules = !!purchases && !isExpoGo;
  } catch (error) {
    // Package not found or not available, which is fine for Expo Go
    hasNativeModules = false;
  }

  return {
    isExpoGo,
    isDevelopmentBuild,
    isProduction,
    hasNativeModules,
  };
};

export const buildEnv = getBuildEnvironment();

// Helper functions
export const canUseRevenueCat = () => buildEnv.hasNativeModules && !buildEnv.isExpoGo;
export const canUseAdMob = () => buildEnv.hasNativeModules && !buildEnv.isExpoGo;
export const shouldShowMonetization = () => !buildEnv.isExpoGo;

// Debug logging
if (__DEV__) {
  console.log("Build Environment:", {
    isExpoGo: buildEnv.isExpoGo,
    isDevelopmentBuild: buildEnv.isDevelopmentBuild,
    isProduction: buildEnv.isProduction,
    hasNativeModules: buildEnv.hasNativeModules,
    canUseRevenueCat: canUseRevenueCat(),
    canUseAdMob: canUseAdMob(),
  });
}
