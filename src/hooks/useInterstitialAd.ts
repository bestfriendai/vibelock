import { useEffect, useRef } from "react";
import { adMobService } from "../services/adMobService";
import useSubscriptionStore from "../state/subscriptionStore";

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
    const shouldShowAd = actionCountRef.current >= frequency && timeSinceLastAd >= minTimeBetweenAds;

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
