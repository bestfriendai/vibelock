import { subscriptionService } from "../../services/subscriptionService";

/**
 * RevenueCat Webhook Handler
 *
 * This handler processes webhook events from RevenueCat to keep
 * subscription status in sync with the Supabase database.
 *
 * To use this handler:
 * 1. Deploy this as a serverless function or API endpoint
 * 2. Configure the webhook URL in RevenueCat dashboard
 * 3. Set up proper authentication/validation
 */

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    id: string;
    app_user_id: string;
    aliases: string[];
    original_app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    environment: "PRODUCTION" | "SANDBOX";
    entitlement_id: string | null;
    entitlement_ids: string[];
    presented_offering_id: string | null;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    app_id: string;
    offer_code: string | null;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    subscriber_attributes: Record<string, any>;
    store: "APP_STORE" | "PLAY_STORE" | "STRIPE" | "PROMOTIONAL";
  };
}

/**
 * Main webhook handler function
 */
export async function handleRevenueCatWebhook(
  eventType: string,
  eventData: RevenueCatWebhookEvent,
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate webhook data
    if (!eventData.event.app_user_id) {
      throw new Error("Missing app_user_id in webhook event");
    }

    // Process the webhook event
    await subscriptionService.handleWebhookEvent(eventType, eventData.event);

    return {
      success: true,
      message: `Webhook ${eventType} processed successfully`,
    };
  } catch (error) {
    console.error("Error processing RevenueCat webhook:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Webhook validation helper
 *
 * Validates RevenueCat webhook signature using HMAC-SHA256
 * Based on RevenueCat webhook security documentation
 */
export function validateRevenueCatWebhook(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature || !payload) {
    return false;
  }

  try {
    // Import crypto module for HMAC calculation
    const crypto = require("crypto");

    // Calculate expected signature
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

    // Compare signatures using constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));

    if (!isValid) {
    }

    return isValid;
  } catch (error) {
    console.error("RevenueCat webhook validation error:", error);
    return false;
  }
}

/**
 * Express.js/Next.js API route handler example
 *
 * This is an example of how to use the webhook handler in different frameworks
 */
export const revenueCatWebhookHandler = async (req: any, res: any) => {
  try {
    // Validate HTTP method
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Get webhook signature for validation
    const signature = req.headers["x-revenuecat-signature"] || "";
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET || "";

    // Validate webhook signature (implement proper validation)
    if (webhookSecret && !validateRevenueCatWebhook(JSON.stringify(req.body), signature, webhookSecret)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // Extract event type and data
    const eventType = req.body.event?.type;
    const eventData = req.body;

    if (!eventType) {
      return res.status(400).json({ error: "Missing event type" });
    }

    // Process the webhook
    const result = await handleRevenueCatWebhook(eventType, eventData);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Supabase Edge Function handler example
 *
 * This is an example for Supabase Edge Functions
 */
export const supabaseEdgeFunctionHandler = async (req: Request): Promise<Response> => {
  try {
    // Validate HTTP method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get webhook signature for validation
    const signature = req.headers.get("x-revenuecat-signature") || "";
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET || "";

    // Parse request body
    const eventData = await req.json();

    // Validate webhook signature (implement proper validation)
    if (webhookSecret && !validateRevenueCatWebhook(JSON.stringify(eventData), signature, webhookSecret)) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract event type
    const eventType = eventData.event?.type;

    if (!eventType) {
      return new Response(JSON.stringify({ error: "Missing event type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process the webhook
    const result = await handleRevenueCatWebhook(eventType, eventData);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function webhook handler error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * Test webhook event for development
 */
export const testWebhookEvent: RevenueCatWebhookEvent = {
  api_version: "1.0",
  event: {
    type: "INITIAL_PURCHASE",
    id: "test-event-id",
    app_user_id: "test-user-id",
    aliases: ["test-user-id"],
    original_app_user_id: "test-user-id",
    product_id: "premium_monthly",
    period_type: "NORMAL",
    purchased_at_ms: Date.now(),
    expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    environment: "SANDBOX",
    entitlement_id: "premium",
    entitlement_ids: ["premium"],
    presented_offering_id: "default",
    transaction_id: "test-transaction-id",
    original_transaction_id: "test-original-transaction-id",
    is_family_share: false,
    country_code: "US",
    app_id: "com.lockerroom.app",
    offer_code: null,
    currency: "USD",
    price: 9.99,
    price_in_purchased_currency: 9.99,
    subscriber_attributes: {},
    store: "APP_STORE",
  },
};
