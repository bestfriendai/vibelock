import { Dimensions, Platform } from 'react-native';
import { useState, useEffect } from 'react';

export interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

export interface DeviceInfo {
  isPhone: boolean;
  isTablet: boolean;
  isFoldable: boolean;
  isLandscape: boolean;
  deviceType: 'phone' | 'tablet' | 'foldable';
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
}

// Breakpoints for different screen sizes
export const BREAKPOINTS = {
  small: 0,      // iPhone SE, small Android phones
  medium: 375,   // iPhone 12/13/14, standard Android phones
  large: 414,    // iPhone Pro Max, large Android phones
  xlarge: 768,   // iPad Mini, Android tablets
  xxlarge: 1024, // iPad, large tablets
} as const;

// Device-specific breakpoints
export const DEVICE_BREAKPOINTS = {
  // Phone breakpoints
  phoneSmall: 320,   // iPhone SE
  phoneMedium: 375,  // iPhone 12/13/14
  phoneLarge: 414,   // iPhone Pro Max
  
  // Tablet breakpoints
  tabletSmall: 768,  // iPad Mini
  tabletMedium: 820, // iPad
  tabletLarge: 1024, // iPad Pro 11"
  tabletXLarge: 1366, // iPad Pro 12.9"
  
  // Foldable breakpoints
  foldableUnfolded: 673, // Galaxy Fold unfolded width
  foldableFolded: 280,   // Galaxy Fold folded width
} as const;

/**
 * Detect if device is likely a foldable based on screen dimensions
 */
export function detectFoldableDevice(width: number, height: number): boolean {
  // Galaxy Fold 7 dimensions: 280x653 (folded), 673x653 (unfolded)
  // Galaxy Z Flip dimensions: 374x772 (folded), 374x1772 (unfolded)
  
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  
  // Foldables typically have unusual aspect ratios
  if (Platform.OS === 'android') {
    // Very narrow when folded (Galaxy Fold)
    if (width < 300 && aspectRatio > 2.2) return true;
    
    // Very wide when unfolded (Galaxy Fold)
    if (width > 650 && width < 700 && aspectRatio < 1.2) return true;
    
    // Very tall when unfolded (Galaxy Z Flip)
    if (height > 1700 && aspectRatio > 4.5) return true;
  }
  
  return false;
}

/**
 * Get device type based on screen dimensions
 */
export function getDeviceType(width: number, height: number): DeviceInfo['deviceType'] {
  if (detectFoldableDevice(width, height)) {
    return 'foldable';
  }
  
  const minDimension = Math.min(width, height);
  
  if (minDimension >= DEVICE_BREAKPOINTS.tabletSmall) {
    return 'tablet';
  }
  
  return 'phone';
}

/**
 * Get screen size category
 */
export function getScreenSize(width: number): DeviceInfo['screenSize'] {
  if (width >= BREAKPOINTS.xlarge) return 'xlarge';
  if (width >= BREAKPOINTS.large) return 'large';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'small';
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(dimensions: ScreenDimensions): DeviceInfo {
  const { width, height } = dimensions;
  const isLandscape = width > height;
  const deviceType = getDeviceType(width, height);
  const isFoldable = deviceType === 'foldable';
  const isTablet = deviceType === 'tablet';
  const isPhone = deviceType === 'phone';
  const screenSize = getScreenSize(width);
  
  return {
    isPhone,
    isTablet,
    isFoldable,
    isLandscape,
    deviceType,
    screenSize,
  };
}

/**
 * Calculate responsive dimensions based on screen size
 */
export function getResponsiveDimensions(screenWidth: number) {
  const deviceInfo = getDeviceInfo({ width: screenWidth, height: 0, scale: 1, fontScale: 1 });
  
  // Base padding and margins
  let basePadding = 16;
  let baseMargin = 8;
  let cardGap = 12;
  
  // Adjust for different device types
  if (deviceInfo.isTablet) {
    basePadding = 24;
    baseMargin = 12;
    cardGap = 16;
  } else if (deviceInfo.isFoldable) {
    // Special handling for foldables
    if (screenWidth < DEVICE_BREAKPOINTS.foldableUnfolded) {
      // Folded state - more compact
      basePadding = 12;
      baseMargin = 6;
      cardGap = 8;
    } else {
      // Unfolded state - more spacious
      basePadding = 20;
      baseMargin = 10;
      cardGap = 14;
    }
  }
  
  // Calculate grid dimensions
  const horizontalPadding = basePadding * 2;
  const availableWidth = screenWidth - horizontalPadding;
  
  // Determine number of columns based on screen size
  let columns = 2; // Default for phones
  if (deviceInfo.isTablet) {
    if (screenWidth >= DEVICE_BREAKPOINTS.tabletLarge) {
      columns = 4; // Large tablets
    } else {
      columns = 3; // Medium tablets
    }
  } else if (deviceInfo.isFoldable && screenWidth >= DEVICE_BREAKPOINTS.foldableUnfolded) {
    columns = 3; // Unfolded foldables
  }
  
  const totalGaps = cardGap * (columns - 1);
  const cardWidth = (availableWidth - totalGaps) / columns;
  
  return {
    basePadding,
    baseMargin,
    cardGap,
    cardWidth,
    columns,
    horizontalPadding,
    availableWidth,
    deviceInfo,
  };
}

/**
 * Hook for responsive screen dimensions with device info
 */
export function useResponsiveScreen() {
  const [screenData, setScreenData] = useState(() => {
    const dimensions = Dimensions.get('window');
    return {
      ...dimensions,
      deviceInfo: getDeviceInfo(dimensions),
      responsive: getResponsiveDimensions(dimensions.width),
    };
  });
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const deviceInfo = getDeviceInfo(window);
      const responsive = getResponsiveDimensions(window.width);
      
      setScreenData({
        ...window,
        deviceInfo,
        responsive,
      });
    });
    
    return () => subscription?.remove();
  }, []);
  
  return screenData;
}

/**
 * Get font sizes based on device type
 */
export function getResponsiveFontSizes(deviceType: DeviceInfo['deviceType']) {
  const baseSizes = {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
  };
  
  if (deviceType === 'tablet') {
    return {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
    };
  }
  
  return baseSizes;
}

/**
 * Get spacing values based on device type
 */
export function getResponsiveSpacing(deviceType: DeviceInfo['deviceType']) {
  const baseSpacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  };
  
  if (deviceType === 'tablet') {
    return {
      xs: 6,
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      '2xl': 32,
      '3xl': 40,
    };
  }
  
  return baseSpacing;
}

/**
 * Hook for responsive chat styling
 */
export function useChatResponsiveStyles() {
  const { width } = useScreenDimensions();
  const deviceInfo = getDeviceInfo({ width, height: 0, scale: 1, fontScale: 1 });

  return {
    // Chat container padding
    containerPadding: deviceInfo.isTablet ? 'px-6 py-6' : 'px-4 py-4',

    // Message list padding
    messageListPadding: deviceInfo.isTablet ?
      { paddingHorizontal: 24, paddingVertical: 16 } :
      { paddingHorizontal: 16, paddingVertical: 12 },

    // Input area padding
    inputPadding: deviceInfo.isTablet ? 'px-4 py-3' : 'px-3 py-2',

    // Header padding
    headerPadding: deviceInfo.isTablet ? 'px-6 py-6' : 'px-4 py-4',

    // Member list item padding
    memberItemPadding: deviceInfo.isTablet ? 'px-6 py-4' : 'px-4 py-3',

    // Device info for conditional rendering
    deviceInfo,
  };
}
