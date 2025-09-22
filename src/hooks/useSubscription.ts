import { useEffect, useState } from "react";
import useSubscriptionStore from "../state/subscriptionStore";
import { subscriptionService } from "../services/subscriptionService";
import supabase from "../config/supabase";

export interface SubscriptionStatus {
  isPremium: boolean;
  isPro: boolean;
  tier: "free" | "premium" | "pro";
  isActive: boolean;
  expiresAt: Date | null;
  shouldShowAds: boolean;
  daysRemaining: number | null;
  isLoading: boolean;
}

/**
 * Hook for accessing subscription status with automatic Supabase sync
 */
export const useSubscription = (): SubscriptionStatus => {
  const { isPremium, isPro, subscriptionTier, subscriptionExpiresAt, shouldShowAds, isLoading, syncWithSupabase } =
    useSubscriptionStore();

  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Calculate days remaining
    if (subscriptionExpiresAt) {
      const now = new Date();
      const expires = new Date(subscriptionExpiresAt);
      const diffTime = expires.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    } else {
      setDaysRemaining(null);
    }
  }, [subscriptionExpiresAt]);

  useEffect(() => {
    // Auto-sync subscription status on mount and when user changes
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

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await syncWithSupabase(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncWithSupabase]);

  const isActive = isPremium || isPro || ["premium", "pro"].includes(subscriptionTier);

  return {
    isPremium,
    isPro,
    tier: subscriptionTier,
    isActive,
    expiresAt: subscriptionExpiresAt,
    shouldShowAds,
    daysRemaining,
    isLoading,
  };
};

/**
 * Hook for checking if user has access to a specific feature
 */
export const useFeatureAccess = (feature: "premium" | "pro"): boolean => {
  const { isPremium, isPro, tier } = useSubscription();

  if (feature === "premium") {
    return isPremium || isPro || ["premium", "pro"].includes(tier);
  }

  return isPro || tier === "pro";
};

/**
 * Hook for checking if ads should be shown
 */
export const useAdStatus = (): { shouldShowAds: boolean; isLoading: boolean } => {
  const { shouldShowAds, isLoading } = useSubscription();

  return {
    shouldShowAds,
    isLoading,
  };
};

/**
 * Hook for subscription analytics (admin use)
 */
export const useSubscriptionAnalytics = (startDate?: Date, endDate?: Date) => {
  const [analytics, setAnalytics] = useState<{
    totalSubscribers: number;
    newSubscribers: number;
    churnedSubscribers: number;
    revenue: number;
    conversionRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await subscriptionService.getSubscriptionAnalytics(startDate, endDate);
        setAnalytics(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch analytics");
        console.error("Failed to fetch subscription analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [startDate, endDate]);

  return { analytics, loading, error };
};
