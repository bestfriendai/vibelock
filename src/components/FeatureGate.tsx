import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useSubscriptionStore from "../state/subscriptionStore";
import { PaywallAdaptive } from "./subscription/PaywallAdaptive";
import supabase from "../config/supabase";

interface FeatureGateProps {
  feature: "premium" | "pro";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback, showUpgradePrompt = true }) => {
  const { isPremium, isPro, subscriptionTier, syncWithSupabase } = useSubscriptionStore();
  const [showPaywall, setShowPaywall] = useState(false);

  // Sync subscription status on mount
  useEffect(() => {
    const syncSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await syncWithSupabase(user.id);
        }
      } catch (error) {
        console.warn("Failed to sync subscription status:", error);
      }
    };

    syncSubscription();
  }, [syncWithSupabase]);

  // Use Supabase-backed subscription status for more accurate access control
  const hasAccess =
    feature === "premium"
      ? isPremium || isPro || ["premium", "pro"].includes(subscriptionTier)
      : isPro || subscriptionTier === "pro";

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setShowPaywall(true)}
        className="bg-surface-800 border border-surface-700 rounded-lg p-4 items-center"
      >
        <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
        <Text className="text-text-primary font-semibold mt-2">Premium Feature</Text>
        <Text className="text-text-secondary text-sm text-center mt-1">
          Upgrade to Locker Room Plus to unlock this feature
        </Text>
        <View className="bg-brand-red px-4 py-2 rounded-lg mt-3">
          <Text className="text-white font-medium">Upgrade Now</Text>
        </View>
      </Pressable>

      <PaywallAdaptive visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
};
