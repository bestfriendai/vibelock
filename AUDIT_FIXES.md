# LockerRoom Codebase Audit and Fix Plan (Expo SDK 54 · RN 0.81 · React 19.1)

Last updated: September 12, 2025 (United States)

This document provides a comprehensive, file-by-file audit of the LockerRoom app, the fixes already applied, and all remaining work needed to reach a production-ready, error-free state on Expo SDK 54 with React Native 0.81 and React 19.1. It includes research references, platform notes, and validation runbooks (including Supabase CLI) for iOS, Android, and Web.

---

## Executive Summary

- Current branch: `main` (best baseline). Other branches are behind and fail checks more severely.
- Green checks on `main` after fixes:
  - TypeScript typecheck: PASS
  - Expo Doctor: PASS (17/17)
  - Env verification: PASS (`npm run verify:env`)
- Remaining work:
  - Reduce ~161 ESLint warnings (no errors). Focus on screens/components/services with unused vars and React Hook dependency lists.
  - Device validation for native features (VisionCamera, Purchases, AdMob, Notifications, MMKV).
  - Supabase remote schema/policies/buckets verification and alignment with app behavior.

---

## Compatibility Research (SDK 54 / NA / Core Libs)

- Expo SDK 54 uses React Native 0.81 and React 19.1. New Architecture (NA) is emphasized. See SDK 54 beta notes: https://expo.dev/changelog/sdk-54-beta
- Reanimated v4 is NA-only and adds a new dependency on `react-native-worklets` (must be installed). Migration guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- Notifications: Remote push on Android requires a development build since SDK 53 (not available in Expo Go). Docs: https://docs.expo.dev/versions/latest/sdk/notifications/
- RevenueCat with Expo: Requires dev build for real purchases; Expo Go uses a Preview Mode. Docs: https://www.revenuecat.com/docs/getting-started/installation/expo
- AdMob with Expo: Use `react-native-google-mobile-ads` with config plugin and dev client; plugin config must be in `app.json`. Guidance: https://docs.page/invertase/react-native-google-mobile-ads~527
- Skia: Requires RN >= 0.79 and React >= 19 (met). Docs: https://shopify.github.io/react-native-skia/docs/getting-started/installation
- MMKV v3: Requires NA; avoid Remote JS Debugger. Docs: https://github.com/mrousavy/react-native-mmkv
- VisionCamera with Expo: Requires development build and permissions. Docs: https://react-native-vision-camera.com/docs/guides/

---

## Fixes Already Applied

- Installed missing/required modules for SDK 54:
  - `react-native-worklets` (Reanimated v4 peer)
  - `expo-av` (dependency validation)
- `app.json` cleanup:
  - Removed duplicate `CFBundleURLTypes` entry.
  - Removed legacy Android `READ/WRITE_EXTERNAL_STORAGE` permissions (scoped storage).
- Added `scripts/verify-env.js` to validate all `EXPO_PUBLIC_*` variables (driven by `.env.example`).
- Repository formatting: Prettier + ESLint autofix pass. Lint now has warnings only.

---

## Global Recommendations

- Keep New Architecture enabled (required for Reanimated v4/MMKV and recommended in SDK 54).
- Babel: keep `react-native-worklets/plugin` last. Consider moving `"nativewind/babel"` to `plugins` (not `presets`) only after device validation.
- Metro: your custom config is acceptable for RN 0.81; optional simplification can be done after runtime validation.
- Secrets: never expose private keys via `EXPO_PUBLIC_*`. Set sensitive keys in Supabase Edge Functions or EAS secrets.

---

## Per-Directory Audit and Fix Plan

Below, “Fix Type” legend:
- [lint] Lint-only (unused imports/vars, Prettier, hooks deps)
- [types] Type mismatch/overload corrections
- [runtime] Potential runtime or UX issue
- [config] Configuration placement or versioning

### Root
- `App.tsx` [lint] Remove unused `StatusBar` import. [runtime] Keep deep linking routes validated in manual E2E.
- `index.ts` [ok] Reanimated import first; CSS/polyfills; LogBox filters appropriate.
- `babel.config.js` [config] Leave `react-native-worklets/plugin` last. Optionally move `"nativewind/babel"` to `plugins` later and re-test on devices.
- `metro.config.js` [config] Fine; can be simplified to Expo defaults post-validation.
- `app.json` [config] Clean. Confirm AdMob plugin block is under `expo.plugins` with proper app IDs (already present).
- `eas.json` [config] Dev client profiles defined; good for native module validation.
- `jest.config.js` / `jest.setup.js` [ok] `jest-expo` 54, RNGH setup, Reanimated mock present; no tests yet (optional).
- `.env.example` / `.env` [config] Verified; `scripts/verify-env.js` added.

### src/navigation
- `AppNavigator.tsx` [lint] Remove unused `ComponentErrorBoundary`, `insets`, `colors`. [types] Ensure navigation overloads align with v7—navigate to names valid within the current navigator (avoid using `'MainTabs'` from nested stacks).

### src/screens
Common pattern: remove unused imports/locals; fix hook dependency warnings without altering behavior; prefer `useCallback`/`useMemo` with stable deps or refs.
- `BrowseScreen.tsx` [lint] Unused `theme`, `isDarkMode`, `loadWithFilters`, error vars. [types] Ensure list keys/types correct.
- `SearchScreen.tsx` [types] Don’t call `navigate("MainTabs")` from SearchStack; use valid routes for that navigator or bubble to root stack with `{ name: 'MainTabs' }` shape where appropriate.
- `CreateReviewScreen.tsx` [lint] Unused helpers; hook deps (e.g., `mediaCount`). [runtime] Validate image/video attach limits; show user-facing errors.
- `NotificationsScreen.tsx` [lint] Unused error vars. [runtime] Ensure permission request flow matches SDK 54 notification requirements.
- `ProfileScreen.tsx` [lint] Unused toggles/vars; ensure accessible labels for switches and buttons.
- `SignInScreen.tsx` / `SignUpScreen.tsx` [lint] Hook deps for staged animations; unused error vars.
- `ReviewDetailScreen.tsx` + `.backup.tsx` [types] Remove unsupported Reanimated v4 spring option `restDisplacementThreshold`; replace with supported keys (e.g., `damping`, `stiffness`, `mass`, `velocity`, `overshootClamping`, `energyThreshold`, `reduceMotion`).
- `ChatroomsScreen.tsx` / `ChatRoomScreen.tsx` [lint] Validate FlashList props (estimated sizes), remove unused comparisons.

### src/components
- `AdBanner.tsx` [runtime] Keep dynamic import guarded by `canUseAdMob()`; confirm plugin IDs and test IDs for debug builds.
- Animated components (e.g., `AnimatedButton.tsx`, `AnimatedInput.tsx`, `Enhanced*`, `VoiceMessage.tsx`):
  - [lint] Fix hook deps, remove unused `withTiming`/`withSpring`/`FadeIn/FadeOut` imports if not used. 
  - [runtime] Ensure any worklet code avoids non-serializable refs/closures.
- `ImageCarousel.tsx` [runtime] In effect cleanup, snapshot `prefetchedUrisRef.current` at effect start to avoid stale ref mutation in cleanup.
- `ScreenErrorBoundary.tsx` [lint] Add `displayName` or convert to named component.
- Media components (`MediaPicker.tsx`, `MediaUploadGrid.tsx`, `MediaViewer.tsx`):
  - [lint] Remove unused constants; fix effect deps for spinners/viewer.
  - [runtime] Validate media type handling and zero-byte prevention (you already fixed in commits; re-verify).

### src/services
- `notificationService.ts` / `notificationHelpers.ts` [lint] Remove unused `appError`; remove unreachable code; ensure channels created pre-token on Android 13+.
- `adMobService.ts` [lint] Remove unused imports; test frequency capping (`postCreation`/`chatExit`).
- `locationService.ts` [lint] Remove unused error vars; ensure platform geolocation permissions consistent with UI.
- `storageService.ts` / `utils/FileDownloader.ts` [types/runtime]
  - Ensure correct conversion to `Blob` parts from buffers on RN 0.81; prefer `Blob([Uint8Array])` or use `FileSystem.uploadAsync` with correct `contentType` when possible.
- `realtimeChat.ts` [runtime] Confirm cleanup paths run on unmount/background; verify reconnection logic with Supabase Realtime.
- `supabase.ts` [ok] Keep usage RLS-friendly; avoid exposing service keys in client.

### src/state
- `authStore.ts`, `subscriptionStore.ts`, `reviewsStore.ts`, etc. [lint] Remove unused vars; document mock paths for web (Purchases/Ads disabled or mocked).

### src/providers
- `ThemeProvider.tsx` [types] Ensure `ThemeColors` type matches concrete object (include `accent`, `status` subkeys). Avoid widening types by precisely shaping the theme object.

### src/utils
- `buildEnvironment.ts` [ok] `expo-constants.appOwnership` + `Platform` is fine; keep semantics of `hasNativeModules` consistent with your mock strategy.
- `errorHandling.ts`, `mediaErrorHandling.ts`, `authUtils.ts` [lint] Remove unused helpers; keep consistent error enums.
- `location.ts` [lint] Remove unused locals; confirm geocoding fallbacks and mock lookup logic.
- `supabaseTestSuite.ts` [lint] Remove unused `AppError`, `data` locals or wire them into tests.

### config
- `admobConfig.ts` [config] Validate test vs production unit IDs; keep SKAdNetwork IDs updated; plugin configuration present in `app.json`.
- `supabase.ts` (config module) [ok] Ensure URL/anon key from EXPO_PUBLIC_* only.

### supabase
- `migrations/*.sql` [config] Validate RLS policies match app flows (reviews ownership; chat messages; notifications visibility if present).
- `functions/*` [config] Move secrets into Supabase project secrets (`supabase secrets set ...`).
- `config.toml` [config] Keep dev ports and services enabled as needed; seed local for testing if required.

---

## Navigation (v7) Type-Safety

- Ensure `navigation.navigate` targets exist in the current navigator’s param list; from a nested stack/tab, either navigate to a route in that navigator or bubble navigation using a root-level navigate structure. See migration notes for v7 types.

---

## Native Feature Runbook (Device Required)

1) **Dev Clients**
- iOS: `npx expo prebuild --clean && npx expo run:ios`
- Android: `npx expo run:android`
- Start Metro: `npx expo start --dev-client --clear --host lan`

2) **VisionCamera**
- Open capture; allow permissions; verify preview on device; test errors on denial.

3) **Notifications (expo-notifications)**
- Request permission; confirm Expo push token; test FCM/APNs end-to-end.

4) **RevenueCat Purchases**
- Fetch offerings; paywall; purchase (sandbox); restore; verify `subscriptionStore` updates.

5) **AdMob**
- Test App Open + Interstitial with test ads; verify frequency gating works.

6) **MMKV**
- Verify persistence with NA; avoid Remote JS Debugger; use Hermes Inspector/Flipper if needed.

7) **Web**
- Confirm native-only services are guarded and that web builds run Browse/Search/Review flows.

---

## Supabase CLI Runbook (Remote)

- Update CLI if prompted: `supabase --version`
- Link project: `supabase link --project-ref <YOUR_PROJECT_REF>`
- Apply pending migrations: `supabase db push`
- Set function secrets: `supabase secrets set OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GROK_API_KEY=...`
- Buckets & policies:
  - Ensure buckets: `avatars`, `review-images`, `chat-media`, `documents`
  - Verify RLS matches app flows (owner read/write; public read where intended). Use Studio or SQL scripts included in repo.

---

## Testing & QA

- Static: `npm run verify:env`, `npm run typecheck`, `npm run lint -- --fix`, `npx expo-doctor`.
- Unit/integration (add): stores (auth/subscription), utilities (errorHandling/storage), component smoke (ErrorBoundary, OfflineBanner).
- E2E (optional): Maestro/Detox flow for sign-in, chat send/receive, create review + media, purchases (sandbox), notifications open, deep links.

---

## References

- Expo SDK 54 changelog: https://expo.dev/changelog/sdk-54-beta
- Reanimated v4 migration & worklets: https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- Notifications (SDK 53+ dev build on Android): https://docs.expo.dev/versions/latest/sdk/notifications/
- RevenueCat + Expo: https://www.revenuecat.com/docs/getting-started/installation/expo
- AdMob + Expo (config plugin): https://docs.page/invertase/react-native-google-mobile-ads~527
- Skia requirements: https://shopify.github.io/react-native-skia/docs/getting-started/installation
- MMKV NA requirement: https://github.com/mrousavy/react-native-mmkv
- VisionCamera with Expo: https://react-native-vision-camera.com/docs/guides/

---

## Ready-To-Apply Patch Plan (Summary)

1. Remove unused imports/locals across top screens/components; fix hook deps with minimal behavior change.
2. Replace unsupported Reanimated v4 spring options with supported ones in Review screens.
3. Tighten navigation types in AppNavigator and screens to v7 overloads.
4. Confirm AdMob plugin placement & test IDs; verify Notifications channels on Android.
5. Supabase: run migrations, confirm buckets/policies, set function secrets.
6. Device validation run: VisionCamera, Purchases, AdMob, Notifications, MMKV; capture logs and screenshots.
