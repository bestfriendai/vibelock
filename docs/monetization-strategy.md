# Locker Room Talk App Monetization Strategy

## Executive Summary

This document outlines a comprehensive monetization strategy for the Locker Room Talk mobile app. Currently, the app has a basic subscription infrastructure in place with a simple premium flag system. This strategy provides a roadmap for implementing multiple revenue streams including subscriptions, advertising, virtual currency, and business accounts while maintaining an excellent user experience.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Monetization Models](#monetization-models)
3. [Implementation Strategy](#implementation-strategy)
4. [React Native Google Mobile Ads Integration](#react-native-google-mobile-ads-integration)
5. [RevenueCat Integration](#revenucat-integration)
6. [Revenue Projections](#revenue-projections)
7. [Monitoring & Optimization](#monitoring--optimization)

## Current State Analysis

### Existing Infrastructure
- **Subscription Store**: Basic implementation in `src/state/subscriptionStore.ts` (simple boolean flag)
- **Tech Stack**: React Native 0.79.5, Expo SDK 53, React 19.0.0, TypeScript
- **Backend**: Supabase exclusively (Auth, Realtime, Storage, Edge Functions)
- **State Management**: Zustand for efficient state handling
- **UI Components**: FlashList-based grids optimized for performance
- **Ad Infrastructure**: Placeholder AdBanner component exists but not connected to ad networks

### App Features
- Dating reviews with location-based filtering
- Real-time chat functionality in themed rooms
- User profiles and social interactions
- Photo/video content sharing with reviews
- Content moderation and reporting system
- Push notifications via Expo

## Monetization Models

### 1. Simple Subscription Model (Locker Room Plus)

#### Tier Structure

**Free Tier (Unlimited Reviews)**
- Unlimited review posting (encourage maximum content creation)
- View all public reviews
- Full chat functionality
- Standard photo uploads (up to 5 per review)
- Location-based browsing
- Basic search and filtering

**Locker Room Plus ($4.99/month)**
- Ad-free experience
- Advanced search filters (age range, specific traits, etc.)
- Extended search radius (nationwide vs. local area)
- Priority customer support
- Profile customization options
- Early access to new features
- Review analytics (see who viewed your reviews)

### 2. Non-Intrusive Advertising

#### Ad Formats and Placement Philosophy
- **Never interrupt review creation or posting flow**
- **Never show ads after posting reviews** (encourage more posting)
- **Minimal frequency** to maintain user experience
- **Easy to dismiss** and clearly labeled

**Banner Ads (Free Users Only)**
- Location: Bottom of main browse screen only
- Frequency: Single banner, not in feeds
- Size: Small, non-obtrusive banner
- Implementation: Native integration, matches app design

**Sponsored Content (Optional)**
- Clearly labeled sponsored reviews or profiles
- Integrated naturally into feed
- Frequency: Maximum 1 per 20 organic reviews
- User can easily skip or hide

### 3. Optional Premium Features (No Virtual Currency)

#### Premium-Only Features
- **Advanced Search Filters**
  - Filter by specific traits, age ranges, interests
  - Search across wider geographic areas
  - Save custom search preferences

- **Enhanced Profile Features**
  - Custom profile themes and colors
  - Additional profile sections
  - Verified profile badges (manual verification)

- **Analytics & Insights**
  - See who viewed your reviews
  - Review performance metrics
  - Popular search terms in your area



### 4. Additional Revenue Streams

**Affiliate Partnerships**
- Dating app referrals (commission-based)
- Dating coach/service referrals

**Data Insights (Anonymous)**
- Aggregate dating trends reports for researchers
- Anonymous location-based dating insights
- Market research partnerships (fully anonymized data only)

## Implementation Strategy

### Phase 1: Basic Subscription System (Weeks 1-2)
1. Upgrade basic subscription store to support simple premium tier
2. Implement RevenueCat for subscription management
3. Create simple, non-intrusive paywall screens
4. Add feature gating for premium-only features (advanced search, ad-free)

### Phase 2: Non-Intrusive Advertising (Weeks 3-4)
1. Replace placeholder AdBanner with minimal banner implementation
2. Implement single banner ad on browse screen only
3. Ensure ads never interrupt review posting flow
4. Add easy dismiss/hide options for ads

### Phase 3: Premium Features (Weeks 5-6)
1. Implement advanced search filters for premium users
2. Add extended geographic search radius
3. Create ad-free experience for subscribers
4. Add basic profile customization options

### Phase 4: Affiliate Integration (Weeks 7-8)
1. Build affiliate referral system
2. Add dating app referral tracking
3. Implement commission tracking
4. Create referral analytics

### Phase 5: Analytics & Insights (Weeks 9-10)
1. Add review analytics for premium users
2. Implement view tracking and insights
3. Create performance metrics dashboard
4. Add anonymous data aggregation for research partnerships

### Phase 6: Optimization (Ongoing)
1. Monitor user engagement and review posting rates
2. A/B test premium features and pricing
3. Optimize ad placement for minimal intrusion
4. Refine partnership revenue streams

## React Native Google Mobile Ads Integration

### Installation

```bash
# Install the package
npm install react-native-google-mobile-ads

# iOS Setup
cd ios && pod install

# For Expo managed workflow
expo install react-native-google-mobile-ads
```

### Configuration

#### 1. Update app.json for Expo

```json
{
  "expo": {
    "plugins": [
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

#### 2. Initialize the SDK

```typescript
// src/services/adService.ts
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

export const initializeAds = async () => {
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

    console.log('Google Mobile Ads initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ads:', error);
  }
};
```

#### 3. Banner Ad Component

```typescript
// src/components/ads/BannerAdView.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSubscriptionStore } from '../../state/subscriptionStore';

const adUnitId = __DEV__ 
  ? TestIds.ADAPTIVE_BANNER 
  : Platform.select({
      ios: 'ca-app-pub-xxxxxxxx/xxxxxxxxxx',
      android: 'ca-app-pub-xxxxxxxx/xxxxxxxxxx',
    });

export const BannerAdView: React.FC = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const { isPremium } = useSubscriptionStore();

  // Don't show ads to premium users
  if (isPremium) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => console.error('Ad failed to load:', error)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});
```

#### 4. Interstitial Ad Implementation

```typescript
// src/services/interstitialAdService.ts
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-xxxxxxxx/xxxxxxxxxx',
      android: 'ca-app-pub-xxxxxxxx/xxxxxxxxxx',
    });

class InterstitialAdService {
  private interstitial: InterstitialAd;
  private isLoaded: boolean = false;

  constructor() {
    this.interstitial = InterstitialAd.createForAdRequest(adUnitId);
    this.setupListeners();
    this.load();
  }

  private setupListeners() {
    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
      this.isLoaded = true;
    });

    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      this.isLoaded = false;
      this.load(); // Preload next ad
    });
  }

  private load() {
    this.interstitial.load();
  }

  public async show(): Promise<void> {
    if (this.isLoaded) {
      await this.interstitial.show();
    } else {
      console.log('Interstitial ad not loaded yet');
      this.load();
    }
  }
}

export const interstitialAdService = new InterstitialAdService();
```

#### 5. Rewarded Ad Implementation

```typescript
// src/components/ads/RewardedAdButton.tsx
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'ca-app-pub-xxxxxxxx/xxxxxxxxxx',
      android: 'ca-app-pub-xxxxxxxx/xxxxxxxxxx',
    });

interface Props {
  onRewarded: (reward: { type: string; amount: number }) => void;
  buttonText: string;
}

export const RewardedAdButton: React.FC<Props> = ({ onRewarded, buttonText }) => {
  const [loaded, setLoaded] = useState(false);
  const rewarded = RewardedAd.createForAdRequest(adUnitId);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        onRewarded(reward);
        rewarded.load(); // Load next ad
      }
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, []);

  const showAd = async () => {
    if (loaded) {
      await rewarded.show();
      setLoaded(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, !loaded && styles.disabled]}
      onPress={showAd}
      disabled={!loaded}
    >
      <Text style={styles.buttonText}>{buttonText}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
```

#### 6. Native Ad Integration in Feed

```typescript
// src/components/ads/NativeAdView.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useNativeAd } from '../../hooks/useNativeAd';

export const NativeAdView: React.FC = () => {
  const { ad, loading } = useNativeAd();

  if (loading || !ad) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: ad.icon }} style={styles.icon} />
        <View>
          <Text style={styles.headline}>{ad.headline}</Text>
          <Text style={styles.advertiser}>{ad.advertiser}</Text>
        </View>
      </View>
      
      {ad.images?.[0] && (
        <Image source={{ uri: ad.images[0] }} style={styles.mainImage} />
      )}
      
      <Text style={styles.body}>{ad.body}</Text>
      
      <TouchableOpacity style={styles.ctaButton}>
        <Text style={styles.ctaText}>{ad.callToAction}</Text>
      </TouchableOpacity>
      
      <Text style={styles.adLabel}>Ad</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headline: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  advertiser: {
    fontSize: 12,
    color: '#999',
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 10,
  },
  body: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  adLabel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    color: '#fff',
  },
});
```

### Ad Mediation Setup

```typescript
// src/config/adMediation.ts
export const AdNetworkConfig = {
  admob: {
    enabled: true,
    priority: 1,
  },
  facebook: {
    enabled: true,
    priority: 2,
    appId: 'YOUR_FB_APP_ID',
  },
  unity: {
    enabled: true,
    priority: 3,
    gameId: 'YOUR_UNITY_GAME_ID',
  },
};
```

### Best Practices for Ad Implementation

1. **User Experience First**
   - Never show ads during critical user flows
   - Implement frequency capping
   - Ensure ads don't cover important content

2. **Performance Optimization**
   - Preload ads before showing
   - Use lazy loading for banner ads
   - Implement proper cleanup in useEffect

3. **Testing Strategy**
   - Always use test ads during development
   - Test on multiple devices and screen sizes
   - Monitor crash rates after implementation

4. **Compliance**
   - Implement proper consent management
   - Follow platform-specific guidelines
   - Respect user privacy settings

## RevenueCat Integration

### Installation and Setup

```bash
# Install RevenueCat
npm install react-native-purchases

# iOS setup
cd ios && pod install

# For Expo
expo install react-native-purchases
```

### Configuration

#### 1. Initialize RevenueCat

```typescript
// src/services/revenueCatService.ts
import Purchases, { 
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage 
} from 'react-native-purchases';
import { Platform } from 'react-native';

class RevenueCatService {
  private apiKeys = {
    ios: 'appl_xxxxxxxxxxxxxxxxxxxxxx',
    android: 'goog_xxxxxxxxxxxxxxxxxxxxxx',
  };

  async initialize(userId?: string) {
    try {
      Purchases.setDebugLogsEnabled(__DEV__);
      
      await Purchases.configure({
        apiKey: Platform.select(this.apiKeys)!,
        appUserID: userId, // Optional, for user identification
      });

      // Set user attributes
      if (userId) {
        Purchases.setAttributes({
          'user_id': userId,
          'created_at': new Date().toISOString(),
        });
      }

      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
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

#### 2. Current Subscription Store (Basic Implementation)

```typescript
// src/state/subscriptionStore.ts - Current Implementation
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SubscriptionState {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
}

const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      isPremium: false,
      setPremium: (v: boolean) => set({ isPremium: v }),
    }),
    { name: "subscription-storage", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export default useSubscriptionStore;
```

#### 2.1 Enhanced Subscription Store (Planned Implementation)

```typescript
// src/state/subscriptionStore.ts - Enhanced Version with RevenueCat
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';
import { revenueCatService } from '../services/revenueCatService';

interface SubscriptionState {
  // Current state
  isPremium: boolean;

  // Enhanced state (to be added)
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  isPro: boolean;
  activeSubscription: PurchasesEntitlementInfo | null;

  // Current actions
  setPremium: (v: boolean) => void;

  // Enhanced actions (to be added)
  checkSubscriptionStatus: () => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      // Current implementation
      isPremium: false,
      setPremium: (v: boolean) => set({ isPremium: v }),

      // Enhanced implementation (to be added)
      customerInfo: null,
      isLoading: false,
      isPro: false,
      activeSubscription: null,

      checkSubscriptionStatus: async () => {
        set({ isLoading: true });
        try {
          const customerInfo = await revenueCatService.getCustomerInfo();

          const isPremium = 'premium' in customerInfo.entitlements.active;
          const isPro = 'pro' in customerInfo.entitlements.active;
          const activeSubscription = customerInfo.entitlements.active['premium']
            || customerInfo.entitlements.active['pro']
            || null;

          set({
            customerInfo,
            isPremium,
            isPro,
            activeSubscription,
            isLoading: false,
          });
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
        });
      },
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
```

#### 3. Paywall Component

```typescript
// src/components/subscription/Paywall.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { revenueCatService } from '../../services/revenueCatService';
import { SubscriptionCard } from './SubscriptionCard';
import { useSubscriptionStore } from '../../state/subscriptionStore';

export const Paywall: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const { updateCustomerInfo } = useSubscriptionStore();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await revenueCatService.getOfferings();
      if (offerings.length > 0 && offerings[0].availablePackages) {
        setPackages(offerings[0].availablePackages);
        // Pre-select the annual package if available
        const annual = offerings[0].availablePackages.find(
          pkg => pkg.packageType === 'ANNUAL'
        );
        setSelectedPackage(annual || offerings[0].availablePackages[0]);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    try {
      const customerInfo = await revenueCatService.purchasePackage(selectedPackage);
      if (customerInfo) {
        updateCustomerInfo(customerInfo);
        onClose();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        // Show error alert
        console.error('Purchase failed:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const customerInfo = await revenueCatService.restorePurchases();
      updateCustomerInfo(customerInfo);
      
      if (customerInfo.entitlements.active['premium'] || 
          customerInfo.entitlements.active['pro']) {
        onClose();
      } else {
        // Show "no purchases to restore" message
      }
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Unlock Premium Features</Text>
      
      <View style={styles.features}>
        <FeatureItem icon="🚀" text="Unlimited Reviews" />
        <FeatureItem icon="🔍" text="Advanced Search & Filters" />
        <FeatureItem icon="📊" text="Review Analytics" />
        <FeatureItem icon="🎨" text="Custom Profile Themes" />
        <FeatureItem icon="🚫" text="Ad-Free Experience" />
        <FeatureItem icon="⚡" text="Priority Support" />
      </View>

      <View style={styles.packages}>
        {packages.map((pkg) => (
          <SubscriptionCard
            key={pkg.identifier}
            package={pkg}
            isSelected={selectedPackage?.identifier === pkg.identifier}
            onSelect={() => setSelectedPackage(pkg)}
          />
        ))}
      </View>

      <TouchableOpacity 
        style={styles.purchaseButton} 
        onPress={handlePurchase}
        disabled={!selectedPackage}
      >
        <Text style={styles.purchaseButtonText}>
          {selectedPackage ? `Subscribe for ${selectedPackage.product.priceString}` : 'Select a Plan'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By subscribing, you agree to our Terms of Service and Privacy Policy.
        Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
      </Text>
    </ScrollView>
  );
};

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  features: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#ccc',
  },
  packages: {
    marginBottom: 30,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  terms: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
```

#### 4. Feature Gating Implementation

```typescript
// src/components/FeatureGate.tsx
import React from 'react';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { Paywall } from './subscription/Paywall';

interface FeatureGateProps {
  feature: 'premium' | 'pro';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback 
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

  return (
    <>
      <TouchableOpacity onPress={() => setShowPaywall(true)}>
        <View style={styles.lockedFeature}>
          <Icon name="lock" size={24} color="#666" />
          <Text style={styles.lockedText}>Premium Feature</Text>
        </View>
      </TouchableOpacity>
      
      <Modal visible={showPaywall} animationType="slide">
        <Paywall onClose={() => setShowPaywall(false)} />
      </Modal>
    </>
  );
};
```

#### 5. Webhook Integration for Server-Side Validation

```typescript
// server/webhooks/revenueCat.ts
import { Request, Response } from 'express';
import crypto from 'crypto';

export const handleRevenueCatWebhook = async (req: Request, res: Response) => {
  // Verify webhook signature
  const signature = req.headers['x-revenuecat-signature'];
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.REVENUECAT_WEBHOOK_SECRET!)
    .update(body)
    .digest('base64');

  if (signature !== expectedSignature) {
    return res.status(401).send('Unauthorized');
  }

  const { event } = req.body;

  switch (event.type) {
    case 'initial_purchase':
      await handleInitialPurchase(event);
      break;
    
    case 'renewal':
      await handleRenewal(event);
      break;
    
    case 'cancellation':
      await handleCancellation(event);
      break;
    
    case 'uncancellation':
      await handleUncancellation(event);
      break;
    
    case 'non_renewing_purchase':
      await handleNonRenewingPurchase(event);
      break;
    
    case 'expiration':
      await handleExpiration(event);
      break;
  }

  res.status(200).send('OK');
};

async function handleInitialPurchase(event: any) {
  // Update user's subscription status in database
  const { app_user_id, product_id, purchase_date } = event;
  
  await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: app_user_id,
      product_id,
      status: 'active',
      started_at: purchase_date,
      updated_at: new Date().toISOString(),
    });
}
```

### RevenueCat Dashboard Setup

1. **Products Configuration**
   - Create subscription products in App Store Connect and Google Play Console
   - Add products to RevenueCat dashboard
   - Configure entitlements (premium, pro)

2. **Offerings Setup**
   - Create offerings for different user segments
   - Set up A/B tests for pricing
   - Configure introductory offers

3. **Analytics Integration**
   - Connect RevenueCat to analytics platforms
   - Set up conversion tracking
   - Monitor key metrics (MRR, churn, LTV)

4. **Experiment Framework**
   ```typescript
   // src/hooks/usePaywallExperiment.ts
   import { useEffect, useState } from 'react';
   import Purchases from 'react-native-purchases';

   export const usePaywallExperiment = () => {
     const [variant, setVariant] = useState<'A' | 'B'>('A');

     useEffect(() => {
       const checkExperiment = async () => {
         const offerings = await Purchases.getOfferings();
         // RevenueCat will automatically assign users to experiments
         const current = offerings.current;
         
         if (current?.metadata?.experiment === 'priceTestB') {
           setVariant('B');
         }
       };

       checkExperiment();
     }, []);

     return variant;
   };
   ```

## Revenue Projections

### Conservative Estimate (10K MAU)
- **Subscriptions**: 3% conversion × 10,000 × $4.99 = $1,497/month
- **Advertising**: Minimal banner ads = ~$300/month
- **Affiliate Revenue**: ~$500/month
- **Total**: ~$2,297/month

### Moderate Growth (50K MAU)
- **Subscriptions**: 5% conversion × 50,000 × $4.99 = $12,475/month
- **Advertising**: Scaled banner ads = ~$2,000/month
- **Affiliate Revenue**: ~$3,000/month
- **Data Insights**: ~$2,000/month
- **Total**: ~$19,475/month

### Strong Growth (200K MAU)
- **Subscriptions**: 8% conversion × 200,000 × $4.99 = $79,840/month
- **Advertising**: Premium banner placements = ~$12,000/month
- **Affiliate Revenue**: ~$15,000/month
- **Data Insights**: ~$10,000/month
- **Total**: ~$116,840/month

## Monitoring & Optimization

### Key Metrics to Track

1. **Review Generation (Primary KPI)**
   - Reviews posted per user per month
   - Review posting frequency trends
   - Review completion rates
   - Time spent writing reviews

2. **Subscription Metrics**
   - Monthly Recurring Revenue (MRR)
   - Churn rate (keep low to maintain review volume)
   - Customer Lifetime Value (LTV)
   - Free-to-paid conversion rate

3. **User Engagement**
   - Daily/Monthly Active Users
   - Session length
   - Reviews per user (primary metric)
   - Chat engagement
   - User retention rates

4. **Ad Performance (Minimal Tracking)**
   - Ad revenue per user (ARPU)
   - User retention after ad exposure
   - Ad dismissal rates
   - Impact on review posting behavior

### A/B Testing Framework

```typescript
// src/services/experimentService.ts
import { Analytics } from '@segment/analytics-react-native';

interface Experiment {
  name: string;
  variants: string[];
  traffic_allocation: number[];
}

class ExperimentService {
  private experiments: Map<string, string> = new Map();
  
  async getVariant(experimentName: string): Promise<string> {
    // Check if user already has a variant
    const cached = this.experiments.get(experimentName);
    if (cached) return cached;
    
    // Otherwise, assign variant based on user ID
    const userId = await getUserId();
    const hash = this.hashCode(userId + experimentName);
    const variant = this.selectVariant(experimentName, hash);
    
    // Cache and track
    this.experiments.set(experimentName, variant);
    Analytics.track('Experiment Viewed', {
      experiment_name: experimentName,
      variant,
    });
    
    return variant;
  }
  
  private selectVariant(experimentName: string, hash: number): string {
    // Implementation for variant selection based on hash
    const experiments = {
      'paywall_layout': ['control', 'variant_a', 'variant_b'],
      'pricing_test': ['$9.99', '$12.99', '$14.99'],
      'ad_frequency': ['low', 'medium', 'high'],
    };
    
    const variants = experiments[experimentName] || ['control'];
    const index = Math.abs(hash) % variants.length;
    return variants[index];
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

export const experimentService = new ExperimentService();
```

### Optimization Strategies

1. **Review Generation Optimization (Primary Focus)**
   - Remove any friction from review posting
   - Never interrupt or delay review creation
   - Celebrate review milestones
   - Make review sharing easy and rewarding
   - Optimize review creation UX continuously

2. **Subscription Optimization**
   - Test pricing ($3.99 vs $4.99 vs $5.99)
   - Optimize paywall timing (never during review flow)
   - Focus on value of ad-free experience
   - Highlight advanced search benefits

3. **Non-Intrusive Ad Strategy**
   - Minimize ad frequency
   - Test ad placement impact on review posting
   - Ensure easy dismissal options
   - Monitor user satisfaction scores

4. **Affiliate Revenue Growth**
   - Develop affiliate relationships with dating services
   - Build referral tracking systems
   - Optimize commission structures

## Conclusion

This monetization strategy prioritizes user experience and content creation above revenue optimization. By keeping the core review posting functionality completely free and unlimited, we encourage maximum user engagement and content generation, which is the foundation of the app's value.

The non-intrusive approach to monetization focuses on:
- **Simple premium tier** with clear value (ad-free, advanced features)
- **Minimal advertising** that never interrupts core functionality
- **Partnership revenue** that adds value rather than extracting it
- **User-first design** that prioritizes review creation over monetization

This approach builds a sustainable business model that grows with user engagement rather than fighting against it. The key to success will be maintaining the balance between revenue generation and user satisfaction, always erring on the side of user experience when conflicts arise.