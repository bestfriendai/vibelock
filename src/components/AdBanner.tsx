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

// Enhanced Real Banner Component for Development Builds with SDK 54 compatibility
const RealBannerAd: React.FC<{
  unitId: string;
  onLoad: () => void;
  onError: (error: string) => void;
}> = ({ unitId, onLoad, onError }) => {
  const [BannerAd, setBannerAd] = useState<any>(null);
  const [BannerAdSize, setBannerAdSize] = useState<any>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();

  const MAX_LOAD_ATTEMPTS = 3;
  const RETRY_DELAY = 2000;

  // Enhanced error classification for SDK 54 compatibility
  const isSDK54CompatibilityError = (error: any): boolean => {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('expo sdk 54') ||
      errorMessage.includes('module not found') ||
      errorMessage.includes('native module') ||
      errorMessage.includes('admob') ||
      errorMessage.includes('google-mobile-ads')
    );
  };

  const loadAdComponents = async (attempt: number = 1): Promise<void> => {
    try {
      setIsLoading(true);

      // Add delay for SDK 54 compatibility
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      const adModule = await import("react-native-google-mobile-ads");

      // Additional delay after import for SDK 54 stability
      await new Promise((resolve) => setTimeout(resolve, 500));

      setBannerAd(adModule.BannerAd);
      setBannerAdSize(adModule.BannerAdSize);
      setIsLoading(false);

    } catch (error) {
      console.warn(`Failed to load AdMob components (attempt ${attempt}/${MAX_LOAD_ATTEMPTS}):`, error);

      if (isSDK54CompatibilityError(error) && attempt < MAX_LOAD_ATTEMPTS) {
        console.log("Applying SDK 54 compatibility workaround...");
        setLoadAttempts(attempt);
        // Retry with extended delay for SDK 54 compatibility
        setTimeout(() => loadAdComponents(attempt + 1), RETRY_DELAY * 2);
      } else if (attempt < MAX_LOAD_ATTEMPTS) {
        setLoadAttempts(attempt);
        setTimeout(() => loadAdComponents(attempt + 1), RETRY_DELAY);
      } else {
        setIsLoading(false);
        onError("Failed to load ad components after multiple attempts");
      }
    }
  };

  useEffect(() => {
    loadAdComponents();
  }, []);

  if (isLoading || !BannerAd || !BannerAdSize) {
    return (
      <View className="p-4 items-center justify-center min-h-[50px]" style={{ backgroundColor: colors.surface[700] }}>
        <Text className="text-xs" style={{ color: colors.text.secondary }}>
          {loadAttempts > 0 ? `Loading ad... (attempt ${loadAttempts + 1})` : "Loading ad..."}
        </Text>
        {loadAttempts > 0 && (
          <Text className="text-[10px] mt-1" style={{ color: colors.text.muted }}>
            Applying compatibility fixes...
          </Text>
        )}
      </View>
    );
  }

  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      onAdLoaded={() => {
        console.log("Banner ad loaded successfully");
        onLoad();
      }}
      onAdFailedToLoad={(e: any) => {
        const msg = typeof e === "string" ? e : (e?.message ?? "Ad failed to load");
        console.warn("Banner ad failed to load:", msg);

        // Implement retry logic for failed ad loads
        if (loadAttempts < MAX_LOAD_ATTEMPTS - 1) {
          console.log("Retrying banner ad load...");
          setTimeout(() => {
            setLoadAttempts(prev => prev + 1);
            // Force re-render to retry ad load
            setBannerAd(null);
            loadAdComponents(loadAttempts + 1);
          }, RETRY_DELAY);
        } else {
          onError(msg);
        }
      }}
      onAdOpened={() => {
        console.log("Banner ad opened");
      }}
      onAdClosed={() => {
        console.log("Banner ad closed");
      }}
    />
  );
};

export default function AdBanner({ placement }: Props) {
  const { isPremium } = useSubscriptionStore();
  const { setAdHeight, setAdVisible } = useAdContext();
  const { colors } = useTheme();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 3000;

  // Update ad context when premium status changes
  useEffect(() => {
    if (isPremium) {
      setAdVisible(false);
      setAdHeight(0);
    }
  }, [isPremium, setAdVisible, setAdHeight]);

  // Update ad context when component unmounts
  useEffect(() => {
    return () => {
      setAdVisible(false);
      setAdHeight(0);
    };
  }, [setAdVisible, setAdHeight]);

  // Don't show ads to premium users at all
  if (isPremium) {
    return null;
  }

  const handleAdLoad = () => {
    console.log("AdBanner: Ad loaded successfully");
    setAdLoaded(true);
    setAdError(null);
    setRetryCount(0);
    setIsRetrying(false);
    setAdVisible(true);
    setAdHeight(60); // Standard banner height
  };

  const handleAdError = (error: string) => {
    console.warn("AdBanner: Ad error:", error);

    // Implement retry logic for failed ads
    if (retryCount < MAX_RETRIES && !isRetrying) {
      setIsRetrying(true);
      console.log(`AdBanner: Retrying ad load (attempt ${retryCount + 1}/${MAX_RETRIES})`);

      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setAdError(null);
        setIsRetrying(false);
        // Force component re-render to retry ad loading
      }, RETRY_DELAY);
    } else {
      setAdError(error);
      setAdLoaded(false);
      setAdVisible(false);
      setAdHeight(0);
      setIsRetrying(false);
    }
  };

  return (
    <View
      className="border-t"
      style={{
        backgroundColor: colors.surface[800],
        borderTopColor: colors.border.default,
      }}
    >
      <View className="items-center py-2">
        <View
          className="w-11/12 border rounded-xl overflow-hidden"
          style={{
            backgroundColor: colors.surface[800],
            borderColor: colors.border.default,
          }}
        >
          {adError && !isRetrying ? (
            <View className="px-4 py-3 items-center">
              <Text className="text-xs" style={{ color: colors.text.secondary }}>
                Ad unavailable
              </Text>
              {retryCount > 0 && (
                <Text className="text-[10px] mt-1" style={{ color: colors.text.muted }}>
                  Failed after {retryCount} attempts
                </Text>
              )}
            </View>
          ) : isRetrying ? (
            <View className="px-4 py-3 items-center">
              <Text className="text-xs" style={{ color: colors.text.secondary }}>
                Retrying ad load... ({retryCount + 1}/{MAX_RETRIES})
              </Text>
            </View>
          ) : canUseAdMob() ? (
            (() => {
              const unitId = adMobService.getBannerAdUnitId();
              if (!unitId) {
                handleAdError("Missing AdMob banner unit ID");
                return null;
              }
              return <RealBannerAd key={retryCount} unitId={unitId} onLoad={handleAdLoad} onError={handleAdError} />;
            })()
          ) : (
            <MockBannerAd onLoad={handleAdLoad} onError={handleAdError} />
          )}

          {/* Ad label for transparency */}
          {adLoaded && (
            <View
              className="absolute top-1 right-1 px-1 rounded"
              style={{ backgroundColor: colors.surface[600] + "80" }}
            >
              <Text className="text-[8px]" style={{ color: colors.text.primary }}>
                Ad
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
