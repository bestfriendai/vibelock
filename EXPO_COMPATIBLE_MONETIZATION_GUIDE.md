# Expo Compatible Monetization Implementation
## Works in Expo Go + Full Features in Development Builds

This guide implements monetization features that gracefully degrade in Expo Go while providing full functionality in development builds.

## Strategy Overview

- **Expo Go**: Mock implementations, no crashes, clean UI fallbacks
- **Development Build**: Full RevenueCat + AdMob integration
- **Runtime Detection**: Automatically detects environment and adapts

---

## 1. Environment Detection Utility

Create `src/utils/buildEnvironment.ts`:

```typescript
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface BuildEnvironment {
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  isProduction: boolean;
  hasNativeModules: boolean;
}

export const getBuildEnvironment = (): BuildEnvironment => {
  const isExpoGo = Constants.appOwnership === 'expo';
  const isDevelopmentBuild = Constants.appOwnership === 'standalone' && __DEV__;
  const isProduction = Constants.appOwnership === 'standalone' && !__DEV__;
  
  // Check if native modules are available
  let hasNativeModules = false;
  try {
    // Try to import a native module to test availability
    require('react-native-purchases');
    hasNativeModules = true;
  } catch {
    hasNativeModules = false;
  }

  return {
    isExpoGo,
    isDevelopmentBuild,
    isProduction,
    hasNativeModules,
  };
};

export const buildEnv = getBuildEnvironment();

// Helper functions
export const canUseRevenueCat = () => buildEnv.hasNativeModules && !buildEnv.isExpoGo;
export const canUseAdMob = () => buildEnv.hasNativeModules && !buildEnv.isExpoGo;
export const shouldShowMonetization = () => !buildEnv.isExpoGo;
```

---

## 2. Adaptive Subscription Store

Replace `src/state/subscriptionStore.ts`:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { canUseRevenueCat, buildEnv } from "../utils/buildEnvironment";

// Types (always available)
interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
}

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  storeProduct: {
    title: string;
    description: string;
    priceString: string;
    price: string;
  };
}

interface PurchasesOffering {
  identifier: string;
  availablePackages: PurchasesPackage[];
}

interface SubscriptionState {
  // Core state (always available)
  isPremium: boolean;
  isLoading: boolean;
  
  // Enhanced state (development build only)
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  activeSubscription: any | null;
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
      // Core state
      isPremium: false,
      isLoading: false,
      
      // Enhanced state
      customerInfo: null,
      isPro: false,
      activeSubscription: null,
      offerings: [],

      setPremium: (v: boolean) => set({ isPremium: v }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      initializeRevenueCat: async (userId?: string) => {
        if (!canUseRevenueCat()) {
          console.log('RevenueCat not available in Expo Go - using mock implementation');
          // Mock successful initialization
          set({ isLoading: false });
          return;
        }

        try {
          set({ isLoading: true });
          
          // Dynamic import for development builds only
          const Purchases = (await import('react-native-purchases')).default;
          const { Platform } = await import('react-native');
          
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

          if (userId) {
            Purchases.setAttributes({
              'user_id': userId,
              'created_at': new Date().toISOString(),
            });
          }

          await get().checkSubscriptionStatus();
          await get().loadOfferings();
          
          console.log('RevenueCat initialized successfully');
        } catch (error) {
          console.error('RevenueCat initialization failed:', error);
          set({ isLoading: false });
        }
      },

      checkSubscriptionStatus: async () => {
        if (!canUseRevenueCat()) {
          // Mock implementation for Expo Go
          set({ isLoading: false });
          return;
        }

        try {
          const Purchases = (await import('react-native-purchases')).default;
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
        if (!canUseRevenueCat()) {
          // Mock offerings for Expo Go
          const mockOfferings: PurchasesOffering[] = [
            {
              identifier: 'default',
              availablePackages: [
                {
                  identifier: 'monthly',
                  packageType: 'MONTHLY',
                  storeProduct: {
                    title: 'Monthly Premium',
                    description: 'Premium features monthly',
                    priceString: '$4.99',
                    price: '4.99',
                  },
                },
                {
                  identifier: 'annual',
                  packageType: 'ANNUAL',
                  storeProduct: {
                    title: 'Annual Premium',
                    description: 'Premium features yearly',
                    priceString: '$29.99',
                    price: '29.99',
                  },
                },
              ],
            },
          ];
          set({ offerings: mockOfferings });
          return;
        }

        try {
          const Purchases = (await import('react-native-purchases')).default;
          const offerings = await Purchases.getOfferings();
          set({ offerings: Object.values(offerings.all) });
        } catch (error) {
          console.error('Failed to load offerings:', error);
        }
      },

      purchasePackage: async (packageToPurchase: PurchasesPackage) => {
        if (!canUseRevenueCat()) {
          // Mock purchase for Expo Go - simulate success
          set({ isLoading: true });
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
          set({ isPremium: true, isLoading: false });
          
          const mockCustomerInfo: CustomerInfo = {
            entitlements: {
              active: { premium: {} },
            },
          };
          return mockCustomerInfo;
        }

        try {
          set({ isLoading: true });
          const Purchases = (await import('react-native-purchases')).default;
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
        if (!canUseRevenueCat()) {
          // Mock restore for Expo Go
          const mockCustomerInfo: CustomerInfo = {
            entitlements: { active: {} },
          };
          return mockCustomerInfo;
        }

        try {
          set({ isLoading: true });
          const Purchases = (await import('react-native-purchases')).default;
          const customerInfo = await Purchases.restorePurchases();
          get().updateCustomerInfo(customerInfo);
          return customerInfo;
        } catch (error) {
          set({ isLoading: false });
          console.error('Restore purchases error:', error);
          throw error;
        }
      },
    }),
    {
      name: "subscription-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPremium: state.isPremium,
        isPro: state.isPro,
      }),
    },
  ),
);

export default useSubscriptionStore;
```

---

## 3. Adaptive AdMob Service

Create `src/services/adMobService.ts`:

```typescript
import { Platform } from 'react-native';
import { canUseAdMob, buildEnv } from '../utils/buildEnvironment';

// Mock types for Expo Go
interface MockInterstitialAd {
  loaded: boolean;
  load: () => void;
  show: () => void;
  addAdEventListener: (event: string, callback: (data?: any) => void) => void;
}

class AdMobService {
  private initialized = false;
  private interstitialAd: any = null;
  private mockInterstitialAd: MockInterstitialAd | null = null;

  async initialize() {
    if (this.initialized) return;

    if (!canUseAdMob()) {
      console.log('AdMob not available in Expo Go - using mock implementation');
      this.initializeMockAds();
      this.initialized = true;
      return;
    }

    try {
      // Dynamic import for development builds only
      const mobileAds = (await import('react-native-google-mobile-ads')).default;
      const { MaxAdContentRating } = await import('react-native-google-mobile-ads');

      await mobileAds().initialize();

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });

      await this.initializeInterstitialAd();
      this.initialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
      // Fallback to mock implementation
      this.initializeMockAds();
      this.initialized = true;
    }
  }

  private initializeMockAds() {
    // Create mock interstitial ad for Expo Go
    this.mockInterstitialAd = {
      loaded: true,
      load: () => console.log('Mock: Loading interstitial ad'),
      show: () => console.log('Mock: Showing interstitial ad'),
      addAdEventListener: (event: string, callback: (data?: any) => void) => {
        console.log(`Mock: Added listener for ${event}`);
        // Simulate loaded event
        if (event === 'loaded') {
          setTimeout(() => callback(), 1000);
        }
      },
    };
  }

  private async initializeInterstitialAd() {
    if (!canUseAdMob()) return;

    try {
      const { InterstitialAd, TestIds, AdEventType } = await import('react-native-google-mobile-ads');

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

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('Interstitial ad error:', error);
      });

      this.interstitialAd.load();
    } catch (error) {
      console.error('Failed to initialize interstitial ad:', error);
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!canUseAdMob()) {
      // Mock implementation for Expo Go
      console.log('Mock: Showing interstitial ad');
      return true;
    }

    const ad = this.interstitialAd || this.mockInterstitialAd;
    if (!ad) {
      console.warn('Interstitial ad not initialized');
      return false;
    }

    try {
      if (ad.loaded) {
        ad.show();
        if (this.interstitialAd) {
          this.interstitialAd.load(); // Reload for next time
        }
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
    if (!canUseAdMob()) {
      return 'mock-banner-unit-id'; // Mock ID for Expo Go
    }

    try {
      const TestIds = require('react-native-google-mobile-ads').TestIds;
      return __DEV__
        ? TestIds.ADAPTIVE_BANNER
        : Platform.select({
            ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
            android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
          });
    } catch {
      return 'mock-banner-unit-id';
    }
  }
}

export const adMobService = new AdMobService();
```

---

## 4. Adaptive AdBanner Component

Replace `src/components/AdBanner.tsx`:

```typescript
import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseAdMob, buildEnv } from "../utils/buildEnvironment";

interface Props {
  placement: "browse" | "chat";
}

// Mock Banner Component for Expo Go
const MockBannerAd: React.FC<{ onLoad: () => void; onError: (error: string) => void }> = ({
  onLoad,
  onError
}) => {
  useEffect(() => {
    // Simulate ad loading
    const timer = setTimeout(() => {
      if (Math.random() > 0.1) { // 90% success rate
        onLoad();
      } else {
        onError('Mock ad failed to load');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onLoad, onError]);

  return (
    <View className="bg-surface-700 p-4 items-center justify-center min-h-[50px]">
      <Text className="text-text-secondary text-xs">Mock Ad Banner</Text>
      <Text className="text-text-muted text-[10px] mt-1">
        {buildEnv.isExpoGo ? 'Expo Go Mode' : 'Development Mode'}
      </Text>
    </View>
  );
};

// Real Banner Component for Development Builds
const RealBannerAd: React.FC<{
  unitId: string;
  onLoad: () => void;
  onError: (error: string) => void
}> = ({ unitId, onLoad, onError }) => {
  const [BannerAd, setBannerAd] = useState<any>(null);
  const [BannerAdSize, setBannerAdSize] = useState<any>(null);

  useEffect(() => {
    const loadAdComponents = async () => {
      try {
        const adModule = await import('react-native-google-mobile-ads');
        setBannerAd(adModule.BannerAd);
        setBannerAdSize(adModule.BannerAdSize);
      } catch (error) {
        console.error('Failed to load AdMob components:', error);
        onError('Failed to load ad components');
      }
    };

    loadAdComponents();
  }, [onError]);

  if (!BannerAd || !BannerAdSize) {
    return (
      <View className="bg-surface-700 p-4 items-center justify-center min-h-[50px]">
        <Text className="text-text-secondary text-xs">Loading ad...</Text>
      </View>
    );
  }

  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      onAdLoaded={onLoad}
      onAdFailedToLoad={(error: any) => onError(error.message)}
    />
  );
};

export default function AdBanner({ placement }: Props) {
  const { isPremium } = useSubscriptionStore();
  const insets = useSafeAreaInsets();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Don't show ads to premium users
  if (isPremium) return null;

  const handleAdLoad = () => {
    setAdLoaded(true);
    setAdError(null);
  };

  const handleAdError = (error: string) => {
    console.error('Banner ad error:', error);
    setAdError(error);
    setAdLoaded(false);
  };

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
        ) : canUseAdMob() ? (
          <RealBannerAd
            unitId={require('../services/adMobService').adMobService.getBannerAdUnitId() || ''}
            onLoad={handleAdLoad}
            onError={handleAdError}
          />
        ) : (
          <MockBannerAd onLoad={handleAdLoad} onError={handleAdError} />
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

---

## 5. Adaptive Paywall Component

Create `src/components/subscription/PaywallAdaptive.tsx`:

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
import useSubscriptionStore from '../../state/subscriptionStore';
import { buildEnv, canUseRevenueCat } from '../../utils/buildEnvironment';

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
  package: any;
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

export const PaywallAdaptive: React.FC<PaywallProps> = ({ visible, onClose }) => {
  const {
    offerings,
    isLoading,
    purchasePackage,
    restorePurchases,
    loadOfferings
  } = useSubscriptionStore();

  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);

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
      const annual = availablePackages.find((pkg: any) => pkg.packageType === 'ANNUAL');
      setSelectedPackage(annual || availablePackages[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      const customerInfo = await purchasePackage(selectedPackage);
      if (customerInfo) {
        const message = canUseRevenueCat()
          ? 'Welcome to Locker Room Plus! Enjoy your premium features.'
          : 'Demo purchase successful! In a real app, this would activate premium features.';

        Alert.alert('Success!', message, [{ text: 'OK', onPress: onClose }]);
      }
    } catch (error: any) {
      const message = canUseRevenueCat()
        ? error.message || 'Something went wrong. Please try again.'
        : 'This is a demo. Real purchases require a development build.';

      Alert.alert('Purchase Failed', message, [{ text: 'OK' }]);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      const message = canUseRevenueCat()
        ? 'Your purchases have been restored.'
        : 'Demo restore successful!';

      Alert.alert('Restore Successful', message, [{ text: 'OK', onPress: onClose }]);
    } catch (error: any) {
      const message = canUseRevenueCat()
        ? 'No previous purchases found or restore failed.'
        : 'This is a demo. Real restore requires a development build.';

      Alert.alert('Restore Failed', message, [{ text: 'OK' }]);
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

        {/* Expo Go Notice */}
        {buildEnv.isExpoGo && (
          <View className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg mx-6 mt-4 p-3">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text className="text-yellow-600 text-sm font-medium ml-2">Demo Mode</Text>
            </View>
            <Text className="text-yellow-700 text-xs mt-1">
              This is a demo in Expo Go. Real purchases require a development build.
            </Text>
          </View>
        )}

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
                {buildEnv.isExpoGo ? 'Try Demo' : 'Start Free Trial'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={handleRestore} className="py-2">
            <Text className="text-brand-red text-center font-medium">
              Restore Purchases
            </Text>
          </Pressable>

          <Text className="text-text-tertiary text-xs text-center mt-4 leading-4">
            {buildEnv.isExpoGo
              ? 'Demo mode - no real purchases will be made.'
              : 'Free trial for 7 days, then auto-renews. Cancel anytime in Settings.'
            }
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
```

---

## 6. Updated App.tsx Integration

Update your `App.tsx` to initialize services conditionally:

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
import { buildEnv } from "./src/utils/buildEnvironment";

export default function App() {
  const { initializeAuthListener, cleanupAuth } = useAuthStore();
  const { cleanupChat } = useChatStore();
  const { initializeRevenueCat } = useSubscriptionStore();

  // ... existing linking configuration ...

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('App Environment:', {
          isExpoGo: buildEnv.isExpoGo,
          isDevelopmentBuild: buildEnv.isDevelopmentBuild,
          hasNativeModules: buildEnv.hasNativeModules,
        });

        // Initialize authentication (always available)
        initializeAuthListener();

        // Initialize monetization services conditionally
        if (buildEnv.hasNativeModules) {
          console.log('Initializing native monetization services...');
          await Promise.all([
            adMobService.initialize(),
            initializeRevenueCat(),
          ]);
        } else {
          console.log('Using mock monetization services for Expo Go...');
          await Promise.all([
            adMobService.initialize(), // Will use mock implementation
            initializeRevenueCat(), // Will use mock implementation
          ]);
        }

        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization error:', error);
        // Don't crash the app, continue with limited functionality
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

## 7. Settings Screen Integration

Update your `src/screens/ProfileScreen.tsx`:

```typescript
// Add these imports
import useSubscriptionStore from "../state/subscriptionStore";
import { PaywallAdaptive } from "../components/subscription/PaywallAdaptive";
import { buildEnv } from "../utils/buildEnvironment";

// Add state in component
const [showPaywall, setShowPaywall] = useState(false);
const { isPremium, isLoading, restorePurchases } = useSubscriptionStore();

// Add this section after your existing settings options:
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
          <Text className="text-green-400 text-xs font-medium">
            {buildEnv.isExpoGo ? 'Demo' : 'Active'}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowPaywall(true)}
          className="bg-brand-red px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium text-sm">
            {buildEnv.isExpoGo ? 'Try Demo' : 'Upgrade'}
          </Text>
        </Pressable>
      )}
    </View>

    <Text className="text-text-secondary text-sm mt-2">
      {isPremium
        ? `Enjoying ad-free experience and premium features${buildEnv.isExpoGo ? ' (Demo)' : ''}`
        : `Unlock advanced features and remove ads${buildEnv.isExpoGo ? ' (Demo available)' : ''}`
      }
    </Text>
  </View>

  {isPremium && (
    <Pressable
      onPress={async () => {
        try {
          await restorePurchases();
          const message = buildEnv.isExpoGo
            ? 'Demo restore successful!'
            : 'Purchases restored successfully';
          Alert.alert('Success', message);
        } catch (error) {
          const message = buildEnv.isExpoGo
            ? 'Demo restore failed'
            : 'Failed to restore purchases';
          Alert.alert('Error', message);
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

{/* Add before closing View */}
<PaywallAdaptive visible={showPaywall} onClose={() => setShowPaywall(false)} />
```

---

## 8. Installation & Setup Steps

### Step 1: Install Dependencies (Optional for Expo Go)

```bash
# These will only work in development builds, but won't break Expo Go
npm install react-native-purchases react-native-google-mobile-ads
```

### Step 2: Add Environment Variables

Add to your `.env` file:

```env
# RevenueCat (only used in development builds)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxxx

# AdMob (only used in development builds)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxx~xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-xxxxxxxx~xxxxxxxxxx
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
```

### Step 3: Update app.json for Development Builds

```json
{
  "expo": {
    "plugins": [
      // ... existing plugins ...
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
          "userTrackingUsageDescription": "This identifier will be used to deliver personalized ads to you."
        }
      ]
    ]
  }
}
```

### Step 4: Test Both Environments

**Expo Go Testing:**
```bash
npx expo start
# Scan QR code with Expo Go
# Should see mock ads and demo subscription flow
```

**Development Build Testing:**
```bash
npx expo run:ios --device
npx expo run:android --device
# Should see real ads and subscription functionality
```

---

## 9. What Works Where

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Mock Subscription UI | ✅ | ✅ |
| Real RevenueCat | ❌ | ✅ |
| Mock Ad Banners | ✅ | ✅ |
| Real AdMob Ads | ❌ | ✅ |
| Settings Integration | ✅ | ✅ |
| Feature Gating UI | ✅ | ✅ |
| Environment Detection | ✅ | ✅ |

This implementation ensures your app works perfectly in both environments while providing the full monetization experience in development builds!
