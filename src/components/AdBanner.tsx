import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseAdMob, buildEnv } from "../utils/buildEnvironment";
import { adMobService } from "../services/adMobService";

interface Props {
  placement: "browse" | "chat";
}

// Mock Banner Component for Expo Go
const MockBannerAd: React.FC<{ onLoad: () => void; onError: (error: string) => void }> = ({
  onLoad,
  onError
}) => {
  useEffect(() => {
    // Simulate ad loading
    const timer = setTimeout(() => {
      if (Math.random() > 0.1) { // 90% success rate
        onLoad();
      } else {
        onError('Mock ad failed to load');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [onLoad, onError]);

  return (
    <View className="bg-surface-700 p-4 items-center justify-center min-h-[50px]">
      <Text className="text-text-secondary text-xs">Mock Ad Banner</Text>
      <Text className="text-text-muted text-[10px] mt-1">
        {buildEnv.isExpoGo ? 'Expo Go Mode' : 'Development Mode'}
      </Text>
    </View>
  );
};

// Real Banner Component for Development Builds
const RealBannerAd: React.FC<{
  unitId: string;
  onLoad: () => void;
  onError: (error: string) => void
}> = ({ unitId, onLoad, onError }) => {
  const [BannerAd, setBannerAd] = useState<any>(null);
  const [BannerAdSize, setBannerAdSize] = useState<any>(null);

  useEffect(() => {
    const loadAdComponents = async () => {
      try {
        const adModule = await import('react-native-google-mobile-ads');
        setBannerAd(adModule.BannerAd);
        setBannerAdSize(adModule.BannerAdSize);
      } catch (error) {
        console.error('Failed to load AdMob components:', error);
        onError('Failed to load ad components');
      }
    };

    loadAdComponents();
  }, [onError]);

  if (!BannerAd || !BannerAdSize) {
    return (
      <View className="bg-surface-700 p-4 items-center justify-center min-h-[50px]">
        <Text className="text-text-secondary text-xs">Loading ad...</Text>
      </View>
    );
  }

  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      onAdLoaded={onLoad}
      onAdFailedToLoad={(error: any) => onError(error.message)}
    />
  );
};

export default function AdBanner({ placement }: Props) {
  const { isPremium } = useSubscriptionStore();
  const insets = useSafeAreaInsets();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Don't show ads to premium users
  if (isPremium) return null;

  const handleAdLoad = () => {
    setAdLoaded(true);
    setAdError(null);
  };

  const handleAdError = (error: string) => {
    console.error('Banner ad error:', error);
    setAdError(error);
    setAdLoaded(false);
  };

  // Position above navigation bar as per user preference
  const bottomPosition = 52 + (insets.bottom || 0) + 8;

  return (
    <View
      className="absolute left-0 right-0 items-center z-10"
      style={{ bottom: bottomPosition }}
    >
      <View className="w-11/12 bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        {adError ? (
          <View className="px-4 py-3 items-center">
            <Text className="text-text-secondary text-xs">Ad unavailable</Text>
          </View>
        ) : canUseAdMob() ? (
          <RealBannerAd
            unitId={adMobService.getBannerAdUnitId() || ''}
            onLoad={handleAdLoad}
            onError={handleAdError}
          />
        ) : (
          <MockBannerAd onLoad={handleAdLoad} onError={handleAdError} />
        )}

        {/* Ad label for transparency */}
        {adLoaded && (
          <View className="absolute top-1 right-1 bg-black/50 px-1 rounded">
            <Text className="text-white text-[8px]">Ad</Text>
          </View>
        )}
      </View>
    </View>
  );
}
