# Expo SDK 54 Migration Plan

## Overview
This document outlines the step-by-step migration plan to ensure the LockerRoom app is fully compatible with Expo SDK 54, React Native 0.81, and React 19.1.

## Phase 1: Code Changes for Reanimated v4 Migration

### 1.1 Review Screen Spring Animations
- **Task**: Replace unsupported spring options in Review screens
- **Files to Check**:
  - `src/components/reviews/ReviewCard.tsx`
  - `src/components/reviews/ReviewModal.tsx`
  - `src/screens/ReviewsScreen.tsx`
- **Changes Required**:
  - Remove `restDisplacementThreshold` and `restSpeedThreshold`
  - Replace with supported keys: `damping`, `stiffness`, `mass`, `velocity`
  - Update spring animation configurations

### 1.2 Reanimated v4 API Updates
- **Task**: Update Reanimated v3.x code to v4.x
- **Files to Check**:
  - `src/components/animations/AnimatedComponents.tsx`
  - `src/components/ui/AnimatedButton.tsx`
  - `src/components/ui/AnimatedModal.tsx`
- **Changes Required**:
  - Replace `useSharedValue` with `useSharedValue` (API is similar but verify usage)
  - Update `withSpring` and `withTiming` configurations
  - Verify all `useAnimatedStyle` implementations

## Phase 2: Navigation v7 Type Safety Updates

### 2.1 Navigation Type Safety
- **Task**: Ensure navigation overloads align with v7
- **Files to Check**:
  - `src/navigation/AppNavigator.tsx`
  - `src/navigation/MainTabNavigator.tsx`
  - `src/navigation/RootNavigator.tsx`
- **Changes Required**:
  - Update navigation types to match v7
  - Ensure navigation names are valid within current navigator
  - Remove references to `'MainTabs'` from nested stacks

### 2.2 Navigation Parameter Types
- **Task**: Update navigation parameter types
- **Files to Check**:
  - `src/navigation/types.ts`
  - `src/screens/ProfileScreen.tsx`
  - `src/screens/SettingsScreen.tsx`
- **Changes Required**:
  - Update parameter types to match v7 requirements
  - Ensure type safety for all navigation calls

## Phase 3: Native Feature Configuration

### 3.1 AdMob Configuration
- **Task**: Verify AdMob plugin configuration in app.json
- **Files to Check**:
  - `app.json`
  - `src/services/ads/AdService.ts`
- **Changes Required**:
  - Ensure AdMob plugin is under `expo.plugins`
  - Verify plugin configuration matches v15.7.0 requirements

### 3.2 Vision Camera Permissions
- **Task**: Update Vision Camera permissions in app.json
- **Files to Check**:
  - `app.json`
  - `src/components/camera/CameraComponent.tsx`
- **Changes Required**:
  - Ensure camera permissions are properly configured
  - Update permission handling code

### 3.3 Notifications Configuration
- **Task**: Update Notifications configuration for SDK 54
- **Files to Check**:
  - `app.json`
  - `src/services/notifications/NotificationService.ts`
- **Changes Required**:
  - Update notification channel configurations
  - Ensure proper token handling

## Phase 4: Development Environment Setup

### 4.1 New Architecture Enablement
- **Task**: Enable New Architecture for Reanimated v4 and MMKV
- **Files to Check**:
  - `app.json`
  - `metro.config.js`
- **Changes Required**:
  - Add `"newArchEnabled": true` to app.json
  - Update Metro config if needed

### 4.2 Dev Client Setup
- **Task**: Ensure Dev Client is properly configured
- **Files to Check**:
  - `app.json`
  - `eas.json`
- **Changes Required**:
  - Verify dev client configuration
  - Update EAS build profiles if needed

## Phase 5: Testing and Validation

### 5.1 Native Feature Testing
- **Task**: Test all native features on actual devices
- **Features to Test**:
  - Vision Camera
  - Notifications
  - RevenueCat Purchases
  - AdMob
  - MMKV persistence
- **Testing Requirements**:
  - iOS: `npx expo prebuild --clean && npx expo run:ios`
  - Android: `npx expo run:android`
  - Start Metro: `npx expo start --dev-client --clear --host lan`

### 5.2 Web Compatibility Testing
- **Task**: Verify web builds run core flows
- **Files to Check**:
  - `src/web/`
  - `src/components/web/`
- **Testing Requirements**:
  - Ensure native-only services are guarded
  - Test core web functionality

## Phase 6: Code Quality and Performance

### 6.1 ESLint Warnings Reduction
- **Task**: Reduce ESLint warnings (currently ~161)
- **Files to Check**: All source files
- **Changes Required**:
  - Fix common ESLint warnings
  - Update ESLint configuration if needed

### 6.2 TypeScript Type Checking
- **Task**: Ensure TypeScript type checking passes
- **Files to Check**: All TypeScript files
- **Changes Required**:
  - Fix type errors
  - Update type definitions if needed

## Implementation Timeline

### Week 1: Phase 1-2 (Code Changes)
- Days 1-2: Reanimated v4 migration
- Days 3-4: Navigation v7 updates
- Day 5: Review and testing

### Week 2: Phase 3-4 (Configuration)
- Days 1-2: Native feature configuration
- Days 3-4: Development environment setup
- Day 5: Review and testing

### Week 3: Phase 5-6 (Testing and Quality)
- Days 1-2: Native feature testing
- Days 3-4: Code quality improvements
- Day 5: Final review and documentation

## Success Criteria

1. All dependencies are compatible with Expo SDK 54
2. Reanimated v4 animations work correctly
3. Navigation v7 is type-safe and functional
4. All native features work on actual devices
5. Web builds run core flows without errors
6. ESLint warnings are reduced to acceptable levels
7. TypeScript type checking passes without errors

## Rollback Plan

1. If issues arise during migration, revert to previous working versions
2. Keep backup of package.json and app.json before making changes
3. Test each phase thoroughly before proceeding to the next
4. Use git branches to track changes and enable easy rollback

## Resources

- Expo SDK 54 changelog: https://expo.dev/changelog/sdk-54-beta
- Reanimated v4 migration: https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- Navigation v7 documentation: https://reactnavigation.org/docs/upgrading-from-6.x/
- New Architecture guide: https://reactnative.dev/docs/new-architecture-intro