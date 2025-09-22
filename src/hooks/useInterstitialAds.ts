import { useCallback, useState, useRef } from "react";
import { adMobService } from "../services/adMobService";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseAdMob } from "../utils/buildEnvironment";

/**
 * Enhanced hook for managing interstitial ads with SDK 54 compatibility
 *
 * Usage:
 * const { showAdAfterPostCreation, showAdAfterChatExit, adMetrics } = useInterstitialAds();
 *
 * // After user creates a post
 * await showAdAfterPostCreation();
 *
 * // After user exits a chat
 * await showAdAfterChatExit();
 */
export const useInterstitialAds = () => {
  const { isPremium } = useSubscriptionStore();
  const [adMetrics, setAdMetrics] = useState({
    totalAttempts: 0,
    successfulShows: 0,
    failures: 0,
    lastError: null as string | null,
  });
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Enhanced error classification for SDK 54 compatibility
  const isSDK54CompatibilityError = (error: any): boolean => {
    const errorMessage = error?.message?.toLowerCase() || "";
    return (
      errorMessage.includes("expo sdk 54") ||
      errorMessage.includes("module not found") ||
      errorMessage.includes("native module") ||
      errorMessage.includes("admob") ||
      errorMessage.includes("google-mobile-ads")
    );
  };

  // Enhanced ad show function with retry logic
  const showAdWithRetry = async (
    placement: "postCreation" | "chatExit" | "general",
    maxRetries: number = 2,
  ): Promise<boolean> => {
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        setAdMetrics((prev) => ({ ...prev, totalAttempts: prev.totalAttempts + 1 }));

        let result: boolean;
        if (placement === "general") {
          result = await adMobService.showInterstitialAd();
        } else {
          result = await adMobService.showInterstitialAdForPlacement(placement);
        }

        if (result) {
          setAdMetrics((prev) => ({
            ...prev,
            successfulShows: prev.successfulShows + 1,
            lastError: null,
          }));
          return true;
        }

        attempts++;
        if (attempts <= maxRetries) {
          console.log(`[useInterstitialAds] Retrying ad show, attempt ${attempts}`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[useInterstitialAds] Error showing ad for placement: ${placement}`, error);

        setAdMetrics((prev) => ({
          ...prev,
          failures: prev.failures + 1,
          lastError: errorMessage,
        }));

        // Apply SDK 54 specific workarounds
        if (isSDK54CompatibilityError(error) && attempts <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
        } else if (attempts <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    return false;
  };

  const showAdAfterPostCreation = useCallback(async (): Promise<boolean> => {
    if (!canUseAdMob() || isPremium) {
      return false;
    }

    return await showAdWithRetry("postCreation");
  }, [isPremium, showAdWithRetry]);

  const showAdAfterChatExit = useCallback(async (): Promise<boolean> => {
    if (!canUseAdMob() || isPremium) {
      return false;
    }

    return await showAdWithRetry("chatExit");
  }, [isPremium, showAdWithRetry]);

  const showGeneralInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (!canUseAdMob() || isPremium) {
      return false;
    }

    return await showAdWithRetry("general");
  }, [isPremium, showAdWithRetry]);

  // Cleanup function for timeouts
  const cleanup = useCallback(() => {
    retryTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    retryTimeouts.current.clear();
  }, []);

  return {
    showAdAfterPostCreation,
    showAdAfterChatExit,
    showGeneralInterstitialAd,
    canShowAds: canUseAdMob() && !isPremium,
    adMetrics,
    cleanup,
  };
};

export default useInterstitialAds;
