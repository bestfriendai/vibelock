import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import useSubscriptionStore from "../../state/subscriptionStore";
import { supabase } from "../../config/supabase";
import { canUseAdMob } from "../../utils/buildEnvironment";

interface AdBannerProps {
  placement?: "bottom" | "top" | "inline";
  size?: "banner" | "largeBanner" | "mediumRectangle";
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ placement = "bottom", size = "banner", className = "" }) => {
  const { shouldShowAds, syncWithSupabase } = useSubscriptionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    const checkAdStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await syncWithSupabase(user.id);
        }

        // Show ads if user is not premium and AdMob is available
        setShowAd(shouldShowAds && canUseAdMob());
      } catch (error) {
        console.warn("Failed to check ad status:", error);
        // Default to showing ads if check fails (for non-premium users)
        setShowAd(canUseAdMob());
      } finally {
        setIsLoading(false);
      }
    };

    checkAdStatus();
  }, [shouldShowAds, syncWithSupabase]);

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Don't show ads for premium users
  if (!showAd) {
    return null;
  }

  // Mock banner ad for Expo Go or when AdMob is not available
  if (!canUseAdMob()) {
    return (
      <View
        className={`bg-gray-200 border border-gray-300 items-center justify-center ${
          size === "banner" ? "h-12" : size === "largeBanner" ? "h-16" : "h-64"
        } ${className}`}
      >
        <Text className="text-gray-600 text-sm">{__DEV__ ? "Mock Ad Banner" : ""}</Text>
      </View>
    );
  }

  // In a real implementation, this would render the actual AdMob banner
  // For now, we'll use a placeholder that matches the expected behavior
  return (
    <View
      className={`bg-gray-100 border border-gray-200 items-center justify-center ${
        size === "banner" ? "h-12" : size === "largeBanner" ? "h-16" : "h-64"
      } ${className}`}
    >
      <Text className="text-gray-500 text-xs">Advertisement</Text>
    </View>
  );
};

// Specific banner components for common placements
export const BottomAdBanner: React.FC<{ className?: string }> = ({ className }) => (
  <AdBanner placement="bottom" size="banner" className={`absolute bottom-0 left-0 right-0 ${className || ""}`} />
);

export const InlineAdBanner: React.FC<{ className?: string }> = ({ className }) => (
  <AdBanner placement="inline" size="mediumRectangle" className={`my-4 ${className || ""}`} />
);

export const TopAdBanner: React.FC<{ className?: string }> = ({ className }) => (
  <AdBanner placement="top" size="banner" className={`${className || ""}`} />
);
