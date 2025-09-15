import { Platform } from 'react-native';

/**
 * Platform detection utilities
 */

// Check if running on web platform
export const isWeb = Platform.OS === 'web';

// Check if running on iOS
export const isIOS = Platform.OS === 'ios';

// Check if running on Android
export const isAndroid = Platform.OS === 'android';

// Check if running on native platform (iOS or Android)
export const isNative = isIOS || isAndroid;

// Get the current platform
export const currentPlatform = Platform.OS;

// Platform-specific select helper
export const select = Platform.select;

// Platform version (only available on Android and iOS)
export const platformVersion = Platform.Version;