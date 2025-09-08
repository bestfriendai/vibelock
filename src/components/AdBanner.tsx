import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSubscriptionStore from "../state/subscriptionStore";
import { canUseAdMob, buildEnv } from "../utils/buildEnvironment";
import { adMobService } from "../services/adMobService";
import { useAdContext } from "../contexts/AdContext";

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
  const { setAdHeight, setAdVisible } = useAdContext();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Don't show ads to premium users (but still show in development for demo)
  if (isPremium && !buildEnv.isExpoGo && !buildEnv.isDevelopmentBuild) {
    // Ensure ad context is updated when premium
    useEffect(() => {
      setAdVisible(false);
      setAdHeight(0);
    }, [setAdVisible, setAdHeight]);

    return null;
  }

  const handleAdLoad = () => {
    setAdLoaded(true);
    setAdError(null);
    setAdVisible(true);
    setAdHeight(60); // Standard banner height
  };

  const handleAdError = (error: string) => {
    console.error('Banner ad error:', error);
    setAdError(error);
    setAdLoaded(false);
    setAdVisible(false);
    setAdHeight(0);
  };

  // Update ad context when component unmounts
  useEffect(() => {
    return () => {
      setAdVisible(false);
      setAdHeight(0);
    };
  }, [setAdVisible, setAdHeight]);

  return (
    <View className="bg-surface-800 border-t border-surface-700">
      <View className="items-center py-2">
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
    </View>
  );
}
