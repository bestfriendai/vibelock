# Complete AdMob & RevenueCat Setup Guide for React Native Expo (September 2025)

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AdMob Setup](#admob-setup)
3. [RevenueCat Setup](#revenuecat-setup)
4. [Expo Configuration](#expo-configuration)
5. [Implementation](#implementation)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **React Native**: 0.64+ (recommended: latest version)
- **Expo SDK**: 51+ (recommended: 52+)
- **iOS Deployment Target**: 13.4+
- **Android API Level**: 23+ (Android 6.0)
- **Node.js**: 18+ LTS
- **Expo CLI**: Latest version

### Accounts Required
1. **Google AdMob Account**: [admob.google.com](https://admob.google.com)
2. **RevenueCat Account**: [revenuecat.com](https://revenuecat.com)
3. **Apple Developer Account**: For iOS app store
4. **Google Play Console Account**: For Android app store
5. **Expo Account**: For EAS builds

## AdMob Setup

### 1. Create AdMob Account & App
1. Go to [AdMob Console](https://admob.google.com)
2. Create new app or add existing app
3. Note down your **App ID** for both iOS and Android
4. Create ad units:
   - **Banner Ad Unit**
   - **Interstitial Ad Unit** 
   - **Rewarded Ad Unit** (optional)
   - **App Open Ad Unit** (optional)

### 2. Configure Ad Units
For each ad unit, you'll get:
- **Ad Unit ID** (e.g., `ca-app-pub-XXXXXXXX/YYYYYYYYYY`)
- **Test Ad Unit IDs** for development

### Test Ad Unit IDs (Use during development):
```javascript
// iOS Test IDs
const IOS_TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/2934735716',
  interstitial: 'ca-app-pub-3940256099942544/4411468910',
  rewarded: 'ca-app-pub-3940256099942544/1712485313',
  appOpen: 'ca-app-pub-3940256099942544/5662855259'
};

// Android Test IDs
const ANDROID_TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  appOpen: 'ca-app-pub-3940256099942544/9257395921'
};
```

## RevenueCat Setup

### 1. Create RevenueCat Project
1. Sign up at [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create new project
3. Add your iOS and Android apps
4. Note down your **Public API Key**

### 2. Configure Store Connections
#### iOS (App Store Connect)
1. Generate App Store Connect API Key
2. Add to RevenueCat under "App Store Connect Integration"
3. Configure your products in App Store Connect
4. Import products to RevenueCat

#### Android (Google Play Console)
1. Create service account in Google Cloud Console
2. Grant permissions in Google Play Console
3. Add service account JSON to RevenueCat
4. Configure products in Google Play Console
5. Import products to RevenueCat

### 3. Create Products & Entitlements
1. **Products**: Define your subscription tiers
2. **Entitlements**: Group products by features
3. **Offerings**: Present products to users

## Expo Configuration

### 1. Install Dependencies

```bash
# Core dependencies
npx expo install react-native-google-mobile-ads
npm install react-native-purchases

# Additional dependencies for enhanced functionality
npx expo install expo-dev-client
npx expo install @react-native-async-storage/async-storage
```

### 2. Configure app.json/app.config.js

```json
{
  "expo": {
    "name": "LockerRoom",
    "slug": "lockerroom-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.lockerroom.app",
      "buildNumber": "1",
      "infoPlist": {
        "SKAdNetworkItems": [
          {
            "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "4fzdc2evr5.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "2fnua5tdw4.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "ydx93a7ass.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "5a6flpkh64.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "p78axxw29g.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "v72qych5uu.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "ludvb6z3bs.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "cp8zw746q7.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "3sh42y64q3.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "c6k4g5qg8m.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "s39g8k73mm.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "3qy4746246.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "f38h382jlk.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "hs6bdukanm.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "v4nxqhlyqp.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "wzmmz9fp6w.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "yclnxrl5pm.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "t38b2kh725.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "7ug5zh24hu.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "9rd848q2bz.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "n6fk4nfna4.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "kbd757ywx3.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "9t245vhmpl.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "a2p9lx4jpn.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "22mmun2rn5.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "4468km3ulz.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "2u9pt9hc89.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "8s468mfl3y.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "klf5c3l5u5.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "ppxm28t8ap.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "424m5254lk.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "uw77j35x4d.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "578prtvx9j.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "4dzt52r2t5.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "e5fvkxwrpn.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "8c4e2ghe7u.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "zq492l623r.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "3rd42ekr43.skadnetwork"
          },
          {
            "SKAdNetworkIdentifier": "3qcr597p9d.skadnetwork"
          }
        ],
        "NSUserTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you and improve your app experience."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.lockerroom.app",
      "versionCode": 1,
      "permissions": [
        "com.android.vending.BILLING",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-dev-client",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXX~YYYYYYYYYY",
          "iosAppId": "ca-app-pub-XXXXXXXX~YYYYYYYYYY",
          "userTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you and improve your app experience.",
          "skAdNetworkItems": [
            "cstr6suwn9.skadnetwork",
            "4fzdc2evr5.skadnetwork",
            "2fnua5tdw4.skadnetwork",
            "ydx93a7ass.skadnetwork",
            "5a6flpkh64.skadnetwork",
            "p78axxw29g.skadnetwork",
            "v72qych5uu.skadnetwork",
            "ludvb6z3bs.skadnetwork",
            "cp8zw746q7.skadnetwork",
            "3sh42y64q3.skadnetwork",
            "c6k4g5qg8m.skadnetwork",
            "s39g8k73mm.skadnetwork",
            "3qy4746246.skadnetwork",
            "f38h382jlk.skadnetwork",
            "hs6bdukanm.skadnetwork",
            "v4nxqhlyqp.skadnetwork",
            "wzmmz9fp6w.skadnetwork",
            "yclnxrl5pm.skadnetwork",
            "t38b2kh725.skadnetwork",
            "7ug5zh24hu.skadnetwork",
            "9rd848q2bz.skadnetwork",
            "n6fk4nfna4.skadnetwork",
            "kbd757ywx3.skadnetwork",
            "9t245vhmpl.skadnetwork",
            "a2p9lx4jpn.skadnetwork",
            "22mmun2rn5.skadnetwork",
            "4468km3ulz.skadnetwork",
            "2u9pt9hc89.skadnetwork",
            "8s468mfl3y.skadnetwork",
            "klf5c3l5u5.skadnetwork",
            "ppxm28t8ap.skadnetwork",
            "424m5254lk.skadnetwork",
            "uw77j35x4d.skadnetwork",
            "578prtvx9j.skadnetwork",
            "4dzt52r2t5.skadnetwork",
            "e5fvkxwrpn.skadnetwork",
            "8c4e2ghe7u.skadnetwork",
            "zq492l623r.skadnetwork",
            "3rd42ekr43.skadnetwork",
            "3qcr597p9d.skadnetwork"
          ]
        }
      ]
    ]
  }
}
```

### 3. Create EAS Build Configuration

Create `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Implementation

### 1. AdMob Implementation

Create `src/services/AdMobService.js`:
```javascript
import mobileAds, {
  BannerAd,
  BannerAdSize,
  TestIds,
  InterstitialAd,
  RewardedAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

class AdMobService {
  constructor() {
    this.isInitialized = false;
    this.interstitialAd = null;
    this.rewardedAd = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await mobileAds().initialize();
      this.isInitialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('AdMob initialization failed:', error);
    }
  }

  getBannerAdUnitId() {
    if (__DEV__) {
      return TestIds.BANNER;
    }
    
    return Platform.select({
      ios: 'ca-app-pub-XXXXXXXX/YYYYYYYYYY', // Your iOS banner ad unit ID
      android: 'ca-app-pub-XXXXXXXX/YYYYYYYYYY', // Your Android banner ad unit ID
    });
  }

  getInterstitialAdUnitId() {
    if (__DEV__) {
      return TestIds.INTERSTITIAL;
    }
    
    return Platform.select({
      ios: 'ca-app-pub-XXXXXXXX/YYYYYYYYYY', // Your iOS interstitial ad unit ID
      android: 'ca-app-pub-XXXXXXXX/YYYYYYYYYY', // Your Android interstitial ad unit ID
    });
  }

  async loadInterstitialAd() {
    this.interstitialAd = InterstitialAd.createForAdRequest(
      this.getInterstitialAdUnitId()
    );
    
    return new Promise((resolve, reject) => {
      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        resolve();
      });
      
      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        reject(error);
      });
      
      this.interstitialAd.load();
    });
  }

  async showInterstitialAd() {
    if (this.interstitialAd?.loaded) {
      this.interstitialAd.show();
    }
  }
}

export default new AdMobService();
```

### 2. RevenueCat Implementation

Create `src/services/RevenueCatService.js`:
```javascript
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

class RevenueCatService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize(userId = null) {
    if (this.isInitialized) return;

    try {
      const apiKey = Platform.select({
        ios: 'your_ios_api_key_here',
        android: 'your_android_api_key_here',
      });

      await Purchases.configure({ apiKey });
      
      if (userId) {
        await Purchases.logIn(userId);
      }

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
    }
  }

  async getOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (error) {
      console.error('Error fetching offerings:', error);
      return null;
    }
  }

  async purchasePackage(packageToPurchase) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Restore purchases failed:', error);
      throw error;
    }
  }

  async getCustomerInfo() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Error getting customer info:', error);
      return null;
    }
  }
}

export default new RevenueCatService();
```

### 3. Banner Ad Component

Create `src/components/BannerAdComponent.js`:
```javascript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import AdMobService from '../services/AdMobService';

const BannerAdComponent = ({ style }) => {
  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={AdMobService.getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default BannerAdComponent;
```

### 4. Subscription Paywall Component

Create `src/components/PaywallComponent.js`:
```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import RevenueCatService from '../services/RevenueCatService';

const PaywallComponent = ({ onPurchaseSuccess, onClose }) => {
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await RevenueCatService.getOfferings();
      setOfferings(offerings);
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageToPurchase) => {
    setPurchasing(true);
    try {
      const customerInfo = await RevenueCatService.purchasePackage(packageToPurchase);
      onPurchaseSuccess?.(customerInfo);
      Alert.alert('Success', 'Purchase completed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await RevenueCatService.restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully!');
      onPurchaseSuccess?.(customerInfo);
    } catch (error) {
      Alert.alert('Error', 'No purchases to restore.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading subscription options...</Text>
      </View>
    );
  }

  const currentOffering = offerings?.current;

  if (!currentOffering) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No subscription options available</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>
      <Text style={styles.subtitle}>Unlock all features and remove ads</Text>

      {currentOffering.availablePackages.map((pkg) => (
        <TouchableOpacity
          key={pkg.identifier}
          style={styles.packageButton}
          onPress={() => handlePurchase(pkg)}
          disabled={purchasing}
        >
          <Text style={styles.packageTitle}>{pkg.product.title}</Text>
          <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
          <Text style={styles.packageDescription}>{pkg.product.description}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Maybe Later</Text>
      </TouchableOpacity>

      {purchasing && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Processing purchase...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  packageButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  packageTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  packagePrice: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
  },
  packageDescription: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.8,
  },
  restoreButton: {
    padding: 15,
    marginTop: 20,
  },
  restoreButtonText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
  closeButton: {
    padding: 15,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  purchasingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PaywallComponent;
```

## Testing

### 1. Development Testing

```bash
# Build development client
npx eas build --platform ios --profile development
npx eas build --platform android --profile development

# Install on device
npx eas build:run -p ios
npx eas build:run -p android

# Start development server
npx expo start --dev-client
```

### 2. Test AdMob Integration
- Verify banner ads load correctly
- Test interstitial ads show at appropriate times
- Ensure test ads are displayed (not real ads)
- Check ad event callbacks work properly

### 3. Test RevenueCat Integration
- Verify subscription offerings load
- Test purchase flow (use sandbox environment)
- Test restore purchases functionality
- Verify entitlements are properly granted

## Production Deployment

### 1. Replace Test IDs with Production IDs

Update your AdMob service with real ad unit IDs:
```javascript
// Replace test IDs with your actual AdMob ad unit IDs
getBannerAdUnitId() {
  return Platform.select({
    ios: 'ca-app-pub-YOUR_PUBLISHER_ID/YOUR_IOS_BANNER_ID',
    android: 'ca-app-pub-YOUR_PUBLISHER_ID/YOUR_ANDROID_BANNER_ID',
  });
}
```

### 2. Update RevenueCat API Keys

Replace with production API keys:
```javascript
const apiKey = Platform.select({
  ios: 'your_production_ios_api_key',
  android: 'your_production_android_api_key',
});
```

### 3. Build for Production

```bash
# Production builds
npx eas build --platform ios --profile production
npx eas build --platform android --profile production

# Submit to stores
npx eas submit --platform ios
npx eas submit --platform android
```

### 4. App Store Configuration

#### iOS App Store Connect
1. Configure in-app purchases
2. Add subscription groups
3. Set up App Store Connect API integration with RevenueCat
4. Submit for review

#### Google Play Console
1. Configure in-app products and subscriptions
2. Set up Google Play Billing
3. Configure service account for RevenueCat
4. Submit for review

## Troubleshooting

### Common AdMob Issues

1. **Ads not loading**
   - Check internet connection
   - Verify ad unit IDs are correct
   - Ensure AdMob account is properly set up
   - Check if ads are available for your region

2. **Build failures**
   - Update to latest react-native-google-mobile-ads version
   - Clear Metro cache: `npx expo start --clear`
   - Clean and rebuild: `npx eas build --clear-cache`

3. **iOS build issues**
   - Ensure SKAdNetwork identifiers are in Info.plist
   - Check iOS deployment target is 13.4+
   - Verify bundle identifier is `com.lockerroom.app` and matches AdMob app configuration

### Common RevenueCat Issues

1. **Products not loading**
   - Verify API keys are correct
   - Check store connection configuration
   - Ensure products are properly configured in app stores
   - Verify products are imported to RevenueCat

2. **Purchase failures**
   - Check sandbox vs production environment
   - Verify store account has payment method
   - Ensure app bundle ID `com.lockerroom.app` matches store configuration
   - Check RevenueCat webhook configuration

3. **Entitlements not working**
   - Verify entitlement configuration in RevenueCat
   - Check product-to-entitlement mapping
   - Ensure proper customer info refresh
   - Verify bundle identifier `com.lockerroom.app` matches store configuration

### General Expo Issues

1. **Development build issues**
   - Ensure expo-dev-client is installed
   - Use EAS Build for development builds
   - Cannot use Expo Go with native modules

2. **Plugin configuration**
   - Verify plugins are properly configured in app.json
   - Check plugin versions compatibility
   - Clear Expo cache if needed

## Additional Resources

### Documentation
- [AdMob React Native Documentation](https://docs.page/invertase/react-native-google-mobile-ads)
- [RevenueCat React Native Documentation](https://docs.revenuecat.com/docs/reactnative)
- [Expo Development Builds](https://docs.expo.dev/development/build/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

### Best Practices
1. **AdMob**
   - Use appropriate ad formats for your app
   - Implement proper ad loading and error handling
   - Follow AdMob policies to avoid account suspension
   - Test thoroughly before production

2. **RevenueCat**
   - Implement proper error handling for purchases
   - Use webhooks for server-side validation
   - Test in sandbox environment thoroughly
   - Implement restore purchases functionality

3. **Expo**
   - Use development builds for testing native modules
   - Keep dependencies updated
   - Use EAS Build for consistent builds
   - Test on real devices before production

This guide provides a comprehensive setup for both AdMob and RevenueCat in your Expo React Native app. Make sure to test thoroughly in development before deploying to production.
```
