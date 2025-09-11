# AdMob Setup Complete Guide

## Overview
This document provides a complete guide for implementing Google AdMob in the React Native application using the `react-native-google-mobile-ads` package.

## Prerequisites
- React Native project with `react-native-google-mobile-ads` installed (already in package.json)
- Google AdMob account (https://apps.admob.com)
- iOS and Android development environments set up

## Setup Steps

### 1. Google AdMob Account Setup

#### Create an AdMob Account
1. Go to [Google AdMob](https://apps.admob.com)
2. Sign in with your Google account
3. Follow the on-screen instructions to create your AdMob account

#### Register Your App
1. In the AdMob dashboard, click "Add App"
2. Select your app platform (iOS or Android)
3. For Android:
   - Enter your package name (e.g., com.example.app)
   - Choose whether to enable User Messaging Platform
4. For iOS:
   - Enter your Bundle ID (e.g., com.example.app)
   - Upload your App Store information if available

### 2. Ad Unit Configuration

#### Create Ad Units
1. In your app dashboard, go to "Ad units" tab
2. Click "Create ad unit"
3. Select the ad type you want to implement:
   - **Banner**: For small ads at the top or bottom of the screen
   - **Interstitial**: For full-screen ads between content
   - **Rewarded**: For ads users watch in exchange for rewards
   - **Native**: For custom-designed ads that match your app's UI

#### Ad Unit Naming Convention
Use a consistent naming convention for your ad units:
- `android_banner_home`
- `ios_interstitial_level_complete`
- `android_rewarded_premium_feature`
- `ios_native_content_feed`

### 3. Platform-Specific Configuration

#### Android Configuration

1. Add your App ID to `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
  <!-- Sample AdMob app ID: ca-app-pub-3940256099942544~3347511713 -->
  <meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="YOUR_ADMOB_APP_ID"/>
</application>
```

2. Update `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
  <string name="app_name">Your App Name</string>
  <string name="admob_app_id">ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy</string>
</resources>
```

3. Add required permissions to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### iOS Configuration

1. Add your App ID to `ios/YourAppName/Info.plist`:
```xml
<key>GADApplicationIdentifier</key>
<string>YOUR_ADMOB_APP_ID</string>
```

2. Add the following to `Info.plist` for SKAdNetwork support:
```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cadsl.google.com</string>
  </dict>
</array>
```

3. Update your Podfile with required settings:
```ruby
platform :ios, '11.0'

target 'YourAppName' do
  # ...
  pod 'Google-Mobile-Ads-SDK'
end
```

4. Run `pod install` in the `ios` directory

### 4. React Native Implementation

#### Initialize the SDK
Create a file `src/services/admob.ts`:

```typescript
import { AppOpenAd, InterstitialAd, RewardedAd, BannerAd, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// Use test IDs in development
const useTestAds = __DEV__;

// Ad Unit IDs - replace with your actual AdMob unit IDs
const adUnitIds = {
  banner: useTestAds ? TestIds.BANNER : Platform.select({
    android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
    ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
  }),
  interstitial: useTestAds ? TestIds.INTERSTITIAL : Platform.select({
    android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
    ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
  }),
  rewarded: useTestAds ? TestIds.REWARDED : Platform.select({
    android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
    ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
  }),
  native: useTestAds ? TestIds.NATIVE : Platform.select({
    android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
    ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
  }),
};

// Ad Request Configuration
const adRequestOptions = {
  keywords: ['fashion', 'clothing', 'self-help'],
};

// Initialize AdMob
export const initializeAdMob = async () => {
  try {
    await mobileAds().initialize();
    console.log('AdMob initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
    return false;
  }
};

// Interstitial Ad Management
let interstitialAd: InterstitialAd | null = null;

export const loadInterstitialAd = async () => {
  try {
    interstitialAd = InterstitialAd.createForAdRequest(adUnitIds.interstitial, adRequestOptions);
    await interstitialAd.load();
    console.log('Interstitial ad loaded');
  } catch (error) {
    console.error('Failed to load interstitial ad:', error);
  }
};

export const showInterstitialAd = async () => {
  if (interstitialAd && interstitialAd.loaded) {
    try {
      await interstitialAd.show();
      console.log('Interstitial ad shown');
      // Load a new ad for next time
      loadInterstitialAd();
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  } else {
    console.log('Interstitial ad not loaded yet');
    // Try to load it
    loadInterstitialAd();
  }
};

// Rewarded Ad Management
let rewardedAd: RewardedAd | null = null;

export const loadRewardedAd = async () => {
  try {
    rewardedAd = RewardedAd.createForAdRequest(adUnitIds.rewarded, adRequestOptions);
    await rewardedAd.load();
    console.log('Rewarded ad loaded');
  } catch (error) {
    console.error('Failed to load rewarded ad:', error);
  }
};

export const showRewardedAd = async (onUserEarnedReward: () => void) => {
  if (rewardedAd && rewardedAd.loaded) {
    try {
      rewardedAd.onUserEarnedReward = (reward) => {
        console.log('User earned reward:', reward);
        onUserEarnedReward();
      };
      
      await rewardedAd.show();
      console.log('Rewarded ad shown');
      // Load a new ad for next time
      loadRewardedAd();
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
    }
  } else {
    console.log('Rewarded ad not loaded yet');
    // Try to load it
    loadRewardedAd();
  }
};

// Banner Ad Component
export const BannerAdComponent = () => {
  return (
    <BannerAd
      unitId={adUnitIds.banner}
      size={BannerAdSize.BANNER}
      requestOptions={adRequestOptions}
      onAdFailedToLoad={(error) => console.error('Banner ad failed to load:', error)}
    />
  );
};

// Preload ads on app start
export const preloadAds = () => {
  loadInterstitialAd();
  loadRewardedAd();
};
```

#### Integration in App Entry Point
Update your `App.tsx` or main entry point:

```typescript
import React, { useEffect } from 'react';
import { initializeAdMob, preloadAds } from './src/services/admob';

const App = () => {
  useEffect(() => {
    // Initialize AdMob when app starts
    const setupAds = async () => {
      const initialized = await initializeAdMob();
      if (initialized) {
        preloadAds();
      }
    };
    
    setupAds();
  }, []);

  // ... rest of your app
};
```

### 5. Implementing Ad Placements

#### Banner Ads
Create a component `src/components/ads/BannerAdWrapper.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../../hooks/useTheme';

const BannerAdWrapper = () => {
  const { theme } = useTheme();
  
  const adUnitId = __DEV__ 
    ? TestIds.BANNER 
    : Platform.select({
        android: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
        ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy',
      });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => console.log('Banner ad failed to load:', error)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});

export default BannerAdWrapper;
```

#### Interstitial Ads
Create a hook `src/hooks/useInterstitialAd.ts`:

```typescript
import { useCallback } from 'react';
import { showInterstitialAd } from '../services/admob';

export const useInterstitialAd = () => {
  const showAd = useCallback(() => {
    showInterstitialAd();
  }, []);

  return { showAd };
};
```

Usage in components:
```typescript
import { useInterstitialAd } from '../../hooks/useInterstitialAd';

const SomeScreen = ({ navigation }) => {
  const { showAd } = useInterstitialAd();

  const handleNavigate = () => {
    // Show ad before navigating
    showAd();
    navigation.navigate('NextScreen');
  };

  return (
    <Button title="Next" onPress={handleNavigate} />
  );
};
```

#### Rewarded Ads
Create a hook `src/hooks/useRewardedAd.ts`:

```typescript
import { useCallback } from 'react';
import { showRewardedAd } from '../services/admob';

export const useRewardedAd = () => {
  const showAd = useCallback((onReward: () => void) => {
    showRewardedAd(onReward);
  }, []);

  return { showAd };
};
```

Usage in components:
```typescript
import { useRewardedAd } from '../../hooks/useRewardedAd';

const PremiumFeature = () => {
  const { showAd } = useRewardedAd();
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = () => {
    const onReward = () => {
      setUnlocked(true);
      // Grant temporary access to premium feature
    };
    
    showAd(onReward);
  };

  return (
    <View>
      {unlocked ? (
        <Text>Premium feature unlocked!</Text>
      ) : (
        <Button title="Watch Ad to Unlock" onPress={handleUnlock} />
      )}
    </View>
  );
};
```

### 6. Ad Frequency and Mediation

#### Implement Ad Frequency Control
Create a utility `src/utils/adFrequency.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAST_INTERSTITIAL: 'last_interstitial_ad_time',
  LAST_REWARDED: 'last_rewarded_ad_time',
  INTERSTITIAL_COUNT: 'interstitial_ad_count',
  REWARDED_COUNT: 'rewarded_ad_count',
};

// Minimum time between ads (in milliseconds)
const MIN_TIME_BETWEEN_ADS = {
  interstitial: 2 * 60 * 1000, // 2 minutes
  rewarded: 30 * 1000, // 30 seconds
};

// Maximum ads per session
const MAX_ADS_PER_SESSION = {
  interstitial: 5,
  rewarded: 10,
};

export const shouldShowAd = async (adType: 'interstitial' | 'rewarded') => {
  try {
    const now = Date.now();
    const lastAdKey = adType === 'interstitial' 
      ? STORAGE_KEYS.LAST_INTERSTITIAL 
      : STORAGE_KEYS.LAST_REWARDED;
    const countKey = adType === 'interstitial' 
      ? STORAGE_KEYS.INTERSTITIAL_COUNT 
      : STORAGE_KEYS.REWARDED_COUNT;
    
    const lastAdTime = await AsyncStorage.getItem(lastAdKey);
    const adCount = await AsyncStorage.getItem(countKey);
    
    // Check if enough time has passed since last ad
    if (lastAdTime) {
      const timeSinceLastAd = now - parseInt(lastAdTime);
      if (timeSinceLastAd < MIN_TIME_BETWEEN_ADS[adType]) {
        return false;
      }
    }
    
    // Check if we've exceeded max ads per session
    if (adCount && parseInt(adCount) >= MAX_ADS_PER_SESSION[adType]) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking ad frequency:', error);
    return false; // Default to not showing ad if there's an error
  }
};

export const recordAdShown = async (adType: 'interstitial' | 'rewarded') => {
  try {
    const now = Date.now();
    const lastAdKey = adType === 'interstitial' 
      ? STORAGE_KEYS.LAST_INTERSTITIAL 
      : STORAGE_KEYS.LAST_REWARDED;
    const countKey = adType === 'interstitial' 
      ? STORAGE_KEYS.INTERSTITIAL_COUNT 
      : STORAGE_KEYS.REWARDED_COUNT;
    
    // Update last shown time
    await AsyncStorage.setItem(lastAdKey, now.toString());
    
    // Update count
    const currentCount = await AsyncStorage.getItem(countKey);
    const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
    await AsyncStorage.setItem(countKey, newCount.toString());
  } catch (error) {
    console.error('Error recording ad shown:', error);
  }
};

export const resetAdCounts = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LAST_INTERSTITIAL,
      STORAGE_KEYS.LAST_REWARDED,
      STORAGE_KEYS.INTERSTITIAL_COUNT,
      STORAGE_KEYS.REWARDED_COUNT,
    ]);
  } catch (error) {
    console.error('Error resetting ad counts:', error);
  }
};
```

#### Update Ad Hooks to Use Frequency Control
Update `src/hooks/useInterstitialAd.ts`:

```typescript
import { useCallback } from 'react';
import { showInterstitialAd } from '../services/admob';
import { shouldShowAd, recordAdShown } from '../utils/adFrequency';

export const useInterstitialAd = () => {
  const showAd = useCallback(async () => {
    const canShow = await shouldShowAd('interstitial');
    if (canShow) {
      await recordAdShown('interstitial');
      showInterstitialAd();
    }
  }, []);

  return { showAd };
};
```

### 7. AdMob Policy Compliance

#### Privacy and User Consent
Create a component `src/components/ads/ConsentForm.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Linking } from 'react-native';
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentDebugGeography,
} from 'react-native-google-mobile-ads';
import { useTheme } from '../../hooks/useTheme';

const ConsentForm = ({ onConsent Obtained }) => {
  const { theme } = useTheme();
  const [consentStatus, setConsentStatus] = useState<AdsConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      // Set debug geography for testing (remove in production)
      await AdsConsent.setDebugGeography(AdsConsentDebugGeography.EEA);
      
      // Request consent info update
      const consentInfo = await AdsConsent.requestInfoUpdate([]);
      setConsentStatus(consentInfo.status);
      
      // If consent is not required, proceed
      if (consentInfo.status === AdsConsentStatus.NOT_REQUIRED) {
        onConsentObtained(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking consent status:', error);
      setIsLoading(false);
    }
  };

  const showConsentForm = async () => {
    try {
      const consentResult = await AdsConsent.showForm();
      onConsentObtained(consentResult === AdsConsentStatus.OBTAINED);
    } catch (error) {
      console.error('Error showing consent form:', error);
      onConsentObtained(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://yourapp.com/privacy-policy');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.text, { color: theme.text }]}>Loading...</Text>
      </View>
    );
  }

  if (consentStatus === AdsConsentStatus.REQUIRED) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          Privacy Choices
        </Text>
        <Text style={[styles.text, { color: theme.text }]}>
          This app uses advertising to support our development. We care about your privacy and give you control over your data.
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Accept"
            onPress={showConsentForm}
            color={theme.primary}
          />
          <Button
            title="Privacy Policy"
            onPress={openPrivacyPolicy}
            color={theme.secondary}
          />
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
});

export default ConsentForm;
```

### 8. Testing and Debugging

#### Test Ad Units
The package provides test ad unit IDs that can be used during development:

```typescript
import { TestIds } from 'react-native-google-mobile-ads';

// Test IDs
TestIds.BANNER // Banner test ad
TestIds.INTERSTITIAL // Interstitial test ad
TestIds.REWARDED // Rewarded test ad
TestIds.NATIVE // Native test ad
```

#### Enable Test Devices
Add your device as a test device to avoid invalid clicks:

```typescript
import { mobileAds } from 'react-native-google-mobile-ads';

// Add your device ID
await mobileAds().setRequestConfiguration({
  testDeviceIdentifiers: ['33BE2250B43518CCDA7DE426D04EE231'],
});
```

### 9. Analytics and Performance Monitoring

#### Track Ad Performance
Create a service `src/services/adAnalytics.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';

export const trackAdImpression = async (adType: string, adUnitId: string) => {
  try {
    await analytics().logEvent('ad_impression', {
      ad_type: adType,
      ad_unit_id: adUnitId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error tracking ad impression:', error);
  }
};

export const trackAdClick = async (adType: string, adUnitId: string) => {
  try {
    await analytics().logEvent('ad_click', {
      ad_type: adType,
      ad_unit_id: adUnitId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error tracking ad click:', error);
  }
};

export const trackAdRevenue = async (adType: string, adUnitId: string, revenue: number) => {
  try {
    await analytics().logEvent('ad_revenue', {
      ad_type: adType,
      ad_unit_id: adUnitId,
      revenue: revenue,
      currency: 'USD',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error tracking ad revenue:', error);
  }
};
```

### 10. Best Practices and Optimization

#### Ad Loading Best Practices
1. **Preload ads**: Load interstitial and rewarded ads during app startup or natural pauses
2. **Refresh rate**: For banner ads, use a refresh rate of 30-60 seconds
3. **Ad placement**: Place ads where they won't interrupt user experience
4. **Ad density**: Don't overload screens with ads

#### Performance Optimization
1. **Lazy loading**: Only load ads when they're likely to be shown
2. **Memory management**: Clean up ad references when they're no longer needed
3. **Network awareness**: Don't request ads when the device is offline
4. **Battery optimization**: Consider battery impact when showing ads

#### User Experience Guidelines
1. **Never interrupt core flows**: Don't show ads during critical user actions
2. **Provide value**: For rewarded ads, ensure the reward is worth the user's time
3. **Be transparent**: Clearly indicate when content is an advertisement
4. **Offer ad removal**: Provide an option to remove ads through in-app purchase

## Troubleshooting

### Common Issues

#### Ads Not Showing
1. Check if AdMob is properly initialized
2. Verify ad unit IDs are correct
3. Ensure test ads are enabled in development
4. Check network connectivity

#### Test Ads Showing in Production
1. Remove test device IDs from production builds
2. Replace test ad unit IDs with production IDs
3. Double-check conditional compilation flags

#### Consent Form Not Appearing
1. Verify user is in EEA region (or using debug geography)
2. Check if consent info update is successful
3. Ensure Google Mobile Ads SDK is properly initialized

### Debugging Tools
1. **AdMob Dashboard**: Check ad performance and status
2. **Console Logs**: Enable verbose logging in development
3. **Network Inspector**: Monitor ad requests and responses
4. **Device Logs**: Check native logs for platform-specific issues

## Conclusion
This guide provides a comprehensive implementation of AdMob in your React Native application. By following these steps, you'll be able to effectively monetize your app while maintaining a good user experience.

Remember to:
- Always follow AdMob policies and guidelines
- Test thoroughly before releasing to production
- Monitor ad performance and user metrics
- Continuously optimize ad placement and frequency