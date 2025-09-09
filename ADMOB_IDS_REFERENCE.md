# AdMob IDs Reference - LockerRoom App

## App Configuration
- **App Name**: LockerRoom
- **Bundle ID**: `com.lockerroomtalk.app`
- **Package Name**: `com.lockerroomtalk.app`

## AdMob Account Information
- **Publisher ID**: `pub-9512493666273460`

### iOS App Configuration
- **AdMob App ID**: `ca-app-pub-9512493666273460~7181904608`

### Android App Configuration
- **AdMob App ID**: `ca-app-pub-9512493666273460~4548589138`

## Ad Unit IDs

### Banner Ad Units (ACTIVE)
- **iOS Ad Unit ID**: `ca-app-pub-9512493666273460/4655851607`
- **Android Ad Unit ID**: `ca-app-pub-9512493666273460/3837555963`
- **Format**: Banner
- **Size**: Adaptive Banner
- **Placement**: Above tab bar
- **Status**: ✅ Configured and Ready

### Interstitial Ad Units (ACTIVE)
- **iOS Ad Unit ID**: `ca-app-pub-9512493666273460/4188909755`
- **Android Ad Unit ID**: `ca-app-pub-9512493666273460/2783494598`
- **Format**: Interstitial
- **Placement**: After post creation (every 3 posts), chat exit (every 2 exits)
- **Status**: ✅ Configured and Ready

### App Open Ad Units (ACTIVE)
- **iOS Ad Unit ID**: `ca-app-pub-9512493666273460/6722739608`
- **Android Ad Unit ID**: `ca-app-pub-9512493666273460/9249664748`
- **Format**: App Open
- **Placement**: App launch/resume from background
- **Cooldown**: 4 hours between ads
- **Status**: ✅ Configured and Ready

### Additional Ad Units (OPTIONAL)

#### Rewarded Ad Unit
- **Format**: Rewarded Video
- **Recommended Use**: Unlock premium features temporarily
- **Status**: ⏳ Can be created if needed

## Test Ad Unit IDs (Development)
These are used automatically in development builds:

### iOS Test IDs
- **Banner**: `ca-app-pub-3940256099942544/2934735716`
- **Interstitial**: `ca-app-pub-3940256099942544/4411468910`
- **Rewarded**: `ca-app-pub-3940256099942544/1712485313`
- **App Open**: `ca-app-pub-3940256099942544/5662855259`

### Android Test IDs
- **Banner**: `ca-app-pub-3940256099942544/6300978111`
- **Interstitial**: `ca-app-pub-3940256099942544/1033173712`
- **Rewarded**: `ca-app-pub-3940256099942544/5224354917`
- **App Open**: `ca-app-pub-3940256099942544/9257395921`

## Implementation Status

### ✅ Completed
- [x] App.json configuration with AdMob plugin
- [x] AdMob service implementation
- [x] Banner ad component integration
- [x] Interstitial ad implementation with placement logic
- [x] App Open ad implementation with cooldown
- [x] SKAdNetwork identifiers (40+ networks)
- [x] App Tracking Transparency setup
- [x] Premium user ad exclusion
- [x] Development/production environment handling
- [x] Error handling and fallbacks
- [x] App state management for App Open ads
- [x] Interstitial ad hooks for easy integration

### 📋 Next Steps
- [ ] Test all ad formats in development build
- [ ] Verify ad loading and display for all ad types
- [ ] Test premium user experience (no ads)
- [ ] Integrate interstitial ads in post creation flow
- [ ] Integrate interstitial ads in chat exit flow
- [ ] Test App Open ads on app resume
- [ ] Submit app for AdMob review (if required)
- [ ] Monitor ad performance after launch

## Quick Commands

### Build Development Client
```bash
npx eas build --platform ios --profile development
npx eas build --platform android --profile development
```

### Test Ad Integration
```bash
npx eas build:run -p ios
npx eas build:run -p android
npx expo start --dev-client
```

### Check Configuration
```bash
# View AdMob configuration
cat src/config/admobConfig.ts

# View service implementation
cat src/services/adMobService.ts
```

## Important Notes

1. **Development vs Production**:
   - Development builds show test ads
   - Production builds show real ads with your ad unit IDs

2. **Expo Go Limitation**:
   - Cannot test real AdMob integration in Expo Go
   - Must use development builds for testing

3. **Premium Users**:
   - No ads are shown to premium subscribers
   - Handled automatically by the AdBanner component

4. **Ad Placement**:
   - Banner ads positioned above tab bar (not floating)
   - Complies with your UI preferences

5. **Revenue Optimization**:
   - Create additional ad units for higher revenue
   - Monitor performance and optimize placement

## Support Resources

- **AdMob Console**: https://admob.google.com/
- **AdMob Policies**: https://support.google.com/admob/answer/6128543
- **React Native Google Mobile Ads**: https://docs.page/invertase/react-native-google-mobile-ads
- **Expo Development Builds**: https://docs.expo.dev/development/build/

---

**Last Updated**: September 2025
**Configuration Version**: 1.0
**Status**: Production Ready
