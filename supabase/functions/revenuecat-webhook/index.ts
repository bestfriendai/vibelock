// RevenueCat Webhook Handler for Supabase Edge Function
// Handles subscription events from RevenueCat

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as crypto from "https://deno.land/std@0.224.0/crypto/mod.ts";

// RevenueCat event types
interface RevenueCatEvent {
  event: {
    type: string;
    id: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    store: string;
    environment: string;
    is_family_share: boolean;
    country_code: string;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    subscriber_attributes?: Record<string, any>;
    transaction_id: string;
    original_transaction_id: string;
  };
  api_version: string;
}

// Webhook event types we handle
const EVENT_TYPES = {
  INITIAL_PURCHASE: "INITIAL_PURCHASE",
  RENEWAL: "RENEWAL",
  CANCELLATION: "CANCELLATION",
  UNCANCELLATION: "UNCANCELLATION",
  NON_RENEWING_PURCHASE: "NON_RENEWING_PURCHASE",
  SUBSCRIPTION_PAUSED: "SUBSCRIPTION_PAUSED",
  EXPIRATION: "EXPIRATION",
  BILLING_ISSUE: "BILLING_ISSUE",
  PRODUCT_CHANGE: "PRODUCT_CHANGE",
  TRANSFER: "TRANSFER",
  SUBSCRIBER_ALIAS: "SUBSCRIBER_ALIAS",
};

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify webhook secret
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // Verify authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Invalid authorization header");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse the webhook payload
    const payload: RevenueCatEvent = await req.json();
    console.log("Received RevenueCat webhook:", payload.event.type);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process the event based on type
    const event = payload.event;
    const userId = event.app_user_id;
    const eventType = event.type;

    // Log the webhook event for auditing
    const { error: logError } = await supabase.from("webhook_logs").insert({
      service: "revenuecat",
      event_type: eventType,
      event_id: event.id,
      user_id: userId,
      payload: payload,
      created_at: new Date().toISOString(),
    });

    if (logError) {
      console.error("Failed to log webhook event:", logError);
    }

    // Handle different event types
    switch (eventType) {
      case EVENT_TYPES.INITIAL_PURCHASE:
      case EVENT_TYPES.RENEWAL:
      case EVENT_TYPES.NON_RENEWING_PURCHASE:
        await handlePurchase(supabase, event);
        break;

      case EVENT_TYPES.CANCELLATION:
      case EVENT_TYPES.EXPIRATION:
        await handleCancellation(supabase, event);
        break;

      case EVENT_TYPES.UNCANCELLATION:
        await handleUncancellation(supabase, event);
        break;

      case EVENT_TYPES.BILLING_ISSUE:
        await handleBillingIssue(supabase, event);
        break;

      case EVENT_TYPES.PRODUCT_CHANGE:
        await handleProductChange(supabase, event);
        break;

      case EVENT_TYPES.SUBSCRIPTION_PAUSED:
        await handleSubscriptionPaused(supabase, event);
        break;

      case EVENT_TYPES.TRANSFER:
        await handleTransfer(supabase, event);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Handle purchase events (new or renewal)
async function handlePurchase(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const expirationMs = event.expiration_at_ms;
  const entitlements = event.entitlement_ids || [];

  console.log(`Processing purchase for user ${userId}: ${productId}`);

  // Update user subscription status
  const { error: updateError } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      product_id: productId,
      status: "active",
      entitlements: entitlements,
      expires_at: expirationMs ? new Date(expirationMs).toISOString() : null,
      transaction_id: event.transaction_id,
      store: event.store,
      environment: event.environment,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (updateError) {
    console.error("Failed to update subscription:", updateError);
    throw updateError;
  }

  // Update user profile to mark as premium
  const isPremium = entitlements.includes("premium") || entitlements.includes("pro");
  if (isPremium) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_premium: true,
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
    }
  }

  // Send welcome/renewal notification
  await sendNotification(supabase, userId, {
    type: event.type === EVENT_TYPES.INITIAL_PURCHASE ? "subscription_started" : "subscription_renewed",
    title: "Subscription Active",
    body:
      event.type === EVENT_TYPES.INITIAL_PURCHASE
        ? "Welcome to Premium! Enjoy all the exclusive features."
        : "Your subscription has been renewed. Thank you for your continued support!",
    data: { productId, entitlements },
  });
}

// Handle cancellation events
async function handleCancellation(supabase: any, event: any) {
  const userId = event.app_user_id;
  const expirationMs = event.expiration_at_ms;

  console.log(`Processing cancellation for user ${userId}`);

  // Update subscription status to cancelled but still active until expiration
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
      expires_at: expirationMs ? new Date(expirationMs).toISOString() : null,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update cancellation:", updateError);
    throw updateError;
  }

  // Don't remove premium immediately if there's time remaining
  if (expirationMs && expirationMs > Date.now()) {
    console.log(`User ${userId} remains premium until ${new Date(expirationMs).toISOString()}`);
  } else {
    // Remove premium access immediately
    await removePremiumAccess(supabase, userId);
  }

  // Send cancellation notification
  await sendNotification(supabase, userId, {
    type: "subscription_cancelled",
    title: "Subscription Cancelled",
    body:
      expirationMs && expirationMs > Date.now()
        ? `Your subscription has been cancelled. You'll retain access until ${new Date(expirationMs).toLocaleDateString()}.`
        : "Your subscription has been cancelled and premium access has been removed.",
    data: { expiresAt: expirationMs },
  });
}

// Handle uncancellation (user resubscribed before expiration)
async function handleUncancellation(supabase: any, event: any) {
  const userId = event.app_user_id;

  console.log(`Processing uncancellation for user ${userId}`);

  // Reactivate subscription
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "active",
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to process uncancellation:", updateError);
    throw updateError;
  }

  // Send reactivation notification
  await sendNotification(supabase, userId, {
    type: "subscription_reactivated",
    title: "Subscription Reactivated",
    body: "Your subscription has been reactivated. Welcome back!",
    data: {},
  });
}

// Handle billing issues
async function handleBillingIssue(supabase: any, event: any) {
  const userId = event.app_user_id;

  console.log(`Processing billing issue for user ${userId}`);

  // Update subscription status
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "billing_issue",
      billing_issue_detected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update billing issue:", updateError);
  }

  // Send billing issue notification
  await sendNotification(supabase, userId, {
    type: "billing_issue",
    title: "Payment Issue",
    body: "There was an issue processing your payment. Please update your payment method to continue your subscription.",
    data: { urgent: true },
  });
}

// Handle product changes (upgrades/downgrades)
async function handleProductChange(supabase: any, event: any) {
  const userId = event.app_user_id;
  const newProductId = event.product_id;
  const entitlements = event.entitlement_ids || [];

  console.log(`Processing product change for user ${userId}: ${newProductId}`);

  // Update subscription with new product
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({
      product_id: newProductId,
      entitlements: entitlements,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update product change:", updateError);
    throw updateError;
  }

  // Send notification about the change
  await sendNotification(supabase, userId, {
    type: "subscription_changed",
    title: "Subscription Updated",
    body: "Your subscription plan has been updated successfully.",
    data: { newProductId, entitlements },
  });
}

// Handle subscription pause (Android only)
async function handleSubscriptionPaused(supabase: any, event: any) {
  const userId = event.app_user_id;

  console.log(`Processing subscription pause for user ${userId}`);

  // Update subscription status to paused
  const { error: updateError } = await supabase
    .from("user_subscriptions")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update pause status:", updateError);
  }

  // Temporarily remove premium access
  await removePremiumAccess(supabase, userId);

  // Send pause notification
  await sendNotification(supabase, userId, {
    type: "subscription_paused",
    title: "Subscription Paused",
    body: "Your subscription has been paused. You can resume it anytime from your account settings.",
    data: {},
  });
}

// Handle transfer events (app user ID change)
async function handleTransfer(supabase: any, event: any) {
  const oldUserId = event.original_app_user_id;
  const newUserId = event.app_user_id;

  console.log(`Processing transfer from ${oldUserId} to ${newUserId}`);

  // Transfer subscription to new user ID
  const { error: transferError } = await supabase
    .from("user_subscriptions")
    .update({
      user_id: newUserId,
      transferred_from: oldUserId,
      transferred_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", oldUserId);

  if (transferError) {
    console.error("Failed to transfer subscription:", transferError);
    throw transferError;
  }

  // Update both user profiles
  await supabase.from("profiles").update({ is_premium: false }).eq("id", oldUserId);
  await supabase.from("profiles").update({ is_premium: true }).eq("id", newUserId);
}

// Helper function to remove premium access
async function removePremiumAccess(supabase: any, userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_premium: false,
      subscription_status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to remove premium access:", error);
  }
}

// Helper function to send notifications
async function sendNotification(supabase: any, userId: string, notification: any) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to send notification:", error);
    }

    // Trigger push notification if user has token
    const { data: pushTokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId)
      .eq("active", true);

    if (pushTokens && pushTokens.length > 0) {
      // Send push notifications (implementation depends on your push service)
      console.log(`Sending push notification to ${pushTokens.length} devices`);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}
