# Expo SDK 54 Quick Reference Guide

## Critical Compatibility Changes

### 1. React Native Reanimated v4
- **Status**: Requires New Architecture (NA) only
- **Key Changes**:
  - Removed support for `restDisplacementThreshold` and `restSpeedThreshold`
  - Use supported keys: `damping`, `stiffness`, `mass`, `velocity`
  - Requires `react-native-worklets` dependency
- **Migration**: Update spring animation configurations in all components

### 2. React Native MMKV v3
- **Status**: Requires New Architecture (NA) only
- **Key Changes**:
  - NA is now mandatory
  - Avoid Remote JS Debugger
  - Performance improvements
- **Migration**: Enable New Architecture in app.json

### 3. React Native Navigation v7
- **Status**: Compatible with Expo SDK 54
- **Key Changes**:
  - Enhanced type safety
  - Navigate to names valid within current navigator
  - Avoid using `'MainTabs'` from nested stacks
- **Migration**: Update navigation types and parameter handling

### 4. React Native Vision Camera v4
- **Status**: Requires development build (not Expo Go)
- **Key Changes**:
  - Requires proper permissions in app.json
  - Enhanced performance
  - New frame processor API
- **Migration**: Update permissions and frame processor usage

### 5. React Native Purchases (RevenueCat) v9
- **Status**: Compatible with Expo SDK 54
- **Key Changes**:
  - Requires dev build for real purchases
  - Expo Go uses Preview Mode
  - Enhanced subscription handling
- **Migration**: Update purchase flow for dev client

### 6. React Native Google Mobile Ads (AdMob) v15
- **Status**: Requires dev client
- **Key Changes**:
  - Requires config plugin in app.json
  - Enhanced ad formats
  - Improved mediation
- **Migration**: Update plugin configuration

### 7. React Native Skia v2
- **Status**: Compatible with Expo SDK 54
- **Requirements**:
  - Requires RN >= 0.79 ✅
  - Requires React >= 19 ✅
- **Migration**: No breaking changes expected

## Configuration Requirements

### app.json Updates
```json
{
  "expo": {
    "sdkVersion": "54.0.0",
    "newArchEnabled": true,
    "plugins": [
      "react-native-google-mobile-ads",
      // Other plugins
    ]
  }
}
```

### Metro Configuration
- Current custom config is acceptable for RN 0.81
- No major changes required

## Development Environment Setup

### New Architecture Enablement
1. Add `"newArchEnabled": true` to app.json
2. Run `npx expo prebuild --clean`
3. Build with `npx expo run:ios` or `npx expo run:android`

### Dev Client Setup
1. Install expo-dev-client: `npm install expo-dev-client`
2. Configure EAS build profiles
3. Start with: `npx expo start --dev-client --clear --host lan`

## Native Feature Validation

### Vision Camera
- Open capture; allow permissions; verify preview on device
- Test errors on permission denial
- Requires development build

### Notifications
- Request permission; confirm Expo push token
- Test FCM/APNs end-to-end
- Note: Remote push on Android requires development build since SDK 53

### RevenueCat Purchases
- Fetch offerings; test paywall; purchase (sandbox)
- Restore purchases; verify subscription store updates
- Requires dev client for real purchases

### AdMob
- Test App Open + Interstitial with test ads
- Verify frequency gating works
- Requires config plugin and dev client

### MMKV
- Verify persistence with New Architecture
- Avoid Remote JS Debugger
- Performance improvements

## Code Changes Required

### Reanimated v4 Migration
```javascript
// Before (v3.x)
withSpring(value, {
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01
})

// After (v4.x)
withSpring(value, {
  damping: 10,
  stiffness: 100,
  mass: 1,
  velocity: 0
})
```

### Navigation v7 Type Safety
```typescript
// Before
navigation.navigate('MainTabs', { screen: 'Profile' });

// After
navigation.navigate('Profile');
```

## Common Issues and Solutions

### 1. Reanimated v4 Build Failures
- **Issue**: Build fails with NA-related errors
- **Solution**: Ensure New Architecture is enabled in app.json

### 2. Navigation Type Errors
- **Issue**: TypeScript errors with navigation types
- **Solution**: Update navigation types to match v7 requirements

### 3. Vision Camera Permissions
- **Issue**: Camera doesn't open or shows permission errors
- **Solution**: Update app.json with proper camera permissions

### 4. AdMob Not Showing
- **Issue**: Ads not displaying
- **Solution**: Ensure config plugin is properly configured and dev client is used

### 5. Notifications Not Working
- **Issue**: Push notifications not received
- **Solution**: Use dev client for Android remote push notifications

## Testing Checklist

- [ ] New Architecture is enabled
- [ ] Dev client builds successfully
- [ ] Reanimated animations work correctly
- [ ] Navigation is type-safe and functional
- [ ] Vision Camera opens and captures
- [ ] Notifications are received
- [ ] RevenueCat purchases work
- [ ] AdMob ads display
- [ ] MMKV persistence works
- [ ] Web builds run core flows

## Resources

- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54-beta)
- [Reanimated v4 Migration Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
- [Navigation v7 Documentation](https://reactnavigation.org/docs/upgrading-from-6.x/)
- [New Architecture Guide](https://reactnative.dev/docs/new-architecture-intro)