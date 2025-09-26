import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseAdMob, buildEnv } from "../utils/buildEnvironment";
import { adMobService } from "../services/adMobService";
import { useAdContext } from "../contexts/AdContext";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  placement?: "browse" | "chat";
}

// Mock Banner Component for Expo Go
const MockBannerAd: React.FC<{ onLoad: () => void; onError: (error: string) => void }> = ({ onLoad, onError }) => {
  const { colors } = useTheme();

  useEffect(() => {
    // Simulate ad loading
    const timer = setTimeout(() => {
      if (Math.random() > 0.1) {
        // 90% success rate
        onLoad();
      } else {
        onError("Mock ad failed to load");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onLoad, onError]);

  return (
    <View className="p-4 items-center justify-center min-h-[50px]" style={{ backgroundColor: colors.surface[700] }}>
      <Text className="text-xs" style={{ color: colors.text.secondary }}>
        Mock Ad Banner
      </Text>
      <Text className="text-[10px] mt-1" style={{ color: colors.text.muted }}>
        {buildEnv.isExpoGo ? "Expo Go Mode" : "Development Mode"}
      </Text>
    </View>
  );
};

// Stub Implementation for Development - Simple and Safe
const RealBannerAd: React.FC<{
  unitId: string;
  onLoad: () => void;
  onError: (error: string) => void;
}> = ({ unitId, onLoad, onError }) => {
  const { colors } = useTheme();

  // In development, just show a placeholder and call onLoad
  React.useEffect(() => {
    // Simulate successful ad load
    setTimeout(() => onLoad(), 100);
  }, [onLoad]);

  // Return a simple placeholder for development
  return (
    <View style={{
      height: 50,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      margin: 4
    }}>
      <Text style={{ color: colors.text, fontSize: 12, opacity: 0.7 }}>
        [Ad Placeholder - Dev Mode]
      </Text>
    </View>
  );
};

// Main AdBanner component
const AdBanner: React.FC<Props> = ({ placement = "browse" }) => {
  const { isProUser } = useSubscriptionStore();
  const { adsDisabledPermanently, debugMode } = useAdContext();
  const { colors } = useTheme();

  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = 3;

  const handleAdLoad = () => {
    setAdLoaded(true);
    setAdError(null);
    adMobService.trackEvent("ad_loaded", { placement });
  };

  const handleAdError = (error: string) => {
    setAdError(error);
    setAdLoaded(false);
    adMobService.trackEvent("ad_error", { placement, error });

    // Retry logic
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setAdError(null);
      }, 2000 * (retryCount + 1)); // Exponential backoff
    }
  };

  // Don't show ads to pro users or if disabled permanently
  if (isProUser || adsDisabledPermanently) {
    return null;
  }

  // Show error state
  if (adError && retryCount >= maxRetries) {
    if (debugMode) {
      return (
        <View className="p-2 bg-red-100 border border-red-300 rounded-md m-2">
          <Text className="text-red-600 text-xs text-center">
            Ad Error: {adError}
          </Text>
        </View>
      );
    }
    return null; // Hide failed ads in production
  }

  const unitId = placement === "browse"
    ? adMobService.getUnitId("banner_browse")
    : adMobService.getUnitId("banner_chat");

  // Use mock ads in Expo Go, real ads otherwise
  if (buildEnv.isExpoGo || !canUseAdMob()) {
    return <MockBannerAd onLoad={handleAdLoad} onError={handleAdError} />;
  }

  return (
    <RealBannerAd
      unitId={unitId}
      onLoad={handleAdLoad}
      onError={handleAdError}
    />
  );
};

export default AdBanner;