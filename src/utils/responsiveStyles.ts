import { StyleSheet } from 'react-native';
import { DeviceInfo, getResponsiveFontSizes, getResponsiveSpacing } from './responsive';

/**
 * Create responsive styles based on device type
 */
export function createResponsiveStyles(deviceInfo: DeviceInfo) {
  const fontSizes = getResponsiveFontSizes(deviceInfo.deviceType);
  const spacing = getResponsiveSpacing(deviceInfo.deviceType);
  
  return StyleSheet.create({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: '#0B0B0F',
    },
    
    safeContainer: {
      flex: 1,
      backgroundColor: '#0B0B0F',
    },
    
    // Card styles
    card: {
      backgroundColor: '#141418',
      borderRadius: deviceInfo.isTablet ? 20 : 16,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: '#2A2A2F',
    },
    
    cardSmall: {
      backgroundColor: '#141418',
      borderRadius: deviceInfo.isTablet ? 16 : 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: '#2A2A2F',
    },
    
    // Text styles
    heading1: {
      fontSize: fontSizes['3xl'],
      fontWeight: '700',
      color: '#F3F4F6',
      marginBottom: spacing.lg,
    },
    
    heading2: {
      fontSize: fontSizes['2xl'],
      fontWeight: '600',
      color: '#F3F4F6',
      marginBottom: spacing.md,
    },
    
    heading3: {
      fontSize: fontSizes.xl,
      fontWeight: '600',
      color: '#F3F4F6',
      marginBottom: spacing.sm,
    },
    
    bodyLarge: {
      fontSize: fontSizes.lg,
      color: '#F3F4F6',
      lineHeight: fontSizes.lg * 1.5,
    },
    
    body: {
      fontSize: fontSizes.base,
      color: '#F3F4F6',
      lineHeight: fontSizes.base * 1.5,
    },
    
    bodySmall: {
      fontSize: fontSizes.sm,
      color: '#9CA3AF',
      lineHeight: fontSizes.sm * 1.4,
    },
    
    caption: {
      fontSize: fontSizes.xs,
      color: '#6B7280',
      lineHeight: fontSizes.xs * 1.3,
    },
    
    // Button styles
    buttonPrimary: {
      backgroundColor: '#EF4444',
      borderRadius: deviceInfo.isTablet ? 12 : 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#EF4444',
      borderRadius: deviceInfo.isTablet ? 12 : 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    buttonText: {
      fontSize: fontSizes.base,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    
    buttonTextSecondary: {
      fontSize: fontSizes.base,
      fontWeight: '600',
      color: '#EF4444',
    },
    
    // Input styles
    input: {
      backgroundColor: '#1D1D22',
      borderWidth: 1,
      borderColor: '#2A2A2F',
      borderRadius: deviceInfo.isTablet ? 12 : 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: fontSizes.base,
      color: '#F3F4F6',
    },
    
    inputFocused: {
      borderColor: '#EF4444',
    },
    
    // Layout styles
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    rowSpaceBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    column: {
      flexDirection: 'column',
    },
    
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Spacing utilities
    marginXS: { margin: spacing.xs },
    marginSM: { margin: spacing.sm },
    marginMD: { margin: spacing.md },
    marginLG: { margin: spacing.lg },
    marginXL: { margin: spacing.xl },
    
    paddingXS: { padding: spacing.xs },
    paddingSM: { padding: spacing.sm },
    paddingMD: { padding: spacing.md },
    paddingLG: { padding: spacing.lg },
    paddingXL: { padding: spacing.xl },
    
    // Margin specific directions
    marginTopXS: { marginTop: spacing.xs },
    marginTopSM: { marginTop: spacing.sm },
    marginTopMD: { marginTop: spacing.md },
    marginTopLG: { marginTop: spacing.lg },
    marginTopXL: { marginTop: spacing.xl },
    
    marginBottomXS: { marginBottom: spacing.xs },
    marginBottomSM: { marginBottom: spacing.sm },
    marginBottomMD: { marginBottom: spacing.md },
    marginBottomLG: { marginBottom: spacing.lg },
    marginBottomXL: { marginBottom: spacing.xl },
    
    marginHorizontalXS: { marginHorizontal: spacing.xs },
    marginHorizontalSM: { marginHorizontal: spacing.sm },
    marginHorizontalMD: { marginHorizontal: spacing.md },
    marginHorizontalLG: { marginHorizontal: spacing.lg },
    marginHorizontalXL: { marginHorizontal: spacing.xl },
    
    marginVerticalXS: { marginVertical: spacing.xs },
    marginVerticalSM: { marginVertical: spacing.sm },
    marginVerticalMD: { marginVertical: spacing.md },
    marginVerticalLG: { marginVertical: spacing.lg },
    marginVerticalXL: { marginVertical: spacing.xl },
    
    // Padding specific directions
    paddingTopXS: { paddingTop: spacing.xs },
    paddingTopSM: { paddingTop: spacing.sm },
    paddingTopMD: { paddingTop: spacing.md },
    paddingTopLG: { paddingTop: spacing.lg },
    paddingTopXL: { paddingTop: spacing.xl },
    
    paddingBottomXS: { paddingBottom: spacing.xs },
    paddingBottomSM: { paddingBottom: spacing.sm },
    paddingBottomMD: { paddingBottom: spacing.md },
    paddingBottomLG: { paddingBottom: spacing.lg },
    paddingBottomXL: { paddingBottom: spacing.xl },
    
    paddingHorizontalXS: { paddingHorizontal: spacing.xs },
    paddingHorizontalSM: { paddingHorizontal: spacing.sm },
    paddingHorizontalMD: { paddingHorizontal: spacing.md },
    paddingHorizontalLG: { paddingHorizontal: spacing.lg },
    paddingHorizontalXL: { paddingHorizontal: spacing.xl },
    
    paddingVerticalXS: { paddingVertical: spacing.xs },
    paddingVerticalSM: { paddingVertical: spacing.sm },
    paddingVerticalMD: { paddingVertical: spacing.md },
    paddingVerticalLG: { paddingVertical: spacing.lg },
    paddingVerticalXL: { paddingVertical: spacing.xl },
    
    // Device-specific styles
    foldableAdjustment: deviceInfo.isFoldable ? {
      paddingHorizontal: deviceInfo.screenSize === 'small' ? spacing.sm : spacing.lg,
    } : {},
    
    tabletAdjustment: deviceInfo.isTablet ? {
      paddingHorizontal: spacing['2xl'],
      paddingVertical: spacing.xl,
    } : {},
    
    // Shadow styles (iOS only)
    shadow: {
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5, // Android shadow
    },
    
    shadowLarge: {
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6.27,
      elevation: 10, // Android shadow
    },
  });
}

/**
 * Hook to get responsive styles based on current device
 */
export function useResponsiveStyles() {
  // This would typically use the responsive hook, but for now we'll create a basic version
  // In a real implementation, you'd want to use the useResponsiveScreen hook
  const deviceInfo: DeviceInfo = {
    isPhone: true,
    isTablet: false,
    isFoldable: false,
    isLandscape: false,
    deviceType: 'phone',
    screenSize: 'medium',
  };
  
  return createResponsiveStyles(deviceInfo);
}

/**
 * Get responsive icon sizes based on device type
 */
export function getResponsiveIconSizes(deviceType: DeviceInfo['deviceType']) {
  if (deviceType === 'tablet') {
    return {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
      xl: 32,
    };
  }
  
  return {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  };
}

/**
 * Get responsive border radius values
 */
export function getResponsiveBorderRadius(deviceType: DeviceInfo['deviceType']) {
  if (deviceType === 'tablet') {
    return {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      '2xl': 24,
    };
  }
  
  return {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
  };
}
