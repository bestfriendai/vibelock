# Monetization Implementation Guide
## Complete RevenueCat & AdMob Integration for Expo Development Builds

This comprehensive guide provides step-by-step implementation of monetization features for the Locker Room Talk app, including RevenueCat subscriptions and AdMob advertising, optimized for Expo development builds.

## Table of Contents

1. [Prerequisites & Dependencies](#prerequisites--dependencies)
2. [RevenueCat Implementation](#revenueCat-implementation)
3. [AdMob Integration](#admob-integration)
4. [Build Configuration](#build-configuration)
5. [Code Integration Points](#code-integration-points)
6. [Testing & Debugging](#testing--debugging)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites & Dependencies

### Required Dependencies Installation

```bash
# Install RevenueCat for subscription management
npm install react-native-purchases

# Install AdMob for advertising
npm install react-native-google-mobile-ads

# Install additional dependencies for enhanced functionality
npm install @react-native-async-storage/async-storage # Already installed
npm install react-native-device-info # For device identification
```

### Environment Variables Setup

Add the following to your `.env` file:

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

---

## RevenueCat Implementation

### 1. Enhanced Subscription Store

Replace the existing `src/state/subscriptionStore.ts` with this enhanced version:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, { 
  CustomerInfo, 
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesPackage 
} from 'react-native-purchases';

interface SubscriptionState {
  // Current state
  isPremium: boolean;
  
  // Enhanced state
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  isPro: boolean;
  activeSubscription: PurchasesEntitlementInfo | null;
  offerings: PurchasesOffering[];
  
  // Actions
  setPremium: (v: boolean) => void;
  initializeRevenueCat: (userId?: string) => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
  loadOfferings: () => Promise<void>;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo>;
  setLoading: (loading: boolean) => void;
}

const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Current implementation
      isPremium: false,
      setPremium: (v: boolean) => set({ isPremium: v }),

      // Enhanced implementation
      customerInfo: null,
      isLoading: false,
      isPro: false,
      activeSubscription: null,
      offerings: [],

      initializeRevenueCat: async (userId?: string) => {
        try {
          set({ isLoading: true });
          
          // Configure RevenueCat
          const apiKey = Platform.select({
            ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
            android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
          });

          if (!apiKey) {
            throw new Error('RevenueCat API key not found');
          }

          Purchases.setDebugLogsEnabled(__DEV__);
          
          await Purchases.configure({
            apiKey,
            appUserID: userId,
          });

          // Set user attributes if userId provided
          if (userId) {
            Purchases.setAttributes({
              'user_id': userId,
              'created_at': new Date().toISOString(),
            });
          }

          // Check initial subscription status
          await get().checkSubscriptionStatus();
          await get().loadOfferings();
          
          console.log('RevenueCat initialized successfully');
        } catch (error) {
          console.error('RevenueCat initialization failed:', error);
          set({ isLoading: false });
        }
      },

      checkSubscriptionStatus: async () => {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          get().updateCustomerInfo(customerInfo);
        } catch (error) {
          console.error('Failed to check subscription status:', error);
          set({ isLoading: false });
        }
      },

      updateCustomerInfo: (info: CustomerInfo) => {
        const isPremium = 'premium' in info.entitlements.active;
        const isPro = 'pro' in info.entitlements.active;
        const activeSubscription = info.entitlements.active['premium']
          || info.entitlements.active['pro']
          || null;

        set({
          customerInfo: info,
          isPremium,
          isPro,
          activeSubscription,
          isLoading: false,
        });
      },

      loadOfferings: async () => {
        try {
          const offerings = await Purchases.getOfferings();
          set({ offerings: Object.values(offerings.all) });
        } catch (error) {
          console.error('Failed to load offerings:', error);
        }
      },

      purchasePackage: async (packageToPurchase: PurchasesPackage) => {
        try {
          set({ isLoading: true });
          const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
          get().updateCustomerInfo(customerInfo);
          return customerInfo;
        } catch (error: any) {
          set({ isLoading: false });
          if (!error.userCancelled) {
            console.error('Purchase error:', error);
            throw error;
          }
          return null;
        }
      },

      restorePurchases: async () => {
        try {
          set({ isLoading: true });
          const customerInfo = await Purchases.restorePurchases();
          get().updateCustomerInfo(customerInfo);
          return customerInfo;
        } catch (error) {
          set({ isLoading: false });
          console.error('Restore purchases error:', error);
          throw error;
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: (state) => ({
        isPremium: state.isPremium,
        isPro: state.isPro,
      }),
    },
  ),
);

export default useSubscriptionStore;
```

### 2. RevenueCat Service

Create `src/services/revenueCatService.ts`:

```typescript
import Purchases, { 
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage 
} from 'react-native-purchases';
import { Platform } from 'react-native';

class RevenueCatService {
  private initialized = false;

  async initialize(userId?: string) {
    if (this.initialized) return;

    try {
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      });

      if (!apiKey) {
        throw new Error('RevenueCat API key not configured');
      }

      Purchases.setDebugLogsEnabled(__DEV__);
      
      await Purchases.configure({
        apiKey,
        appUserID: userId,
      });

      this.initialized = true;
      console.log('RevenueCat service initialized');
    } catch (error) {
      console.error('RevenueCat service initialization failed:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return Object.values(offerings.all);
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
      return [];
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Purchase error:', error);
        throw error;
      }
      return null;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Restore purchases error:', error);
      throw error;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('Failed to get customer info:', error);
      throw error;
    }
  }
}

export const revenueCatService = new RevenueCatService();
```

### 3. Paywall Component

Create `src/components/subscription/Paywall.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import useSubscriptionStore from '../../state/subscriptionStore';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
}

interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <View className="flex-row items-center py-3">
    <Text className="text-2xl mr-3">{icon}</Text>
    <Text className="text-text-primary text-base flex-1">{text}</Text>
    <Ionicons name="checkmark" size={20} color="#10B981" />
  </View>
);

interface SubscriptionCardProps {
  package: PurchasesPackage;
  isSelected: boolean;
  onSelect: () => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  package: pkg,
  isSelected,
  onSelect
}) => {
  const isAnnual = pkg.packageType === 'ANNUAL';
  const savings = isAnnual ? '60% OFF' : null;

  return (
    <Pressable
      onPress={onSelect}
      className={`border-2 rounded-xl p-4 mb-3 ${
        isSelected
          ? 'border-brand-red bg-brand-red/10'
          : 'border-surface-700 bg-surface-800'
      }`}
    >
      {savings && (
        <View className="absolute -top-2 -right-2 bg-green-500 px-2 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">{savings}</Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text-primary font-semibold text-lg">
            {pkg.storeProduct.title}
          </Text>
          <Text className="text-text-secondary text-sm">
            {pkg.storeProduct.description}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-text-primary font-bold text-xl">
            {pkg.storeProduct.priceString}
          </Text>
          {isAnnual && (
            <Text className="text-text-tertiary text-xs">
              ${(parseFloat(pkg.storeProduct.price) / 12).toFixed(2)}/month
            </Text>
          )}
        </View>
      </View>

      <View className={`w-5 h-5 rounded-full border-2 mt-3 ${
        isSelected
          ? 'border-brand-red bg-brand-red'
          : 'border-surface-600'
      }`}>
        {isSelected && (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="checkmark" size={12} color="white" />
          </View>
        )}
      </View>
    </Pressable>
  );
};

export const Paywall: React.FC<PaywallProps> = ({ visible, onClose }) => {
  const {
    offerings,
    isLoading,
    purchasePackage,
    restorePurchases,
    loadOfferings
  } = useSubscriptionStore();

  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  useEffect(() => {
    if (offerings.length > 0 && offerings[0].availablePackages) {
      const availablePackages = offerings[0].availablePackages;
      setPackages(availablePackages);

      // Pre-select annual package if available, otherwise first package
      const annual = availablePackages.find(pkg => pkg.packageType === 'ANNUAL');
      setSelectedPackage(annual || availablePackages[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      const customerInfo = await purchasePackage(selectedPackage);
      if (customerInfo) {
        Alert.alert(
          'Success!',
          'Welcome to Locker Room Plus! Enjoy your premium features.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Purchase Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert(
        'Restore Successful',
        'Your purchases have been restored.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert(
        'Restore Failed',
        'No previous purchases found or restore failed.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-surface-900">
        {/* Header */}
        <View className="flex-row items-center justify-between p-6 border-b border-surface-700">
          <Text className="text-text-primary text-xl font-bold">Upgrade to Plus</Text>
          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6">
          {/* Features */}
          <View className="py-6">
            <Text className="text-text-primary text-2xl font-bold mb-6 text-center">
              Unlock Premium Features
            </Text>

            <FeatureItem icon="🚫" text="Ad-Free Experience" />
            <FeatureItem icon="🔍" text="Advanced Search & Filters" />
            <FeatureItem icon="📊" text="Review Analytics & Insights" />
            <FeatureItem icon="🎨" text="Custom Profile Themes" />
            <FeatureItem icon="⚡" text="Priority Support" />
            <FeatureItem icon="🌍" text="Extended Location Search" />
          </View>

          {/* Subscription Packages */}
          <View className="pb-6">
            <Text className="text-text-primary text-lg font-semibold mb-4">
              Choose Your Plan
            </Text>

            {packages.map((pkg) => (
              <SubscriptionCard
                key={pkg.identifier}
                package={pkg}
                isSelected={selectedPackage?.identifier === pkg.identifier}
                onSelect={() => setSelectedPackage(pkg)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="p-6 border-t border-surface-700">
          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPackage || isLoading}
            className={`rounded-xl py-4 items-center mb-4 ${
              !selectedPackage || isLoading
                ? 'bg-surface-700'
                : 'bg-brand-red'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Start Free Trial
              </Text>
            )}
          </Pressable>

          <Pressable onPress={handleRestore} className="py-2">
            <Text className="text-brand-red text-center font-medium">
              Restore Purchases
            </Text>
          </Pressable>

          <Text className="text-text-tertiary text-xs text-center mt-4 leading-4">
            Free trial for 7 days, then auto-renews. Cancel anytime in Settings.
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
```

---

## AdMob Integration

### 1. AdMob Service

Create `src/services/adMobService.ts`:

```typescript
import mobileAds, {
  MaxAdContentRating,
  InterstitialAd,
  TestIds,
  AdEventType
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

class AdMobService {
  private initialized = false;
  private interstitialAd: InterstitialAd | null = null;

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize the Google Mobile Ads SDK
      await mobileAds().initialize();

      // Configure ad settings
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });

      this.initializeInterstitialAd();
      this.initialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
      throw error;
    }
  }

  private initializeInterstitialAd() {
    const adUnitId = __DEV__
      ? TestIds.INTERSTITIAL
      : Platform.select({
          ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
          android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
        });

    if (!adUnitId) {
      console.warn('Interstitial ad unit ID not configured');
      return;
    }

    this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded');
    });

    this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Interstitial ad error:', error);
    });

    // Load the ad
    this.interstitialAd.load();
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.interstitialAd) {
      console.warn('Interstitial ad not initialized');
      return false;
    }

    try {
      const loaded = this.interstitialAd.loaded;
      if (loaded) {
        this.interstitialAd.show();
        // Reload for next time
        this.interstitialAd.load();
        return true;
      } else {
        console.log('Interstitial ad not ready');
        return false;
      }
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  getBannerAdUnitId(): string | undefined {
    return __DEV__
      ? TestIds.ADAPTIVE_BANNER
      : Platform.select({
          ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
          android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
        });
  }
}

export const adMobService = new AdMobService();
```

### 2. Enhanced AdBanner Component

Replace `src/components/AdBanner.tsx` with this enhanced version:

```typescript
import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSubscriptionStore from "../state/subscriptionStore";
import { adMobService } from "../services/adMobService";

interface Props {
  placement: "browse" | "chat";
}

export default function AdBanner({ placement }: Props) {
  const { isPremium } = useSubscriptionStore();
  const insets = useSafeAreaInsets();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Don't show ads to premium users
  if (isPremium) return null;

  const adUnitId = adMobService.getBannerAdUnitId();

  if (!adUnitId) {
    if (__DEV__) {
      console.warn('AdMob banner unit ID not configured');
    }
    return null;
  }

  // Position above navigation bar as per user preference
  const bottomPosition = 52 + (insets.bottom || 0) + 8;

  return (
    <View
      className="absolute left-0 right-0 items-center z-10"
      style={{ bottom: bottomPosition }}
    >
      <View className="w-11/12 bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        {adError ? (
          <View className="px-4 py-3 items-center">
            <Text className="text-text-secondary text-xs">Ad unavailable</Text>
          </View>
        ) : (
          <BannerAd
            unitId={adUnitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdLoaded={() => {
              setAdLoaded(true);
              setAdError(null);
            }}
            onAdFailedToLoad={(error) => {
              console.error('Banner ad failed to load:', error);
              setAdError(error.message);
              setAdLoaded(false);
            }}
          />
        )}

        {/* Ad label for transparency */}
        {adLoaded && (
          <View className="absolute top-1 right-1 bg-black/50 px-1 rounded">
            <Text className="text-white text-[8px]">Ad</Text>
          </View>
        )}
      </View>
    </View>
  );
}
```

### 3. Interstitial Ad Hook

Create `src/hooks/useInterstitialAd.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { adMobService } from '../services/adMobService';
import useSubscriptionStore from '../state/subscriptionStore';

interface UseInterstitialAdOptions {
  frequency?: number; // Show ad every N actions
  minTimeBetweenAds?: number; // Minimum time between ads in milliseconds
}

export const useInterstitialAd = (options: UseInterstitialAdOptions = {}) => {
  const { isPremium } = useSubscriptionStore();
  const actionCountRef = useRef(0);
  const lastAdTimeRef = useRef(0);

  const { frequency = 5, minTimeBetweenAds = 60000 } = options; // Default: every 5 actions, min 1 minute apart

  const showAdIfAppropriate = async (): Promise<boolean> => {
    // Don't show ads to premium users
    if (isPremium) return false;

    actionCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastAd = now - lastAdTimeRef.current;

    // Check if we should show an ad
    const shouldShowAd =
      actionCountRef.current >= frequency &&
      timeSinceLastAd >= minTimeBetweenAds;

    if (shouldShowAd) {
      const adShown = await adMobService.showInterstitialAd();
      if (adShown) {
        actionCountRef.current = 0;
        lastAdTimeRef.current = now;
        return true;
      }
    }

    return false;
  };

  return { showAdIfAppropriate };
};
```

---

## Build Configuration

### 1. Update app.json/app.config.js

Add the following plugins and configuration to your `app.json`:

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

### 2. Initialize Services in App.tsx

Update your `App.tsx` to initialize monetization services:

```typescript
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppState } from "react-native";
import * as Linking from "expo-linking";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import OfflineBanner from "./src/components/OfflineBanner";
import useAuthStore from "./src/state/authStore";
import useChatStore from "./src/state/chatStore";
import useSubscriptionStore from "./src/state/subscriptionStore";
import { notificationService } from "./src/services/notificationService";
import { adMobService } from "./src/services/adMobService";

export default function App() {
  const { initializeAuthListener, cleanupAuth } = useAuthStore();
  const { cleanupChat } = useChatStore();
  const { initializeRevenueCat } = useSubscriptionStore();

  // ... existing linking configuration ...

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize authentication
        initializeAuthListener();

        // Initialize AdMob
        await adMobService.initialize();

        // Initialize RevenueCat (will be called again with userId after auth)
        await initializeRevenueCat();

        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();

    // ... existing AppState change handler ...

    return () => {
      cleanupAuth();
      cleanupChat();
    };
  }, [initializeAuthListener, cleanupAuth, cleanupChat]);

  // Initialize RevenueCat with user ID when authenticated
  useEffect(() => {
    const { user } = useAuthStore.getState();
    if (user?.id) {
      initializeRevenueCat(user.id);
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView className="flex-1">
        <SafeAreaProvider>
          <NavigationContainer linking={linking}>
            <AppNavigator />
            <OfflineBanner />
            <StatusBar style="light" backgroundColor="#000000" />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
```

---

## Code Integration Points

### 1. Settings Screen Integration

Update `src/screens/ProfileScreen.tsx` to include subscription management:

```typescript
// Add these imports at the top
import useSubscriptionStore from "../state/subscriptionStore";
import { Paywall } from "../components/subscription/Paywall";

// Add these state variables in the component
const [showPaywall, setShowPaywall] = useState(false);
const { isPremium, isLoading, restorePurchases } = useSubscriptionStore();

// Add this subscription section after the existing settings options
{/* Subscription Section */}
<View className="bg-surface-800 rounded-lg mb-6">
  <View className="p-5 border-b border-surface-700">
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Ionicons
          name={isPremium ? "diamond" : "diamond-outline"}
          size={20}
          color={isPremium ? "#FFD700" : "#9CA3AF"}
        />
        <Text className="text-text-primary font-medium ml-3">
          {isPremium ? "Locker Room Plus" : "Upgrade to Plus"}
        </Text>
      </View>

      {isPremium ? (
        <View className="bg-green-500/20 px-3 py-1 rounded-full">
          <Text className="text-green-400 text-xs font-medium">Active</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowPaywall(true)}
          className="bg-brand-red px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium text-sm">Upgrade</Text>
        </Pressable>
      )}
    </View>

    {isPremium && (
      <Text className="text-text-secondary text-sm mt-2">
        Enjoying ad-free experience and premium features
      </Text>
    )}
  </View>

  {isPremium && (
    <Pressable
      onPress={async () => {
        try {
          await restorePurchases();
          Alert.alert('Success', 'Purchases restored successfully');
        } catch (error) {
          Alert.alert('Error', 'Failed to restore purchases');
        }
      }}
      className="p-5"
      disabled={isLoading}
    >
      <View className="flex-row items-center">
        <Ionicons name="refresh-outline" size={20} color="#9CA3AF" />
        <Text className="text-text-primary font-medium ml-3">
          Restore Purchases
        </Text>
        {isLoading && (
          <ActivityIndicator size="small" color="#FF6B6B" className="ml-2" />
        )}
      </View>
    </Pressable>
  )}
</View>

{/* Add the Paywall component before the closing View */}
<Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
```

### 2. Feature Gating Component

Create `src/components/FeatureGate.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSubscriptionStore from '../state/subscriptionStore';
import { Paywall } from './subscription/Paywall';

interface FeatureGateProps {
  feature: 'premium' | 'pro';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true
}) => {
  const { isPremium, isPro } = useSubscriptionStore();
  const [showPaywall, setShowPaywall] = useState(false);

  const hasAccess = feature === 'premium' ? (isPremium || isPro) : isPro;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setShowPaywall(true)}
        className="bg-surface-800 border border-surface-700 rounded-lg p-4 items-center"
      >
        <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
        <Text className="text-text-primary font-semibold mt-2">Premium Feature</Text>
        <Text className="text-text-secondary text-sm text-center mt-1">
          Upgrade to Locker Room Plus to unlock this feature
        </Text>
        <View className="bg-brand-red px-4 py-2 rounded-lg mt-3">
          <Text className="text-white font-medium">Upgrade Now</Text>
        </View>
      </Pressable>

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
};
```

### 3. Usage Examples

Here's how to integrate feature gating and ads in your existing screens:

```typescript
// In Search screen for advanced filters
import { FeatureGate } from '../components/FeatureGate';

// Wrap premium features
<FeatureGate feature="premium">
  <AdvancedFilters />
</FeatureGate>

// In Browse screen for interstitial ads
import { useInterstitialAd } from '../hooks/useInterstitialAd';

const BrowseScreen = () => {
  const { showAdIfAppropriate } = useInterstitialAd({ frequency: 10 });

  const handleReviewOpen = async (review) => {
    // Show ad occasionally when opening reviews
    await showAdIfAppropriate();
    navigation.navigate('ReviewDetail', { review });
  };

  // ... rest of component
};
```

---

## Testing & Debugging

### 1. Development Build Testing Checklist

**Pre-Build Checklist:**
- [ ] All environment variables configured in `.env`
- [ ] RevenueCat API keys added to environment
- [ ] AdMob App IDs and Ad Unit IDs configured
- [ ] Google Services files added (`google-services.json` for Android)
- [ ] App Store Connect and Google Play Console configured for in-app purchases

**Build Commands:**
```bash
# Create development build
npx expo install --fix
npx expo run:ios --device
npx expo run:android --device

# For EAS Build
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 2. RevenueCat Testing

**Test Subscription Flow:**
```typescript
// Add this to a test screen for development
const TestSubscriptionScreen = () => {
  const {
    initializeRevenueCat,
    checkSubscriptionStatus,
    loadOfferings,
    offerings,
    customerInfo,
    isPremium
  } = useSubscriptionStore();

  return (
    <View className="flex-1 p-6 bg-surface-900">
      <Text className="text-text-primary text-xl mb-4">Subscription Test</Text>

      <Pressable
        onPress={() => initializeRevenueCat('test-user-123')}
        className="bg-blue-500 p-3 rounded mb-2"
      >
        <Text className="text-white">Initialize RevenueCat</Text>
      </Pressable>

      <Pressable
        onPress={checkSubscriptionStatus}
        className="bg-green-500 p-3 rounded mb-2"
      >
        <Text className="text-white">Check Status</Text>
      </Pressable>

      <Pressable
        onPress={loadOfferings}
        className="bg-purple-500 p-3 rounded mb-2"
      >
        <Text className="text-white">Load Offerings</Text>
      </Pressable>

      <Text className="text-text-secondary mt-4">
        Premium Status: {isPremium ? 'Active' : 'Inactive'}
      </Text>
      <Text className="text-text-secondary">
        Offerings: {offerings.length}
      </Text>
      <Text className="text-text-secondary">
        Customer Info: {customerInfo ? 'Loaded' : 'Not loaded'}
      </Text>
    </View>
  );
};
```

### 3. AdMob Testing

**Test Ad Loading:**
```typescript
// Add this to test ad functionality
const TestAdScreen = () => {
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [interstitialReady, setInterstitialReady] = useState(false);

  useEffect(() => {
    const checkAdStatus = async () => {
      await adMobService.initialize();
      // Check if ads are working
    };
    checkAdStatus();
  }, []);

  return (
    <View className="flex-1 p-6 bg-surface-900">
      <Text className="text-text-primary text-xl mb-4">Ad Test</Text>

      <Pressable
        onPress={async () => {
          const shown = await adMobService.showInterstitialAd();
          Alert.alert('Interstitial', shown ? 'Shown' : 'Not ready');
        }}
        className="bg-red-500 p-3 rounded mb-2"
      >
        <Text className="text-white">Show Interstitial</Text>
      </Pressable>

      <Text className="text-text-secondary mt-4">
        Banner Unit ID: {adMobService.getBannerAdUnitId() || 'Not configured'}
      </Text>
    </View>
  );
};
```

### 4. Common Issues & Solutions

**RevenueCat Issues:**
- **"API key not found"**: Ensure environment variables are properly set and accessible
- **"User not found"**: Initialize RevenueCat with a valid user ID after authentication
- **"Offerings empty"**: Check RevenueCat dashboard configuration and product setup

**AdMob Issues:**
- **"Ad failed to load"**: Verify Ad Unit IDs and ensure test device is configured
- **"App ID not found"**: Check app.json plugin configuration
- **"No fill"**: Normal in development, ensure test ads are enabled

**Build Issues:**
- **"Module not found"**: Run `npx expo install --fix` and rebuild
- **"Native module not linked"**: Ensure development build includes all native dependencies
- **"Google Services not found"**: Verify `google-services.json` is in the correct location

---

## Troubleshooting

### Development Build Specific Issues

1. **RevenueCat not initializing:**
   ```bash
   # Clear Metro cache
   npx expo start --clear

   # Rebuild development build
   npx expo run:ios --device --clear-cache
   ```

2. **AdMob ads not showing:**
   - Verify test device configuration
   - Check network connectivity
   - Ensure Ad Unit IDs are correct for development/production

3. **Environment variables not accessible:**
   - Restart Metro bundler after adding new env vars
   - Verify `EXPO_PUBLIC_` prefix for client-side variables

### Production Preparation

1. **Replace test Ad Unit IDs with production IDs**
2. **Configure RevenueCat webhooks for backend integration**
3. **Set up App Store Connect and Google Play Console for subscriptions**
4. **Test subscription flows with TestFlight/Internal Testing**
5. **Implement analytics tracking for monetization events**

### Performance Optimization

1. **Lazy load paywall components**
2. **Cache subscription status appropriately**
3. **Implement ad frequency capping**
4. **Monitor app performance impact of ads**

---

## Next Steps

1. **Install dependencies** and configure environment variables
2. **Update app.json** with required plugins
3. **Replace existing subscription store** with enhanced version
4. **Implement paywall component** and integrate with settings
5. **Replace AdBanner component** with AdMob integration
6. **Create development build** and test all functionality
7. **Configure RevenueCat dashboard** with products and offerings
8. **Set up AdMob account** and configure ad units
9. **Test subscription flows** thoroughly before production
10. **Monitor performance** and user experience impact

This implementation provides a complete, production-ready monetization system that respects user preferences for non-intrusive advertising while providing clear value through premium subscriptions.
