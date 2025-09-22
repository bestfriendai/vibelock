import supabase from "../config/supabase";
import { withRetry } from "../utils/retryLogic";
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from "../utils/fieldMapping";

export interface SubscriptionData {
  id: string;
  userId: string;
  tier: "free" | "premium" | "pro";
  status: "active" | "canceled" | "expired" | "trial";
  revenuecatCustomerId?: string;
  revenuecatSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType:
    | "subscription_started"
    | "subscription_renewed"
    | "subscription_canceled"
    | "subscription_expired"
    | "trial_started"
    | "trial_converted"
    | "purchase_failed";
  subscriptionTier: string;
  revenuecatEventId?: string;
  eventData: Record<string, any>;
  createdAt: Date;
}

export class SubscriptionService {
  /**
   * Sync RevenueCat subscription status with Supabase
   */
  async syncSubscriptionStatus(userId: string, customerInfo: any): Promise<void> {
    return withRetry(async () => {
      try {
        // Extract subscription data from RevenueCat customerInfo
        const subscriptionData = this.extractSubscriptionData(userId, customerInfo);

        // Update user's subscription fields
        await this.updateUserSubscription(userId, subscriptionData);

        // Log subscription event
        await this.logSubscriptionEvent(userId, "subscription_renewed", subscriptionData);

        console.log("✅ Subscription status synced with Supabase");
      } catch (error) {
        console.error("❌ Failed to sync subscription status:", error);
        throw error;
      }
    });
  }

  /**
   * Update user's subscription information in the database
   */
  async updateUserSubscription(userId: string, subscriptionData: Partial<SubscriptionData>): Promise<void> {
    const updates = {
      subscription_tier: subscriptionData.tier || "free",
      subscription_expires_at: subscriptionData.currentPeriodEnd?.toISOString() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("users").update(updates).eq("id", userId);

    if (error) {
      throw new Error(`Failed to update user subscription: ${error.message}`);
    }
  }

  /**
   * Get user's current subscription status from database
   */
  async getUserSubscription(userId: string): Promise<{ tier: string; expiresAt: Date | null; isActive: boolean }> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("subscription_tier, subscription_expires_at")
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error(`Failed to get user subscription: ${error.message}`);
      }

      const tier = data.subscription_tier || "free";
      const expiresAt = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
      const isActive = tier !== "free" && (!expiresAt || expiresAt > new Date());

      return { tier, expiresAt, isActive };
    });
  }

  /**
   * Check if user has premium access
   */
  async hasPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return subscription.isActive && ["premium", "pro"].includes(subscription.tier);
  }

  /**
   * Check if user should see ads (non-premium users only)
   */
  async shouldShowAds(userId: string): Promise<boolean> {
    try {
      const hasPremium = await this.hasPremiumAccess(userId);
      return !hasPremium;
    } catch (error) {
      console.warn("Failed to check premium status, defaulting to show ads:", error);
      return true; // Default to showing ads if check fails
    }
  }

  /**
   * Log subscription events for analytics
   */
  async logSubscriptionEvent(
    userId: string,
    eventType: SubscriptionEvent["eventType"],
    subscriptionData: Partial<SubscriptionData>,
    additionalData?: Record<string, any>,
  ): Promise<void> {
    try {
      const eventData = {
        subscription_tier: subscriptionData.tier,
        expires_at: subscriptionData.currentPeriodEnd?.toISOString(),
        ...additionalData,
      };

      const { error } = await supabase.from("subscription_events").insert({
        user_id: userId,
        event_type: eventType,
        subscription_tier: subscriptionData.tier || "free",
        event_data: eventData,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("Failed to log subscription event:", error);
      }
    } catch (error) {
      console.warn("Error logging subscription event:", error);
    }
  }

  /**
   * Handle RevenueCat webhook events
   */
  async handleWebhookEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const userId = eventData.app_user_id;
      if (!userId) {
        console.warn("Webhook event missing user ID");
        return;
      }

      switch (eventType) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
          await this.handleSubscriptionActivated(userId, eventData);
          break;
        case "CANCELLATION":
          await this.handleSubscriptionCanceled(userId, eventData);
          break;
        case "EXPIRATION":
          await this.handleSubscriptionExpired(userId, eventData);
          break;
        case "BILLING_ISSUE":
          await this.handleBillingIssue(userId, eventData);
          break;
        default:
          console.log(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (error) {
      console.error("Error handling webhook event:", error);
      throw error;
    }
  }

  /**
   * Extract subscription data from RevenueCat customerInfo
   */
  private extractSubscriptionData(userId: string, customerInfo: any): Partial<SubscriptionData> {
    const activeEntitlements = customerInfo?.entitlements?.active || {};
    const hasActiveSubscription = Object.keys(activeEntitlements).length > 0;

    if (!hasActiveSubscription) {
      return {
        userId,
        tier: "free",
        status: "expired",
      };
    }

    // Get the first active entitlement (assuming single subscription model)
    const entitlement = Object.values(activeEntitlements)[0] as any;

    return {
      userId,
      tier: this.mapEntitlementToTier(Object.keys(activeEntitlements)[0] || "free"),
      status: "active",
      currentPeriodStart: entitlement.latestPurchaseDate ? new Date(entitlement.latestPurchaseDate) : undefined,
      currentPeriodEnd: entitlement.expirationDate ? new Date(entitlement.expirationDate) : undefined,
      revenuecatCustomerId: customerInfo.originalAppUserId,
    };
  }

  /**
   * Map RevenueCat entitlement to subscription tier
   */
  private mapEntitlementToTier(entitlementId: string): "free" | "premium" | "pro" {
    const entitlementMap: Record<string, "premium" | "pro"> = {
      premium: "premium",
      pro: "pro",
      premium_monthly: "premium",
      premium_annual: "premium",
      pro_monthly: "pro",
      pro_annual: "pro",
    };

    return entitlementMap[entitlementId] || "premium";
  }

  /**
   * Handle subscription activation
   */
  private async handleSubscriptionActivated(userId: string, eventData: any): Promise<void> {
    const subscriptionData = this.extractSubscriptionData(userId, eventData);
    await this.updateUserSubscription(userId, subscriptionData);
    await this.logSubscriptionEvent(userId, "subscription_started", subscriptionData, eventData);
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCanceled(userId: string, eventData: any): Promise<void> {
    const subscriptionData = this.extractSubscriptionData(userId, eventData);
    subscriptionData.status = "canceled";
    subscriptionData.cancelAtPeriodEnd = true;

    await this.updateUserSubscription(userId, subscriptionData);
    await this.logSubscriptionEvent(userId, "subscription_canceled", subscriptionData, eventData);
  }

  /**
   * Handle subscription expiration
   */
  private async handleSubscriptionExpired(userId: string, eventData: any): Promise<void> {
    const subscriptionData: Partial<SubscriptionData> = {
      userId,
      tier: "free",
      status: "expired",
    };

    await this.updateUserSubscription(userId, subscriptionData);
    await this.logSubscriptionEvent(userId, "subscription_expired", subscriptionData, eventData);
  }

  /**
   * Handle billing issues
   */
  private async handleBillingIssue(userId: string, eventData: any): Promise<void> {
    await this.logSubscriptionEvent(userId, "purchase_failed", { userId, tier: "free" }, eventData);
  }

  /**
   * Get subscription analytics for admin dashboard
   */
  async getSubscriptionAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalSubscribers: number;
    newSubscribers: number;
    churnedSubscribers: number;
    revenue: number;
    conversionRate: number;
  }> {
    return withRetry(async () => {
      const dateFilter =
        startDate && endDate
          ? `created_at >= '${startDate.toISOString()}' AND created_at <= '${endDate.toISOString()}'`
          : "created_at >= NOW() - INTERVAL '30 days'";

      // Get total active subscribers
      const { count: totalSubscribers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .neq("subscription_tier", "free")
        .gt("subscription_expires_at", new Date().toISOString());

      // Get new subscribers in period
      const { count: newSubscribers } = await supabase
        .from("subscription_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "subscription_started")
        .gte("created_at", startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get churned subscribers in period
      const { count: churnedSubscribers } = await supabase
        .from("subscription_events")
        .select("*", { count: "exact", head: true })
        .in("event_type", ["subscription_canceled", "subscription_expired"])
        .gte("created_at", startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalSubscribers: totalSubscribers || 0,
        newSubscribers: newSubscribers || 0,
        churnedSubscribers: churnedSubscribers || 0,
        revenue: 0, // Would need to integrate with RevenueCat API for actual revenue
        conversionRate: 0, // Would need to calculate based on trial-to-paid conversion
      };
    });
  }

  /**
   * Sync subscription data with Supabase database
   */
  async syncWithSupabase(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);

      // Update user's subscription status in Supabase
      const { error } = await supabase
        .from("users")
        .update({
          subscription_tier: subscription.tier,
          subscription_expires_at: subscription.expiresAt?.toISOString() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      console.log(`✅ Synced subscription data for user ${userId}: ${subscription.tier}`);
    } catch (error) {
      console.error("❌ Failed to sync subscription with Supabase:", error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
