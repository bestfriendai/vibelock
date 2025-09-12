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
  const isDevelopmentBuild = Constants.appOwnership !== "expo" && __DEV__;
  const isProduction = Constants.appOwnership !== "expo" && !__DEV__;

  // Package-agnostic native runtime detection
  // This detects if we're running in a native runtime environment (development build or standalone)
  // rather than coupling detection to specific packages like react-native-purchases
  const isNativeRuntime = Constants.appOwnership !== "expo" && Platform.OS !== "web";
  const hasNativeModules = isNativeRuntime;

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
