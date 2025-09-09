import { Platform } from 'react-native';
import { canUseAdMob, buildEnv } from '../utils/buildEnvironment';
import { ADMOB_CONFIG, getAdUnitId } from '../config/admobConfig';

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
  private appOpenAd: any = null;
  private mockInterstitialAd: MockInterstitialAd | null = null;
  private lastAppOpenAdTime = 0;
  private postCreationCount = 0;
  private chatExitCount = 0;

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
        tagForChildDirectedTreatment: ADMOB_CONFIG.SETTINGS.tagForChildDirectedTreatment,
        tagForUnderAgeOfConsent: ADMOB_CONFIG.SETTINGS.tagForUnderAgeOfConsent,
        testDeviceIdentifiers: ADMOB_CONFIG.SETTINGS.testDeviceIdentifiers,
      });

      await this.initializeInterstitialAd();
      await this.initializeAppOpenAd();
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
      const { InterstitialAd, AdEventType } = await import('react-native-google-mobile-ads');

      const adUnitId = this.getInterstitialAdUnitId();

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

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Interstitial ad closed');
        // Preload next ad
        this.interstitialAd.load();
      });

      this.interstitialAd.load();
    } catch (error) {
      console.error('Failed to initialize interstitial ad:', error);
    }
  }

  private async initializeAppOpenAd() {
    if (!canUseAdMob()) return;

    try {
      const { AppOpenAd, AdEventType } = await import('react-native-google-mobile-ads');

      const adUnitId = this.getAppOpenAdUnitId();

      if (!adUnitId) {
        console.warn('App Open ad unit ID not configured');
        return;
      }

      this.appOpenAd = AppOpenAd.createForAdRequest(adUnitId);

      this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('App Open ad loaded');
      });

      this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('App Open ad error:', error);
      });

      this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('App Open ad closed');
        // Preload next ad
        this.appOpenAd.load();
      });

      this.appOpenAd.load();
    } catch (error) {
      console.error('Failed to initialize App Open ad:', error);
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
      return getAdUnitId('BANNER');
    } catch {
      return 'mock-banner-unit-id';
    }
  }

  getInterstitialAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return 'mock-interstitial-unit-id'; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId('INTERSTITIAL');
    } catch {
      return 'mock-interstitial-unit-id';
    }
  }

  getAppOpenAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return 'mock-app-open-unit-id'; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId('APP_OPEN');
    } catch {
      return 'mock-app-open-unit-id';
    }
  }

  /**
   * Check if interstitial ad should be shown based on placement rules
   */
  shouldShowInterstitialAd(placement: 'postCreation' | 'appLaunch' | 'navigation' | 'chatExit'): boolean {
    if (!canUseAdMob()) return false;

    const placementConfig = ADMOB_CONFIG.PLACEMENTS.INTERSTITIAL[placement];
    if (!placementConfig.enabled) return false;

    switch (placement) {
      case 'postCreation':
        this.postCreationCount++;
        return this.postCreationCount % placementConfig.frequency === 0;

      case 'chatExit':
        this.chatExitCount++;
        return this.chatExitCount % placementConfig.frequency === 0;

      default:
        return true;
    }
  }

  /**
   * Show App Open ad if conditions are met
   */
  async showAppOpenAd(): Promise<boolean> {
    if (!canUseAdMob()) {
      console.log('Mock: Showing App Open ad');
      return true;
    }

    const appOpenConfig = ADMOB_CONFIG.PLACEMENTS.APP_OPEN;
    if (!appOpenConfig.enabled) {
      return false;
    }

    // Check cooldown period
    const now = Date.now();
    const cooldownMs = appOpenConfig.cooldownMinutes * 60 * 1000;
    if (now - this.lastAppOpenAdTime < cooldownMs) {
      console.log('App Open ad on cooldown');
      return false;
    }

    if (!this.appOpenAd?.loaded) {
      console.log('App Open ad not ready');
      return false;
    }

    try {
      this.appOpenAd.show();
      this.lastAppOpenAdTime = now;
      return true;
    } catch (error) {
      console.error('Failed to show App Open ad:', error);
      return false;
    }
  }

  /**
   * Show interstitial ad for specific placement
   */
  async showInterstitialAdForPlacement(placement: 'postCreation' | 'chatExit'): Promise<boolean> {
    if (!this.shouldShowInterstitialAd(placement)) {
      return false;
    }

    return this.showInterstitialAd();
  }
}

export const adMobService = new AdMobService();
