# Expo 54 Compatibility Fix Plan

## Overview
This document outlines the comprehensive fix plan for making the LockerRoom app fully compatible with Expo SDK 54, React Native 0.81, and React 19.1.

## Priority Levels
- **High**: Critical fixes that impact functionality or cause errors
- **Medium**: Important improvements that enhance stability or maintainability
- **Low**: Nice-to-have optimizations and cleanup

## Fix Plan

### 1. Root Directory Fixes (High Priority)

#### 1.1 App.tsx
- [ ] Remove unused `StatusBar` import
- [ ] Validate deep linking routes for manual E2E testing

#### 1.2 index.ts
- [ ] Verify Reanimated import is first
- [ ] Confirm CSS/polyfills are properly loaded
- [ ] Check LogBox filters are appropriate

#### 1.3 babel.config.js
- [ ] Ensure `react-native-worklets/plugin` is last
- [ ] Consider moving `"nativewind/babel"` to `plugins` (not `presets`) after device validation

#### 1.4 metro.config.js
- [ ] Simplify to Expo defaults post-validation

#### 1.5 app.json
- [ ] Confirm AdMob plugin block is under `expo.plugins` with proper app IDs

### 2. Navigation Fixes (High Priority)

#### 2.1 AppNavigator.tsx
- [ ] Remove unused imports: `ComponentErrorBoundary`, `insets`, `colors`
- [ ] Ensure navigation overloads align with v7
- [ ] Fix navigation to use valid routes within current navigator
- [ ] Avoid using `'MainTabs'` from nested stacks

### 3. Screen Fixes (High Priority)

#### 3.1 BrowseScreen.tsx
- [ ] Remove unused imports: `theme`, `isDarkMode`, `loadWithFilters`
- [ ] Remove unused error variables
- [ ] Ensure list keys/types are correct

#### 3.2 SearchScreen.tsx
- [ ] Fix navigation: Don't call `navigate("MainTabs")` from SearchStack
- [ ] Use valid routes for that navigator or bubble to root stack

#### 3.3 CreateReviewScreen.tsx
- [ ] Remove unused helper imports
- [ ] Fix hook dependencies (e.g., `mediaCount`)
- [ ] Validate image/video attach limits
- [ ] Add user-facing error messages for limits

#### 3.4 NotificationsScreen.tsx
- [ ] Remove unused error variables
- [ ] Ensure permission request flow matches SDK 54 requirements

#### 3.5 ProfileScreen.tsx
- [ ] Remove unused toggles/variables
- [ ] Add accessible labels for switches and buttons

#### 3.6 SignInScreen.tsx / SignUpScreen.tsx
- [ ] Fix hook dependencies for staged animations
- [ ] Remove unused error variables

#### 3.7 ReviewDetailScreen.tsx + .backup.tsx
- [ ] Remove unsupported Reanimated v4 spring option `restDisplacementThreshold`
- [ ] Replace with supported keys: `damping`, `stiffness`, `mass`, `velocity`, `overshootClamping`, `energyThreshold`, `reduceMotion`

#### 3.8 ChatroomsScreen.tsx / ChatRoomScreen.tsx
- [ ] Validate FlashList props (estimated sizes)
- [ ] Remove unused comparisons

### 4. Component Fixes (Medium Priority)

#### 4.1 AdBanner.tsx
- [ ] Keep dynamic import guarded by `canUseAdMob()`
- [ ] Confirm plugin IDs and test IDs for debug builds

#### 4.2 Animated Components
- [ ] Fix hook dependencies in all animated components
- [ ] Remove unused `withTiming`/`withSpring`/`FadeIn/FadeOut` imports
- [ ] Ensure worklet code avoids non-serializable refs/closures

#### 4.3 ImageCarousel.tsx
- [ ] In effect cleanup, snapshot `prefetchedUrisRef.current` at effect start

#### 4.4 ScreenErrorBoundary.tsx
- [ ] Add `displayName` or convert to named component

#### 4.5 Media Components
- [ ] Remove unused constants in media components
- [ ] Fix effect dependencies for spinners/viewer
- [ ] Re-verify media type handling and zero-byte prevention

### 5. Service Fixes (Medium Priority)

#### 5.1 notificationService.ts / notificationHelpers.ts
- [ ] Remove unused `appError`
- [ ] Remove unreachable code
- [ ] Ensure channels created pre-token on Android 13+

#### 5.2 adMobService.ts
- [ ] Remove unused imports
- [ ] Test frequency capping (`postCreation`/`chatExit`)

#### 5.3 locationService.ts
- [ ] Remove unused error variables
- [ ] Ensure platform geolocation permissions consistent with UI

#### 5.4 storageService.ts / utils/FileDownloader.ts
- [ ] Ensure correct conversion to `Blob` parts from buffers on RN 0.81
- [ ] Prefer `Blob([Uint8Array])` or use `FileSystem.uploadAsync` with correct `contentType`

#### 5.5 realtimeChat.ts
- [ ] Confirm cleanup paths run on unmount/background
- [ ] Verify reconnection logic with Supabase Realtime

### 6. State Management Fixes (Medium Priority)

#### 6.1 State Stores
- [ ] Remove unused variables in all state stores
- [ ] Document mock paths for web (Purchases/Ads disabled or mocked)

### 7. Provider Fixes (Medium Priority)

#### 7.1 ThemeProvider.tsx
- [ ] Ensure `ThemeColors` type matches concrete object
- [ ] Include `accent`, `status` subkeys
- [ ] Avoid widening types by precisely shaping the theme object

### 8. Utility Fixes (Low Priority)

#### 8.1 buildEnvironment.ts
- [ ] Verify `expo-constants.appOwnership` + `Platform` logic
- [ ] Keep semantics of `hasNativeModules` consistent with mock strategy

#### 8.2 Error Handling Utilities
- [ ] Remove unused helpers in errorHandling.ts, mediaErrorHandling.ts, authUtils.ts
- [ ] Keep consistent error enums

#### 8.3 location.ts
- [ ] Remove unused locals
- [ ] Confirm geocoding fallbacks and mock lookup logic

#### 8.4 supabaseTestSuite.ts
- [ ] Remove unused `AppError`, `data` locals or wire them into tests

### 9. Configuration Fixes (High Priority)

#### 9.1 admobConfig.ts
- [ ] Validate test vs production unit IDs
- [ ] Keep SKAdNetwork IDs updated
- [ ] Verify plugin configuration present in `app.json`

#### 9.2 supabase.ts (config module)
- [ ] Ensure URL/anon key from EXPO_PUBLIC_* only

### 10. Supabase Fixes (High Priority)

#### 10.1 Migrations
- [ ] Validate RLS policies match app flows
- [ ] Check reviews ownership, chat messages, notifications visibility

#### 10.2 Functions
- [ ] Move secrets into Supabase project secrets

#### 10.3 Config
- [ ] Keep dev ports and services enabled as needed
- [ ] Seed local for testing if required

### 11. Native Feature Validation (High Priority)

#### 11.1 Dev Clients
- [ ] iOS: `npx expo prebuild --clean && npx expo run:ios`
- [ ] Android: `npx expo run:android`
- [ ] Start Metro: `npx expo start --dev-client --clear --host lan`

#### 11.2 VisionCamera
- [ ] Test capture with permissions
- [ ] Verify preview on device
- [ ] Test errors on permission denial

#### 11.3 Notifications
- [ ] Request permission
- [ ] Confirm Expo push token
- [ ] Test FCM/APNs end-to-end

#### 11.4 RevenueCat Purchases
- [ ] Fetch offerings
- [ ] Test paywall
- [ ] Test purchase (sandbox)
- [ ] Test restore
- [ ] Verify `subscriptionStore` updates

#### 11.5 AdMob
- [ ] Test App Open + Interstitial with test ads
- [ ] Verify frequency gating works

#### 11.6 MMKV
- [ ] Verify persistence with New Architecture
- [ ] Avoid Remote JS Debugger
- [ ] Use Hermes Inspector/Flipper if needed

#### 11.7 Web
- [ ] Confirm native-only services are guarded
- [ ] Verify web builds run Browse/Search/Review flows

### 12. Supabase CLI Validation (High Priority)

#### 12.1 CLI Setup
- [ ] Update CLI: `supabase --version`
- [ ] Link project: `supabase link --project-ref <YOUR_PROJECT_REF>`
- [ ] Apply pending migrations: `supabase db push`

#### 12.2 Secrets
- [ ] Set function secrets: `supabase secrets set OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GROK_API_KEY=...`

#### 12.3 Buckets & Policies
- [ ] Ensure buckets: `avatars`, `review-images`, `chat-media`, `documents`
- [ ] Verify RLS matches app flows
- [ ] Use Studio or SQL scripts included in repo

### 13. Testing & QA (Medium Priority)

#### 13.1 Static Testing
- [ ] Run `npm run verify:env`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint -- --fix`
- [ ] Run `npx expo-doctor`

#### 13.2 Unit/Integration Testing
- [ ] Add tests for stores (auth/subscription)
- [ ] Add tests for utilities (errorHandling/storage)
- [ ] Add component smoke tests (ErrorBoundary, OfflineBanner)

#### 13.3 E2E Testing (Optional)
- [ ] Consider Maestro/Detox flow for:
  - Sign-in
  - Chat send/receive
  - Create review + media
  - Purchases (sandbox)
  - Notifications open
  - Deep links

## Implementation Order

1. **Phase 1**: Root directory and navigation fixes (highest impact)
2. **Phase 2**: Screen and component fixes (user-facing)
3. **Phase 3**: Service and state management fixes (backend logic)
4. **Phase 4**: Configuration and Supabase fixes (infrastructure)
5. **Phase 5**: Native feature validation (device testing)
6. **Phase 6**: Testing and QA (validation)

## Success Criteria

- [ ] TypeScript typecheck: PASS
- [ ] Expo Doctor: PASS (17/17)
- [ ] Env verification: PASS (`npm run verify:env`)
- [ ] ESLint warnings reduced significantly (target: <50)
- [ ] All native features validated on devices
- [ ] Supabase remote schema/policies/buckets verified

## References

- Expo SDK 54 changelog: https://expo.dev/changelog/sdk-54-beta
- Reanimated v4 migration: https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- Notifications (SDK 53+): https://docs.expo.dev/versions/latest/sdk/notifications/
- RevenueCat + Expo: https://www.revenuecat.com/docs/getting-started/installation/expo
- AdMob + Expo: https://docs.page/invertase/react-native-google-mobile-ads~527
- Skia requirements: https://shopify.github.io/react-native-skia/docs/getting-started/installation
- MMKV NA requirement: https://github.com/mrousavy/react-native-mmkv
- VisionCamera with Expo: https://react-native-vision-camera.com/docs/guides/