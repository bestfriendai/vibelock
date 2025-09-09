import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { adMobService } from "../services/adMobService";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseAdMob } from "../utils/buildEnvironment";

/**
 * AppOpenAdHandler - Manages App Open ads based on app state changes
 *
 * This component should be placed at the root level of your app to handle
 * app open ads when the user returns to the app from background.
 */
const AppOpenAdHandler: React.FC = () => {
  const { isPremium } = useSubscriptionStore();
  const appState = useRef(AppState.currentState);
  const lastBackgroundTime = useRef<number>(0);

  useEffect(() => {
    if (!canUseAdMob() || isPremium) {
      return; // Don't set up app state listener for premium users or in Expo Go
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      // App is coming to foreground from background
      if (previousState === "background" && nextAppState === "active") {
        const now = Date.now();
        const backgroundDuration = now - lastBackgroundTime.current;

        // Only show app open ad if app was in background for more than 30 seconds
        // This prevents ads from showing on quick app switches
        if (backgroundDuration > 30000) {
          console.log("App returned from background, attempting to show App Open ad");
          try {
            await adMobService.showAppOpenAd();
          } catch (error) {
            console.error("Failed to show App Open ad:", error);
          }
        }
      }

      // Track when app goes to background
      if (nextAppState === "background") {
        lastBackgroundTime.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isPremium]);

  // This component doesn't render anything
  return null;
};

export default AppOpenAdHandler;
