import { canUseAdMob } from "../utils/buildEnvironment";
import { ADMOB_CONFIG, getAdUnitId } from "../config/admobConfig";
import { subscriptionService } from "./subscriptionService";
import supabase from "../config/supabase";
import { gdprConsentService } from "./gdprConsentService";

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
  private initializationAttempts = 0;
  private readonly MAX_INITIALIZATION_ATTEMPTS = 3;
  private readonly INITIALIZATION_DELAY = 1000; // 1 second base delay

  // Enhanced error classification for Expo SDK 54 compatibility
  private isExpoSDK54CompatibilityError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || "";
    return (
      errorMessage.includes("expo sdk 54") ||
      errorMessage.includes("module not found") ||
      errorMessage.includes("native module") ||
      errorMessage.includes("admob") ||
      errorMessage.includes("google-mobile-ads") ||
      errorMessage.includes("react-native-google-mobile-ads")
    );
  }

  // Exponential backoff delay calculation
  private getRetryDelay(attempt: number): number {
    return this.INITIALIZATION_DELAY * Math.pow(2, attempt);
  }

  async initialize() {
    if (this.initialized) return;

    if (!canUseAdMob()) {
      this.initializeMockAds();
      this.initialized = true;
      return;
    }

    // Initialize GDPR consent service first
    try {
      await gdprConsentService.initialize();
    } catch (error) {}

    // Enhanced initialization with retry logic and SDK 54 compatibility fixes
    while (this.initializationAttempts < this.MAX_INITIALIZATION_ATTEMPTS) {
      try {
        this.initializationAttempts++;

        // Add delay for retry attempts (except first attempt)
        if (this.initializationAttempts > 1) {
          const delay = this.getRetryDelay(this.initializationAttempts - 2);
          console.log(`AdMob: retrying initialization after ${delay}ms delay`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Dynamic import with enhanced error handling for Expo SDK 54
        const mobileAds = (await import("react-native-google-mobile-ads")).default;
        const { MaxAdContentRating } = await import("react-native-google-mobile-ads");

        // SDK 54 compatibility: Add initialization delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        await mobileAds().initialize();

        // Additional delay after initialization for SDK 54 stability
        await new Promise((resolve) => setTimeout(resolve, 300));

        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: ADMOB_CONFIG.SETTINGS.tagForChildDirectedTreatment,
          tagForUnderAgeOfConsent: ADMOB_CONFIG.SETTINGS.tagForUnderAgeOfConsent,
          testDeviceIdentifiers: ADMOB_CONFIG.SETTINGS.testDeviceIdentifiers,
        });

        await this.initializeInterstitialAd();
        await this.initializeAppOpenAd();
        this.initialized = true;
        return;
      } catch (error) {
        console.error(`AdMob: Initialization attempt ${this.initializationAttempts} failed:`, error);

        // Check if this is a known Expo SDK 54 compatibility issue
        if (this.isExpoSDK54CompatibilityError(error)) {
          // Apply SDK 54 specific workarounds
          try {
            // Workaround: Try alternative import strategy with extended delays
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Extended delay for SDK 54

            const mobileAds = (await import("react-native-google-mobile-ads")).default;
            await mobileAds().initialize();

            await this.initializeInterstitialAd();
            await this.initializeAppOpenAd();
            this.initialized = true;
            return;
          } catch (workaroundError) {
            console.error("AdMob: SDK 54 workaround failed:", workaroundError);
          }
        }

        // If this is the last attempt, fall back to mock implementation
        if (this.initializationAttempts >= this.MAX_INITIALIZATION_ATTEMPTS) {
          this.initializeMockAds();
          this.initialized = true;
          return;
        }
      }
    }
  }

  private initializeMockAds() {
    // Enhanced mock interstitial ad for Expo Go with better simulation
    this.mockInterstitialAd = {
      loaded: false,
      load: () => {
        // Simulate realistic loading time
        setTimeout(
          () => {
            this.mockInterstitialAd!.loaded = true;
          },
          Math.random() * 2000 + 500,
        ); // 500-2500ms loading time
      },
      show: () => {
        // Simulate ad display and reset loaded state
        this.mockInterstitialAd!.loaded = false;
        // Auto-reload after showing
        setTimeout(() => this.mockInterstitialAd!.load(), 1000);
      },
      addAdEventListener: (event: string, callback: (data?: any) => void) => {
        // Simulate various ad events with realistic timing
        if (event === "loaded") {
          setTimeout(() => callback(), Math.random() * 2000 + 500);
        } else if (event === "closed") {
          setTimeout(() => callback(), 100);
        } else if (event === "error") {
          // Occasionally simulate errors for testing
          if (Math.random() < 0.1) {
            setTimeout(() => callback({ message: "Mock ad error for testing" }), 1000);
          }
        }
      },
    };

    // Start initial load
    this.mockInterstitialAd.load();
  }

  private async initializeInterstitialAd() {
    if (!canUseAdMob()) return;

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const { InterstitialAd, AdEventType } = await import("react-native-google-mobile-ads");

        const adUnitId = this.getInterstitialAdUnitId();

        if (!adUnitId) {
          return;
        }

        // Add delay for SDK 54 compatibility
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }

        this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

        this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {});

        this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
          // Retry loading after error
          setTimeout(() => {
            if (this.interstitialAd) {
              this.interstitialAd.load();
            }
          }, 5000);
        });

        this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
          // Preload next ad with delay
          setTimeout(() => {
            if (this.interstitialAd) {
              this.interstitialAd.load();
            }
          }, 1000);
        });

        this.interstitialAd.load();
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error("AdMob: initializeInterstitialAd error:", error);

        if (retryCount > maxRetries) {
          console.error("All interstitial ad initialization attempts failed");
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount));
      }
    }
  }

  private async initializeAppOpenAd() {
    if (!canUseAdMob()) return;

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const { AppOpenAd, AdEventType } = await import("react-native-google-mobile-ads");

        const adUnitId = this.getAppOpenAdUnitId();

        if (!adUnitId) {
          return;
        }

        // Add delay for SDK 54 compatibility
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }

        this.appOpenAd = AppOpenAd.createForAdRequest(adUnitId);

        this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {});

        this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
          // Retry loading after error
          setTimeout(() => {
            if (this.appOpenAd) {
              this.appOpenAd.load();
            }
          }, 5000);
        });

        this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
          // Preload next ad with delay
          setTimeout(() => {
            if (this.appOpenAd) {
              this.appOpenAd.load();
            }
          }, 1000);
        });

        this.appOpenAd.load();
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error("AdMob: initializeAppOpenAd error:", error);

        if (retryCount > maxRetries) {
          console.error("All App Open ad initialization attempts failed");
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount));
      }
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    // Check if user has premium subscription (no ads)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const shouldShowAds = await subscriptionService.shouldShowAds(user.id);
        if (!shouldShowAds) {
          return false;
        }
      }
    } catch (error) {}

    if (!canUseAdMob()) {
      // Enhanced mock implementation for Expo Go
      if (this.mockInterstitialAd) {
        this.mockInterstitialAd.show();
      }
      return true;
    }

    const ad = this.interstitialAd || this.mockInterstitialAd;
    if (!ad) {
      // Try to reinitialize
      await this.initializeInterstitialAd();
      return false;
    }

    try {
      if (ad.loaded) {
        ad.show();
        if (this.interstitialAd) {
          // Reload for next time with delay for SDK 54 compatibility
          setTimeout(() => {
            if (this.interstitialAd) {
              this.interstitialAd.load();
            }
          }, 1000);
        }
        return true;
      } else {
        // Try to load the ad if it's not ready
        if (this.interstitialAd) {
          this.interstitialAd.load();
        }
        return false;
      }
    } catch (error) {
      // Try to reinitialize on error
      setTimeout(() => {
        this.initializeInterstitialAd();
      }, 2000);
      return false;
    }
  }

  getBannerAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return "mock-banner-unit-id"; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId("BANNER") || "ca-app-pub-3940256099942544/6300978111";
    } catch (error) {
      return "ca-app-pub-3940256099942544/6300978111";
    }
  }

  getInterstitialAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return "mock-interstitial-unit-id"; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId("INTERSTITIAL") || "ca-app-pub-3940256099942544/1033173712";
    } catch (error) {
      return "ca-app-pub-3940256099942544/1033173712";
    }
  }

  getAppOpenAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return "mock-app-open-unit-id"; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId("APP_OPEN") || "ca-app-pub-3940256099942544/5662855259";
    } catch (error) {
      return "ca-app-pub-3940256099942544/5662855259";
    }
  }

  /**
   * Check if interstitial ad should be shown based on placement rules
   */
  shouldShowInterstitialAd(placement: "postCreation" | "appLaunch" | "navigation" | "chatExit"): boolean {
    if (!canUseAdMob()) return false;

    const placementConfig = ADMOB_CONFIG.PLACEMENTS.INTERSTITIAL[placement];
    if (!placementConfig.enabled) return false;

    switch (placement) {
      case "postCreation":
        this.postCreationCount++;
        return this.postCreationCount % placementConfig.frequency === 0;

      case "chatExit":
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
    // Check if user has premium subscription (no ads)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const shouldShowAds = await subscriptionService.shouldShowAds(user.id);
        if (!shouldShowAds) {
          return false;
        }
      }
    } catch (error) {}

    if (!canUseAdMob()) {
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
      return false;
    }

    if (!this.appOpenAd?.loaded) {
      return false;
    }

    try {
      this.appOpenAd.show();
      this.lastAppOpenAdTime = now;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Show interstitial ad for specific placement
   */
  async showInterstitialAdForPlacement(placement: "postCreation" | "chatExit"): Promise<boolean> {
    if (!this.shouldShowInterstitialAd(placement)) {
      return false;
    }

    return this.showInterstitialAd();
  }
}

export const adMobService = new AdMobService();
