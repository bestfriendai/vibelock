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
