# Monetization Guide

This guide covers the comprehensive monetization implementation in LockerRoom, featuring RevenueCat subscriptions and AdMob advertising with sophisticated environment-aware architectures.

## 🎯 Overview

The app implements a dual monetization strategy:
- **Premium Subscriptions** via RevenueCat with adaptive paywalls
- **Display Advertising** via AdMob with intelligent placement
- **Environment Detection** for seamless development and testing

## 💳 RevenueCat Integration

### Architecture

The subscription system is built around several key components:

#### Subscription Store (`src/state/subscriptionStore.ts`)
- **Zustand-based state management** with persistence
- **Cross-platform subscription state** sync
- **Automatic purchase restoration** on app launch
- **Error handling** with retry mechanisms
- **Mock implementation** for Expo Go compatibility

#### Adaptive Paywall (`src/components/subscription/PaywallAdaptive.tsx`)
- **Multiple paywall designs** based on user segments
- **A/B testing support** for conversion optimization
- **Animated presentations** with React Native Reanimated
- **Platform-specific styling** and behavior

### Key Features

#### Environment-Aware Implementation
```typescript
// Automatically detects runtime environment
export const canUseRevenueCat = () => 
  Platform.OS !== 'web' && buildEnv.hasNativeModules && !buildEnv.isExpoGo;
```

#### Subscription Management
- **Product Catalog**: Premium Monthly ($9.99), Premium Annual ($99.99)
- **Family Sharing**: iOS family sharing support
- **Grace Periods**: Handle billing issues gracefully
- **Promotional Offers**: Intro pricing and win-back campaigns

#### Revenue Analytics
- **Real-time revenue tracking** via RevenueCat dashboard
- **Cohort analysis** and retention metrics
- **A/B test results** for paywall optimization
- **Platform comparison** (iOS vs Android performance)

### Setup Instructions

#### 1. RevenueCat Configuration
1. Create a RevenueCat account at [app.revenuecat.com](https://app.revenuecat.com)
2. Set up your app with bundle identifier: `com.lockerroom.app`
3. Configure products in RevenueCat dashboard:
   - Premium Monthly: `premium_monthly`
   - Premium Annual: `premium_annual`

#### 2. Environment Variables
```bash
# iOS App-Specific Shared Secret
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_key_here

# Android License Key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key_here
```

#### 3. App Store Connect Setup
- Configure In-App Purchases with exact product IDs
- Set up subscription groups
- Configure promotional offers
- Enable family sharing (optional)

#### 4. Google Play Console Setup
- Create subscription products matching RevenueCat
- Configure pricing and availability
- Set up promotional offers
- Enable real-time developer notifications

### Testing Strategy

#### Development Testing
```bash
# Use Expo Development Build for full RevenueCat testing
expo run:ios --device
expo run:android --device
```

#### Sandbox Testing
- iOS: Use Sandbox Apple ID for testing purchases
- Android: Use Google Play Console test accounts
- RevenueCat: Monitor test transactions in dashboard

#### Production Validation
- Test purchase flows on actual devices
- Verify receipt validation
- Check subscription restoration
- Monitor RevenueCat webhook events

## 📱 AdMob Integration

### Architecture

#### AdMob Service (`src/services/adMobService.ts`)
- **Centralized ad management** with intelligent caching
- **Frequency controls** to prevent ad fatigue
- **User consent management** for GDPR/CCPA compliance
- **Performance tracking** and optimization

#### Banner Component (`src/components/AdBanner.tsx`)
- **Adaptive sizing** for different screen sizes
- **Smart placement** algorithm
- **Revenue optimization** with refresh controls
- **Accessibility support** with screen reader compatibility

### Key Features

#### Ad Types
- **Banner Ads**: Bottom placement with smart sizing
- **Interstitial Ads**: Full-screen between content transitions
- **App Open Ads**: Monetize app launches (future enhancement)

#### Advanced Targeting
- **Demographic targeting** based on user profile
- **Behavioral targeting** from app usage patterns
- **Geographic targeting** for location-based ads
- **Interest-based targeting** from content consumption

#### Privacy Compliance
- **App Tracking Transparency** (iOS 14.5+) compliance
- **GDPR consent management** for European users
- **CCPA compliance** for California users
- **Child safety** with COPPA-compliant ad serving

### Setup Instructions

#### 1. AdMob Account Setup
1. Create Google AdMob account
2. Add your app with bundle ID: `com.lockerroom.app`
3. Generate App IDs:
   - iOS: `ca-app-pub-9512493666273460~7181904608`
   - Android: `ca-app-pub-9512493666273460~4548589138`

#### 2. Ad Unit Configuration
```typescript
// Test Ad Units (for development)
const TEST_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910'
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712'
  }
};
```

#### 3. Privacy Configuration
Update `app.json` privacy settings:
```json
{
  "ios": {
    "infoPlist": {
      "NSUserTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you and improve your app experience.",
      "SKAdNetworkItems": [
        // Comprehensive list for optimal fill rates
      ]
    }
  }
}
```

### Revenue Optimization

#### Ad Placement Strategy
- **Banner ads**: Above fold content, not intrusive
- **Interstitial ads**: Between natural content breaks
- **Native ads**: Integrated with content feed (future)

#### Performance Monitoring
- **eCPM tracking** across different placements
- **Fill rate optimization** with multiple ad networks
- **User experience metrics** (session length, retention)
- **A/B testing** for ad frequency and placement

### Testing & Debugging

#### Development Testing
```bash
# Enable test ads in development
__DEV__ ? TEST_AD_UNIT_ID : PRODUCTION_AD_UNIT_ID
```

#### Production Monitoring
- AdMob dashboard for performance metrics
- Real-time revenue tracking
- User feedback monitoring
- App store review sentiment analysis

## 🔧 Environment Configuration

### Build Environment Detection (`src/utils/buildEnvironment.ts`)

The app automatically detects runtime environment and enables appropriate features:

#### Expo Go Mode
- **Mock implementations** for both RevenueCat and AdMob
- **UI previews** without actual transactions
- **Development-friendly** error messages

#### Development Build Mode
- **Full native module access** with test configurations
- **Sandbox environments** for safe testing
- **Debug logging** for troubleshooting

#### Production Mode
- **Optimized performance** with real monetization
- **Analytics tracking** for revenue optimization
- **Error reporting** for production issues

### Environment Variables Management

#### Development (.env)
```bash
# Safe for local development
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=test_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=test_key
```

#### Production (EAS Secrets)
```bash
# Secure production keys
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value prod_key_ios
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value prod_key_android
```

## 📊 Analytics & Optimization

### Revenue Metrics
- **Monthly Recurring Revenue (MRR)** tracking
- **Average Revenue Per User (ARPU)** analysis
- **Customer Lifetime Value (CLV)** calculation
- **Churn rate** and retention analysis

### Optimization Strategies
- **Paywall A/B testing** for conversion rates
- **Ad placement optimization** for user experience
- **Pricing strategy** based on market research
- **Feature gating** to drive subscription conversions

### Performance Monitoring
- **Revenue per session** tracking
- **Subscription funnel analysis** (view → trial → paid)
- **Ad revenue optimization** with multiple networks
- **User satisfaction** surveys and app store ratings

## 🚀 Advanced Features

### Future Enhancements
- **Promotional campaigns** for special events
- **Referral programs** with subscription rewards
- **Corporate subscriptions** for team accounts
- **Regional pricing** optimization

### Integration Opportunities
- **Social sharing** with subscription incentives
- **Content partnerships** for premium features
- **Affiliate marketing** programs
- **Cross-promotion** with other apps

## 🔍 Troubleshooting

### Common Issues

#### RevenueCat Issues
- **"No products found"**: Check product IDs in RevenueCat dashboard
- **"Receipt validation failed"**: Verify bundle identifier matches
- **"Restore failed"**: Ensure user is signed into correct Apple ID

#### AdMob Issues
- **"No ads available"**: Check AdMob account status and ad unit IDs
- **"Low fill rate"**: Review targeting settings and add more ad networks
- **"Privacy violations"**: Ensure proper consent management implementation

### Debug Commands
```bash
# Check environment configuration
npm run verify:env

# Test subscription flow
# (Use Expo Development Build on physical device)

# Monitor ad performance
# (Check AdMob dashboard real-time metrics)
```

### Support Resources
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [AdMob Documentation](https://developers.google.com/admob)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)

## 📞 Support & Maintenance

For monetization-related issues:
1. Check environment configuration first
2. Verify API keys and credentials
3. Review platform-specific settings (App Store Connect, Google Play Console)
4. Monitor RevenueCat and AdMob dashboards for errors
5. Test on physical devices with appropriate test accounts

---

The monetization implementation is designed to be robust, privacy-compliant, and optimized for both user experience and revenue generation. Regular monitoring and optimization based on analytics data will ensure sustained growth and user satisfaction.