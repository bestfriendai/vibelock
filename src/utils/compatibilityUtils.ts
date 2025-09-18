/**
 * React Native 0.81.4 + Expo 54 Compatibility Utilities
 *
 * Provides compatibility checks, workarounds, and optimizations for the
 * React Native 0.81.4 + Expo 54 combination. Handles known issues and
 * ensures optimal performance across different platforms and environments.
 */

import { Platform, Dimensions, NativeModules } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

// Version constants
export const REACT_NATIVE_VERSION = "0.81.4";
export const EXPO_SDK_VERSION = 54;
export const MINIMUM_SUPPORTED_IOS_VERSION = "13.0";
export const MINIMUM_SUPPORTED_ANDROID_VERSION = 23;

// Known compatibility issues for RN 0.81.4 + Expo 54
interface CompatibilityIssue {
  id: string;
  description: string;
  platforms: ("ios" | "android" | "web")[];
  severity: "critical" | "major" | "minor";
  workaround?: string;
  affectedFeatures: string[];
}

const KNOWN_ISSUES: CompatibilityIssue[] = [
  {
    id: "rn0814_hermes_performance",
    description: "Hermes performance optimization needed for RN 0.81.4",
    platforms: ["android"],
    severity: "minor",
    workaround: "Enable Hermes optimizations in metro.config.js",
    affectedFeatures: ["startup_time", "memory_usage"],
  },
  {
    id: "expo54_new_architecture",
    description: "Partial New Architecture support in Expo 54",
    platforms: ["ios", "android"],
    severity: "minor",
    workaround: "Disable New Architecture for compatibility",
    affectedFeatures: ["performance", "module_compatibility"],
  },
  {
    id: "ios_splash_screen_timing",
    description: "iOS splash screen timing issues with RN 0.81.4",
    platforms: ["ios"],
    severity: "minor",
    workaround: "Use delayed splash screen hiding",
    affectedFeatures: ["splash_screen"],
  },
  {
    id: "android_notification_permissions",
    description: "Android 13+ notification permission handling",
    platforms: ["android"],
    severity: "major",
    workaround: "Request permissions explicitly in RN 0.81.4",
    affectedFeatures: ["push_notifications"],
  },
];

// Compatibility check result
interface CompatibilityResult {
  isCompatible: boolean;
  version: {
    reactNative: string;
    expo: number;
    platform: string;
    platformVersion: string;
  };
  issues: CompatibilityIssue[];
  warnings: string[];
  optimizations: string[];
  recommendations: string[];
}

// Feature availability detection
interface FeatureAvailability {
  hermes: boolean;
  newArchitecture: boolean;
  turboModules: boolean;
  fabric: boolean;
  jsi: boolean;
  codegen: boolean;
  flipper: boolean;
  reanimated3: boolean;
}

class CompatibilityChecker {
  private static instance: CompatibilityChecker;
  private compatibilityResult: CompatibilityResult | null = null;
  private featureAvailability: FeatureAvailability | null = null;

  static getInstance(): CompatibilityChecker {
    if (!CompatibilityChecker.instance) {
      CompatibilityChecker.instance = new CompatibilityChecker();
    }
    return CompatibilityChecker.instance;
  }

  /**
   * Perform comprehensive compatibility check for RN 0.81.4 + Expo 54
   */
  checkCompatibility(): CompatibilityResult {
    if (this.compatibilityResult) {
      return this.compatibilityResult;
    }

    const result: CompatibilityResult = {
      isCompatible: true,
      version: this.getVersionInfo(),
      issues: [],
      warnings: [],
      optimizations: [],
      recommendations: [],
    };

    // Check for known issues
    this.checkKnownIssues(result);

    // Check platform compatibility
    this.checkPlatformCompatibility(result);

    // Check dependency compatibility
    this.checkDependencyCompatibility(result);

    // Add performance optimizations
    this.addPerformanceOptimizations(result);

    // Add recommendations
    this.addRecommendations(result);

    this.compatibilityResult = result;
    return result;
  }

  /**
   * Get current version information
   */
  private getVersionInfo() {
    return {
      reactNative: REACT_NATIVE_VERSION,
      expo: Constants.expoVersion ? parseInt(Constants.expoVersion.split(".")[0]!) : EXPO_SDK_VERSION,
      platform: Platform.OS,
      platformVersion: Platform.Version.toString(),
    };
  }

  /**
   * Check for known compatibility issues
   */
  private checkKnownIssues(result: CompatibilityResult): void {
    KNOWN_ISSUES.forEach((issue) => {
      if (issue.platforms.includes(Platform.OS as any)) {
        result.issues.push(issue);

        if (issue.severity === "critical") {
          result.isCompatible = false;
        }

        if (issue.workaround) {
          result.optimizations.push(`${issue.id}: ${issue.workaround}`);
        }
      }
    });
  }

  /**
   * Check platform-specific compatibility
   */
  private checkPlatformCompatibility(result: CompatibilityResult): void {
    if (Platform.OS === "ios") {
      const iosVersion = parseFloat(Platform.Version as string);
      const minVersion = parseFloat(MINIMUM_SUPPORTED_IOS_VERSION);

      if (iosVersion < minVersion) {
        result.warnings.push(
          `iOS ${Platform.Version} is below minimum supported version ${MINIMUM_SUPPORTED_IOS_VERSION}`,
        );
        result.isCompatible = false;
      }

      // iOS 17+ specific checks
      if (iosVersion >= 17) {
        result.warnings.push("iOS 17+ detected - verify all features work correctly");
      }
    }

    if (Platform.OS === "android") {
      const androidVersion = Platform.Version as number;

      if (androidVersion < MINIMUM_SUPPORTED_ANDROID_VERSION) {
        result.warnings.push(
          `Android API ${androidVersion} is below minimum supported version ${MINIMUM_SUPPORTED_ANDROID_VERSION}`,
        );
        result.isCompatible = false;
      }

      // Android 13+ notification permissions
      if (androidVersion >= 33) {
        result.recommendations.push("Request notification permissions explicitly for Android 13+");
      }
    }

    // Web platform checks
    if (Platform.OS === "web") {
      result.warnings.push("Web platform compatibility with React Native 0.81.4 has limitations");
    }
  }

  /**
   * Check dependency compatibility
   */
  private checkDependencyCompatibility(result: CompatibilityResult): void {
    try {
      // Check if running in Expo Go
      if (Constants.appOwnership === "expo") {
        result.warnings.push("Running in Expo Go - some native modules may not be available");
      }

      // Check for new architecture compatibility
      if (this.isNewArchitectureEnabled()) {
        result.warnings.push("New Architecture detected - verify all dependencies are compatible");
      }

      // Check for Hermes
      if (this.isHermesEnabled()) {
        result.optimizations.push("Hermes enabled - JavaScript performance optimized");
      } else if (Platform.OS === "android") {
        result.recommendations.push("Enable Hermes for better Android performance");
      }
    } catch (error) {
      result.warnings.push(`Dependency compatibility check failed: ${error}`);
    }
  }

  /**
   * Add performance optimizations for RN 0.81.4 + Expo 54
   */
  private addPerformanceOptimizations(result: CompatibilityResult): void {
    result.optimizations.push(
      "Enable RAM bundles for better memory management",
      "Use Flipper conditionally in development only",
      "Optimize Metro bundler configuration for RN 0.81.4",
      "Enable ProGuard/R8 optimization for Android release builds",
    );

    if (Platform.OS === "ios") {
      result.optimizations.push(
        "Use iOS deployment target 13.0+ for better performance",
        "Enable dead code stripping in Xcode build settings",
      );
    }

    if (Platform.OS === "android") {
      result.optimizations.push(
        "Enable Hermes for better JavaScript performance",
        "Use Android Gradle Plugin 8.0+ for build optimization",
      );
    }
  }

  /**
   * Add recommendations for optimal setup
   */
  private addRecommendations(result: CompatibilityResult): void {
    result.recommendations.push(
      "Update to latest patch versions of React Native 0.81.x",
      "Use EAS Build for consistent build environment",
      "Test thoroughly on both iOS and Android devices",
      "Monitor app performance after RN 0.81.4 migration",
    );

    if (!this.isHermesEnabled() && Platform.OS === "android") {
      result.recommendations.push("Enable Hermes for significant Android performance improvements");
    }
  }

  /**
   * Detect available features in current environment
   */
  detectFeatures(): FeatureAvailability {
    if (this.featureAvailability) {
      return this.featureAvailability;
    }

    const features: FeatureAvailability = {
      hermes: this.isHermesEnabled(),
      newArchitecture: this.isNewArchitectureEnabled(),
      turboModules: this.isTurboModulesEnabled(),
      fabric: this.isFabricEnabled(),
      jsi: this.isJSIAvailable(),
      codegen: this.isCodegenAvailable(),
      flipper: this.isFlipperAvailable(),
      reanimated3: this.isReanimated3Available(),
    };

    this.featureAvailability = features;
    return features;
  }

  /**
   * Check if Hermes is enabled
   */
  private isHermesEnabled(): boolean {
    try {
      return (global as any).HermesInternal != null;
    } catch {
      return false;
    }
  }

  /**
   * Check if New Architecture is enabled
   */
  private isNewArchitectureEnabled(): boolean {
    try {
      return (global as any)._IS_NEW_ARCHITECTURE_ENABLED === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if TurboModules are enabled
   */
  private isTurboModulesEnabled(): boolean {
    try {
      return (global as any).__turboModuleProxy != null;
    } catch {
      return false;
    }
  }

  /**
   * Check if Fabric is enabled
   */
  private isFabricEnabled(): boolean {
    try {
      return (global as any).nativeFabricUIManager != null;
    } catch {
      return false;
    }
  }

  /**
   * Check if JSI is available
   */
  private isJSIAvailable(): boolean {
    try {
      return (global as any)._IS_JSI_AVAILABLE === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Codegen is available
   */
  private isCodegenAvailable(): boolean {
    try {
      return NativeModules.RNCodegenNativeModule != null;
    } catch {
      return false;
    }
  }

  /**
   * Check if Flipper is available
   */
  private isFlipperAvailable(): boolean {
    try {
      return __DEV__ && (global as any)._IS_FLIPPER_AVAILABLE === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Reanimated 3 is available
   */
  private isReanimated3Available(): boolean {
    try {
      return (global as any)._REANIMATED !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Apply compatibility workarounds
   */
  applyWorkarounds(): void {
    this.applyHermesOptimizations();
    this.applyPlatformSpecificFixes();
    this.applyMemoryOptimizations();
    this.applySplashScreenFixes();
  }

  /**
   * Apply Hermes-specific optimizations
   */
  private applyHermesOptimizations(): void {
    if (this.isHermesEnabled()) {
      // Enable Hermes-specific optimizations
      if ((global as any).HermesInternal) {
        try {
          // Configure Hermes for optimal performance
          (global as any).HermesInternal.setHeapTracking?.(false);
        } catch (error) {
          console.warn("Failed to apply Hermes optimizations:", error);
        }
      }
    }
  }

  /**
   * Apply platform-specific fixes
   */
  private applyPlatformSpecificFixes(): void {
    if (Platform.OS === "ios") {
      // iOS-specific fixes for RN 0.81.4
      this.applyiOSFixes();
    }

    if (Platform.OS === "android") {
      // Android-specific fixes for RN 0.81.4
      this.applyAndroidFixes();
    }
  }

  /**
   * Apply iOS-specific fixes
   */
  private applyiOSFixes(): void {
    // Fix for iOS splash screen timing issues
    if (Platform.OS === "ios") {
      // Implemented in useAppInitialization
    }
  }

  /**
   * Apply Android-specific fixes
   */
  private applyAndroidFixes(): void {
    // Fix for Android notification permissions
    if (Platform.OS === "android" && Platform.Version >= 33) {
      // Notification permission handling implemented in notificationService
    }
  }

  /**
   * Apply memory optimizations
   */
  private applyMemoryOptimizations(): void {
    // Enable memory optimizations for RN 0.81.4
    if (__DEV__) {
      // Development optimizations
      console.log("[Compatibility] Applying development memory optimizations");
    } else {
      // Production optimizations
      // Disable console logs in production
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};
    }
  }

  /**
   * Apply splash screen fixes
   */
  private applySplashScreenFixes(): void {
    // Platform-specific splash screen timing fixes
    // Implementation deferred to useAppInitialization
  }

  /**
   * Get device and platform information for diagnostics
   */
  getDiagnosticInfo() {
    const { width, height } = Dimensions.get("window");
    const screenData = Dimensions.get("screen");

    return {
      device: {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        modelId: Device.modelId,
        designName: Device.designName,
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
        supportedCpuArchitectures: Device.supportedCpuArchitectures,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
      },
      platform: {
        os: Platform.OS,
        version: Platform.Version,
        constants: Platform.constants,
      },
      screen: {
        window: { width, height },
        screen: screenData,
        pixelRatio: screenData.scale,
        fontScale: screenData.fontScale,
      },
      expo: {
        version: Constants.expoVersion,
        sdkVersion: Constants.expoConfig?.sdkVersion,
        appOwnership: Constants.appOwnership,
        isDevice: Constants.isDevice,
        platform: Platform.OS,
      },
      features: this.detectFeatures(),
      compatibility: this.checkCompatibility(),
    };
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();
  private static enabled = __DEV__;

  static startMeasurement(label: string): void {
    if (!this.enabled) return;
    this.measurements.set(label, Date.now());
  }

  static endMeasurement(label: string): number | null {
    if (!this.enabled) return null;

    const startTime = this.measurements.get(label);
    if (!startTime) return null;

    const duration = Date.now() - startTime;
    this.measurements.delete(label);

    console.log(`[Performance] ${label}: ${duration}ms`);
    return duration;
  }

  static measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
    this.startMeasurement(label);
    return operation().finally(() => {
      this.endMeasurement(label);
    });
  }

  static getMemoryUsage(): any {
    if ((global as any).performance?.memory) {
      return {
        usedJSHeapSize: (global as any).performance.memory.usedJSHeapSize,
        totalJSHeapSize: (global as any).performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: (global as any).performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  }
}

// Migration helpers for RN 0.81.4 compatibility
export class MigrationHelper {
  /**
   * Update component for RN 0.81.4 compatibility
   */
  static applyRN0814Updates(componentCode: string): string {
    // Apply known migration patterns
    return (
      componentCode
        // Update deprecated ViewPropTypes usage
        .replace(/ViewPropTypes/g, "ViewStyle")
        // Update deprecated ColorPropType usage
        .replace(/ColorPropType/g, "string")
        // Update deprecated EdgeInsetsPropType usage
        .replace(/EdgeInsetsPropType/g, "object")
    );
  }

  /**
   * Check for deprecated API usage
   */
  static checkDeprecatedAPIs(): string[] {
    const warnings: string[] = [];

    // Check for common deprecated patterns
    if ((global as any).ViewPropTypes) {
      warnings.push("ViewPropTypes is deprecated - use ViewStyle instead");
    }

    return warnings;
  }
}

// Export singleton instance and utilities
export const compatibilityChecker = CompatibilityChecker.getInstance();

// Convenience exports
export const checkCompatibility = () => compatibilityChecker.checkCompatibility();
export const detectFeatures = () => compatibilityChecker.detectFeatures();
export const applyWorkarounds = () => compatibilityChecker.applyWorkarounds();
export const getDiagnosticInfo = () => compatibilityChecker.getDiagnosticInfo();

// Default export
export default {
  CompatibilityChecker,
  PerformanceMonitor,
  MigrationHelper,
  checkCompatibility,
  detectFeatures,
  applyWorkarounds,
  getDiagnosticInfo,
  REACT_NATIVE_VERSION,
  EXPO_SDK_VERSION,
};
