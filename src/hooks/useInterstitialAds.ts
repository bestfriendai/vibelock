import { useCallback } from 'react';
import { adMobService } from '../services/adMobService';
import useSubscriptionStore from '../state/subscriptionStore';
import { canUseAdMob } from '../utils/buildEnvironment';

/**
 * Hook for managing interstitial ads in your app
 * 
 * Usage:
 * const { showAdAfterPostCreation, showAdAfterChatExit } = useInterstitialAds();
 * 
 * // After user creates a post
 * await showAdAfterPostCreation();
 * 
 * // After user exits a chat
 * await showAdAfterChatExit();
 */
export const useInterstitialAds = () => {
  const { isPremium } = useSubscriptionStore();

  const showAdAfterPostCreation = useCallback(async (): Promise<boolean> => {
    if (!canUseAdMob() || isPremium) {
      return false; // Don't show ads to premium users or in Expo Go
    }

    try {
      console.log('Attempting to show interstitial ad after post creation');
      return await adMobService.showInterstitialAdForPlacement('postCreation');
    } catch (error) {
      console.error('Failed to show post creation interstitial ad:', error);
      return false;
    }
  }, [isPremium]);

  const showAdAfterChatExit = useCallback(async (): Promise<boolean> => {
    if (!canUseAdMob() || isPremium) {
      return false; // Don't show ads to premium users or in Expo Go
    }

    try {
      console.log('Attempting to show interstitial ad after chat exit');
      return await adMobService.showInterstitialAdForPlacement('chatExit');
    } catch (error) {
      console.error('Failed to show chat exit interstitial ad:', error);
      return false;
    }
  }, [isPremium]);

  const showGeneralInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (!canUseAdMob() || isPremium) {
      return false; // Don't show ads to premium users or in Expo Go
    }

    try {
      console.log('Attempting to show general interstitial ad');
      return await adMobService.showInterstitialAd();
    } catch (error) {
      console.error('Failed to show general interstitial ad:', error);
      return false;
    }
  }, [isPremium]);

  return {
    showAdAfterPostCreation,
    showAdAfterChatExit,
    showGeneralInterstitialAd,
    canShowAds: canUseAdMob() && !isPremium,
  };
};

export default useInterstitialAds;
