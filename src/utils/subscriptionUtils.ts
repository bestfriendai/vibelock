import supabase from "../config/supabase";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import useSubscriptionStore from "../state/subscriptionStore";
import { subscriptionService } from "../services/subscriptionService";

/**
 * Initialize subscription status for a new user
 */
export async function initializeUserSubscription(userId: string): Promise<void> {
  try {
    // Set default subscription tier to 'free' if not already set
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("subscription_tier, subscription_expires_at")
      .eq("id", userId)
      .single();

    if (fetchError) {
      return;
    }

    // If user doesn't have a subscription tier set, initialize it
    if (!user.subscription_tier) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          subscription_tier: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Failed to initialize user subscription:", updateError);
      } else {
      }
    }

    // Log initial subscription event
    await subscriptionService.logSubscriptionEvent(
      userId,
      "subscription_started",
      { userId, tier: "free" },
      { source: "user_registration" },
    );
  } catch (error) {
    console.error("Error initializing user subscription:", error);
  }
}

/**
 * Sync subscription status with RevenueCat on app launch
 */
export async function syncSubscriptionOnLaunch(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const store = useSubscriptionStore.getState();

    // Initialize RevenueCat if available
    if (store.initializeRevenueCat) {
      await store.initializeRevenueCat(user.id);
    }

    // Sync with Supabase
    if (store.syncWithSupabase) {
      await store.syncWithSupabase(user.id);
    }
  } catch (error) {
    console.error("Failed to sync subscription on launch:", error);
  }
}

/**
 * Handle subscription expiration
 */
export async function handleSubscriptionExpiration(userId: string): Promise<void> {
  try {
    // Update user's subscription status to free
    const { error } = await supabase
      .from("users")
      .update({
        subscription_tier: "free",
        subscription_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to update expired subscription: ${error.message}`);
    }

    // Log expiration event
    await subscriptionService.logSubscriptionEvent(
      userId,
      "subscription_expired",
      { userId, tier: "free" },
      { expired_at: new Date().toISOString() },
    );

    // Update local state
    const store = useSubscriptionStore.getState();
    if (store.syncWithSupabase) {
      await store.syncWithSupabase(userId);
    }
  } catch (error) {
    console.error("Error handling subscription expiration:", error);
    throw error;
  }
}

/**
 * Check for expired subscriptions and handle them
 */
export async function checkAndHandleExpiredSubscriptions(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const subscription = await subscriptionService.getUserSubscription(user.id);

    // Check if subscription is expired
    if (subscription.expiresAt && subscription.expiresAt <= new Date() && subscription.tier !== "free") {
      await handleSubscriptionExpiration(user.id);
    }
  } catch (error) {
    console.error("Error checking expired subscriptions:", error);
  }
}

/**
 * Get subscription status for display purposes
 */
export async function getSubscriptionDisplayInfo(userId: string): Promise<{
  tier: string;
  status: "active" | "expired" | "trial" | "canceled";
  expiresAt: Date | null;
  daysRemaining: number | null;
  isActive: boolean;
}> {
  try {
    const subscription = await subscriptionService.getUserSubscription(userId);

    let status: "active" | "expired" | "trial" | "canceled" = "active";
    let daysRemaining: number | null = null;

    if (subscription.tier === "free") {
      status = "expired";
    } else if (subscription.expiresAt) {
      const now = new Date();
      const expires = subscription.expiresAt;
      const diffTime = expires.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      daysRemaining = Math.max(0, diffDays);

      if (diffDays <= 0) {
        status = "expired";
      } else if (diffDays <= 7) {
        status = "trial"; // Show as trial if expiring soon
      }
    }

    return {
      tier: subscription.tier,
      status,
      expiresAt: subscription.expiresAt,
      daysRemaining,
      isActive: subscription.isActive,
    };
  } catch (error) {
    console.error("Error getting subscription display info:", error);
    return {
      tier: "free",
      status: "expired",
      expiresAt: null,
      daysRemaining: null,
      isActive: false,
    };
  }
}

/**
 * Format subscription tier for display
 */
export function formatSubscriptionTier(tier: string): string {
  switch (tier) {
    case "premium":
      return "Locker Room Plus";
    case "pro":
      return "Locker Room Pro";
    case "free":
    default:
      return "Free";
  }
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "trial":
      return "Trial";
    case "canceled":
      return "Canceled";
    default:
      return "Unknown";
  }
}

/**
 * Get subscription benefits for display
 */
export function getSubscriptionBenefits(tier: "free" | "premium" | "pro"): string[] {
  switch (tier) {
    case "premium":
      return ["Ad-free experience", "Unlimited reviews", "Priority support", "Advanced filters"];
    case "pro":
      return [
        "All Premium features",
        "Analytics dashboard",
        "Custom themes",
        "Early access to new features",
        "Priority customer support",
      ];
    case "free":
    default:
      return ["Basic reviews", "Community access", "Standard support"];
  }
}

/**
 * Check if user can access a specific feature
 */
/**
 * Purchase a subscription package
 */
export async function purchasePackage(packageToPurchase: PurchasesPackage): Promise<any> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    // Sync with local store
    const store = useSubscriptionStore.getState();
    // Note: syncWithSupabase should be called after purchase completion with userId
    // This sync will happen in the calling component after successful purchase
    return customerInfo;
  } catch (error) {
    console.error("Purchase failed:", error);
    throw error;
  }
}

/**
 * Check if user can access a specific feature
 */
export async function canAccessFeature(userId: string, feature: "premium" | "pro"): Promise<boolean> {
  try {
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (feature === "premium") {
      return subscription.isActive && ["premium", "pro"].includes(subscription.tier);
    }

    return subscription.isActive && subscription.tier === "pro";
  } catch (error) {
    console.error("Error checking feature access:", error);
    return false;
  }
}
