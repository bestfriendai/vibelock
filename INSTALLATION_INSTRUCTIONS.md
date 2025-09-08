# Expo Compatible Monetization - Installation Instructions

## 🎯 Overview

This implementation provides **graceful fallback monetization** that works in both Expo Go and development builds:

- **Expo Go**: Mock implementations, demo UI, no crashes
- **Development Build**: Full RevenueCat + AdMob functionality

## 📦 Step 1: Install Dependencies

```bash
# Install monetization dependencies (optional for Expo Go)
npm install react-native-purchases react-native-google-mobile-ads

# These won't break Expo Go but enable full functionality in dev builds
```

## 🔧 Step 2: Environment Variables

Add these to your `.env` file (only used in development builds):

```env
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxxx

# AdMob Configuration  
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxx~xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-xxxxxxxx~xxxxxxxxxx
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
```

## ⚙️ Step 3: Update app.json (For Development Builds)

Add these plugins to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      "expo-asset",
      "expo-build-properties", 
      "expo-font",
      "expo-mail-composer",
      "expo-notifications",
      "expo-secure-store",
      "expo-sqlite",
      "expo-video",
      "expo-web-browser",
      [
        "react-native-purchases",
        {
          "iosAppStoreSharedSecret": "your_ios_shared_secret_here"
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxxxxx~xxxxxxxxxx",
          "iosAppId": "ca-app-pub-xxxxxxxx~xxxxxxxxxx",
          "userTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you.",
          "delay_app_measurement_init": true,
          "optimize_initialization": true
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "icon": "./assets/app-icon.png",
      "statusBarStyle": "light",
      "infoPlist": {
        "SKAdNetworkItems": [
          {
            "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork"
          }
        ]
      }
    },
    "android": {
      "edgeToEdgeEnabled": true,
      "icon": "./assets/app-icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/app-icon.png",
        "backgroundColor": "#0B0B0F"
      },
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE", 
        "WAKE_LOCK",
        "ACCESS_NETWORK_STATE",
        "INTERNET",
        "com.android.vending.BILLING"
      ],
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

## 🧪 Step 4: Test Both Environments

### Test in Expo Go (Mock Features)
```bash
npx expo start
# Scan QR code with Expo Go
# You should see:
# - Mock ad banners with "Expo Go Mode" labels
# - Functional paywall with "Try Demo" buttons  
# - Demo mode indicators throughout
# - No crashes or errors
```

### Test in Development Build (Full Features)
```bash
# Create development build
npx expo run:ios --device
npx expo run:android --device

# You should see:
# - Real AdMob banner ads above navigation
# - Full RevenueCat subscription flow
# - Real purchase capabilities
# - Production-ready experience
```

## 🎨 What You'll See

### In Expo Go:
- ✅ Beautiful mock ad banners
- ✅ Functional paywall UI with demo labels
- ✅ "Demo Mode" indicators
- ✅ Subscription management in settings
- ✅ No crashes or missing modules

### In Development Build:
- ✅ Real AdMob ads positioned above navigation
- ✅ Full RevenueCat subscription system
- ✅ Real purchases and revenue
- ✅ Production-ready monetization

## 🔍 Verification Checklist

### Expo Go Testing:
- [ ] App launches without crashes
- [ ] Mock ad banners appear with "Expo Go Mode" label
- [ ] Paywall opens with "Try Demo" button
- [ ] Settings shows subscription section with demo indicators
- [ ] Demo purchase flow works (simulates success)
- [ ] No native module errors in console

### Development Build Testing:
- [ ] Real ads load and display
- [ ] RevenueCat initializes successfully
- [ ] Subscription offerings load
- [ ] Purchase flow works with real transactions
- [ ] Ad revenue tracking works
- [ ] Settings shows real subscription status

## 🚀 Usage Examples

### Feature Gating
```typescript
import { FeatureGate } from '../components/FeatureGate';

// Wrap premium features
<FeatureGate feature="premium">
  <AdvancedSearchFilters />
</FeatureGate>
```

### Interstitial Ads
```typescript
import { useInterstitialAd } from '../hooks/useInterstitialAd';

const { showAdIfAppropriate } = useInterstitialAd({ frequency: 10 });

const handleAction = async () => {
  await showAdIfAppropriate(); // Shows ad occasionally
  // Continue with action
};
```

### Subscription Status
```typescript
import useSubscriptionStore from '../state/subscriptionStore';

const { isPremium, isLoading } = useSubscriptionStore();

if (isPremium) {
  // Show premium features
} else {
  // Show ads and upgrade prompts
}
```

## 🎯 Key Benefits

1. **No Crashes**: Works perfectly in Expo Go with mock implementations
2. **Full Features**: Complete monetization in development builds
3. **Automatic Detection**: Seamlessly switches between modes
4. **User-Friendly**: Clear indicators for demo vs real functionality
5. **Production Ready**: Real revenue generation in development builds

## 🔧 Troubleshooting

### Expo Go Issues:
- **Mock ads not showing**: Check console for environment detection logs
- **Paywall not opening**: Verify PaywallAdaptive import in ProfileScreen
- **Demo purchase fails**: Normal behavior, check success message

### Development Build Issues:
- **RevenueCat not initializing**: Check API keys in environment variables
- **Ads not loading**: Verify AdMob configuration and test device setup
- **Build fails**: Ensure all plugins are properly configured in app.json

This implementation gives you the best of both worlds: rapid development in Expo Go with full monetization features in production builds!
