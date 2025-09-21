import { canUseAdMob } from "../utils/buildEnvironment";
import { ADMOB_CONFIG, getAdUnitId } from "../config/admobConfig";
import { subscriptionService } from "./subscriptionService";
import { supabase } from "../config/supabase";
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
      console.log("AdMob not available in Expo Go - using mock implementation");
      this.initializeMockAds();
      this.initialized = true;
      return;
    }

    // Initialize GDPR consent service first
    try {
      await gdprConsentService.initialize();
      console.log("GDPR consent service initialized");
    } catch (error) {
      console.warn("GDPR consent service initialization failed:", error);
    }

    // Enhanced initialization with retry logic and SDK 54 compatibility fixes
    while (this.initializationAttempts < this.MAX_INITIALIZATION_ATTEMPTS) {
      try {
        this.initializationAttempts++;

        // Add delay for retry attempts (except first attempt)
        if (this.initializationAttempts > 1) {
          const delay = this.getRetryDelay(this.initializationAttempts - 2);
          console.log(
            `AdMob: Retrying initialization (attempt ${this.initializationAttempts}/${this.MAX_INITIALIZATION_ATTEMPTS}) after ${delay}ms delay`,
          );
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
        console.log(`AdMob: Initialized successfully on attempt ${this.initializationAttempts}`);
        return;
      } catch (error) {
        console.error(`AdMob: Initialization attempt ${this.initializationAttempts} failed:`, error);

        // Check if this is a known Expo SDK 54 compatibility issue
        if (this.isExpoSDK54CompatibilityError(error)) {
          console.warn("AdMob: Detected Expo SDK 54 compatibility issue, applying workarounds...");

          // Apply SDK 54 specific workarounds
          try {
            // Workaround: Try alternative import strategy with extended delays
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Extended delay for SDK 54

            const mobileAds = (await import("react-native-google-mobile-ads")).default;
            await mobileAds().initialize();

            await this.initializeInterstitialAd();
            await this.initializeAppOpenAd();
            this.initialized = true;
            console.log("AdMob: SDK 54 workaround successful");
            return;
          } catch (workaroundError) {
            console.error("AdMob: SDK 54 workaround failed:", workaroundError);
          }
        }

        // If this is the last attempt, fall back to mock implementation
        if (this.initializationAttempts >= this.MAX_INITIALIZATION_ATTEMPTS) {
          console.warn("AdMob: All initialization attempts failed, falling back to mock implementation");
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
        console.log("Mock: Loading interstitial ad");
        // Simulate realistic loading time
        setTimeout(
          () => {
            this.mockInterstitialAd!.loaded = true;
            console.log("Mock: Interstitial ad loaded successfully");
          },
          Math.random() * 2000 + 500,
        ); // 500-2500ms loading time
      },
      show: () => {
        console.log("Mock: Showing interstitial ad");
        // Simulate ad display and reset loaded state
        this.mockInterstitialAd!.loaded = false;
        // Auto-reload after showing
        setTimeout(() => this.mockInterstitialAd!.load(), 1000);
      },
      addAdEventListener: (event: string, callback: (data?: any) => void) => {
        console.log(`Mock: Added listener for ${event}`);
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
          console.warn("Interstitial ad unit ID not configured");
          return;
        }

        // Add delay for SDK 54 compatibility
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }

        this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

        this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
          console.log("Interstitial ad loaded successfully");
        });

        this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
          console.warn("Interstitial ad error:", error);
          // Retry loading after error
          setTimeout(() => {
            if (this.interstitialAd) {
              this.interstitialAd.load();
            }
          }, 5000);
        });

        this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
          console.log("Interstitial ad closed");
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
        console.warn(`Failed to initialize interstitial ad (attempt ${retryCount}/${maxRetries + 1}):`, error);

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
          console.warn("App Open ad unit ID not configured");
          return;
        }

        // Add delay for SDK 54 compatibility
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
        }

        this.appOpenAd = AppOpenAd.createForAdRequest(adUnitId);

        this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
          console.log("App Open ad loaded successfully");
        });

        this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
          console.warn("App Open ad error:", error);
          // Retry loading after error
          setTimeout(() => {
            if (this.appOpenAd) {
              this.appOpenAd.load();
            }
          }, 5000);
        });

        this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
          console.log("App Open ad closed");
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
        console.warn(`Failed to initialize App Open ad (attempt ${retryCount}/${maxRetries + 1}):`, error);

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
          console.log("AdMob: User has premium subscription, skipping interstitial ad");
          return false;
        }
      }
    } catch (error) {
      console.warn("AdMob: Failed to check subscription status, showing ad:", error);
    }

    if (!canUseAdMob()) {
      // Enhanced mock implementation for Expo Go
      console.log("Mock: Showing interstitial ad");
      if (this.mockInterstitialAd) {
        this.mockInterstitialAd.show();
      }
      return true;
    }

    const ad = this.interstitialAd || this.mockInterstitialAd;
    if (!ad) {
      console.warn("Interstitial ad not initialized");
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
        console.log("Interstitial ad not ready, attempting to load");
        // Try to load the ad if it's not ready
        if (this.interstitialAd) {
          this.interstitialAd.load();
        }
        return false;
      }
    } catch (error) {
      console.warn("Failed to show interstitial ad:", error);
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
    } catch {
      return "ca-app-pub-3940256099942544/6300978111";
    }
  }

  getInterstitialAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return "mock-interstitial-unit-id"; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId("INTERSTITIAL") || "ca-app-pub-3940256099942544/1033173712";
    } catch {
      return "ca-app-pub-3940256099942544/1033173712";
    }
  }

  getAppOpenAdUnitId(): string | undefined {
    if (!canUseAdMob()) {
      return "mock-app-open-unit-id"; // Mock ID for Expo Go
    }

    try {
      return getAdUnitId("APP_OPEN") || "ca-app-pub-3940256099942544/5662855259";
    } catch {
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
          console.log("AdMob: User has premium subscription, skipping app open ad");
          return false;
        }
      }
    } catch (error) {
      console.warn("AdMob: Failed to check subscription status, showing ad:", error);
    }

    if (!canUseAdMob()) {
      console.log("Mock: Showing App Open ad");
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
      console.log("App Open ad on cooldown");
      return false;
    }

    if (!this.appOpenAd?.loaded) {
      console.log("App Open ad not ready");
      return false;
    }

    try {
      this.appOpenAd.show();
      this.lastAppOpenAdTime = now;
      return true;
    } catch (error) {
      console.warn("Failed to show App Open ad:", error);
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
