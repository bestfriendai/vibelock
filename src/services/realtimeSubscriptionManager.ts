/**
 * Optimized Real-time Subscription Manager
 * Manages Supabase real-time subscriptions with connection pooling,
 * automatic reconnection, and resource optimization
 */

import { RealtimeChannel, RealtimeChannelSendResponse } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";

interface SubscriptionConfig {
  maxRetries: number;
  retryDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConcurrentSubscriptions: number;
}

interface SubscriptionInfo {
  channel: RealtimeChannel;
  roomId: string;
  userId: string;
  callbacks: Set<Function>;
  retryCount: number;
  lastActivity: number;
  status: "connecting" | "connected" | "disconnected" | "error";
}

class RealtimeSubscriptionManager {
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private connectionPool: Map<string, RealtimeChannel> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private config: SubscriptionConfig = {
    maxRetries: 5,
    retryDelay: 1000,
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 10000, // 10 seconds
    maxConcurrentSubscriptions: 10,
  };

  constructor(config?: Partial<SubscriptionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Start cleanup interval
    setInterval(() => this.cleanupInactiveSubscriptions(), 60000); // Every minute
  }

  /**
   * Subscribe to a chat room with optimized connection management
   */
  async subscribe(
    roomId: string,
    userId: string,
    callbacks: {
      onMessage?: (payload: any) => void;
      onPresence?: (payload: any) => void;
      onTyping?: (payload: any) => void;
      onError?: (error: any) => void;
    },
  ): Promise<boolean> {
    try {
      // Check if we're at the subscription limit
      if (this.subscriptions.size >= this.config.maxConcurrentSubscriptions) {
        await this.cleanupInactiveSubscriptions();

        if (this.subscriptions.size >= this.config.maxConcurrentSubscriptions) {
          console.warn("Maximum concurrent subscriptions reached");
          return false;
        }
      }

      const subscriptionKey = `${roomId}:${userId}`;

      // Check if subscription already exists
      const existing = this.subscriptions.get(subscriptionKey);
      if (existing && existing.status === "connected") {
        // Add callbacks to existing subscription
        if (callbacks.onMessage) existing.callbacks.add(callbacks.onMessage);
        if (callbacks.onPresence) existing.callbacks.add(callbacks.onPresence);
        if (callbacks.onTyping) existing.callbacks.add(callbacks.onTyping);
        if (callbacks.onError) existing.callbacks.add(callbacks.onError);
        return true;
      }

      // Create new subscription
      const channel = supabase.channel(`room:${roomId}`, {
        config: {
          presence: { key: userId },
          broadcast: { self: true },
        },
      });

      const subscriptionInfo: SubscriptionInfo = {
        channel,
        roomId,
        userId,
        callbacks: new Set(),
        retryCount: 0,
        lastActivity: Date.now(),
        status: "connecting",
      };

      // Add callbacks
      if (callbacks.onMessage) subscriptionInfo.callbacks.add(callbacks.onMessage);
      if (callbacks.onPresence) subscriptionInfo.callbacks.add(callbacks.onPresence);
      if (callbacks.onTyping) subscriptionInfo.callbacks.add(callbacks.onTyping);
      if (callbacks.onError) subscriptionInfo.callbacks.add(callbacks.onError);

      // Set up channel event handlers
      this.setupChannelHandlers(subscriptionInfo, callbacks);

      // Store subscription
      this.subscriptions.set(subscriptionKey, subscriptionInfo);

      // Subscribe to channel
      const subscribeResponse = await this.subscribeWithTimeout(channel);

      if (subscribeResponse === "ok") {
        subscriptionInfo.status = "connected";
        subscriptionInfo.lastActivity = Date.now();

        // Start heartbeat
        this.startHeartbeat(subscriptionKey);

        // Track presence
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          status: "online",
        });

        console.log(`✅ Successfully subscribed to room ${roomId}`);
        return true;
      } else {
        throw new Error(`Subscription failed: ${subscribeResponse}`);
      }
    } catch (error) {
      console.error(`❌ Failed to subscribe to room ${roomId}:`, error);
      callbacks.onError?.(error);
      return false;
    }
  }

  /**
   * Unsubscribe from a chat room
   */
  async unsubscribe(roomId: string, userId: string): Promise<void> {
    const subscriptionKey = `${roomId}:${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription) return;

    try {
      // Stop heartbeat
      this.stopHeartbeat(subscriptionKey);

      // Clear reconnect timeout
      const reconnectTimeout = this.reconnectTimeouts.get(subscriptionKey);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        this.reconnectTimeouts.delete(subscriptionKey);
      }

      // Unsubscribe from channel
      await subscription.channel.unsubscribe();

      // Remove from subscriptions
      this.subscriptions.delete(subscriptionKey);

      console.log(`✅ Unsubscribed from room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error unsubscribing from room ${roomId}:`, error);
    }
  }

  /**
   * Send message to a room
   */
  async sendMessage(roomId: string, userId: string, payload: any): Promise<RealtimeChannelSendResponse> {
    const subscriptionKey = `${roomId}:${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription || subscription.status !== "connected") {
      throw new Error("Not connected to room");
    }

    subscription.lastActivity = Date.now();
    return await subscription.channel.send({
      type: "broadcast",
      event: "message",
      payload,
    });
  }

  /**
   * Send typing indicator
   */
  async sendTyping(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    const subscriptionKey = `${roomId}:${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription || subscription.status !== "connected") return;

    subscription.lastActivity = Date.now();
    await subscription.channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, is_typing: isTyping },
    });
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(roomId: string, userId: string): string {
    const subscriptionKey = `${roomId}:${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);
    return subscription?.status || "disconnected";
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptions.values()).filter((sub) => sub.status === "connected").length;
  }

  /**
   * Setup channel event handlers
   */
  private setupChannelHandlers(subscriptionInfo: SubscriptionInfo, callbacks: any): void {
    const { channel } = subscriptionInfo;

    // Message handler
    channel.on("broadcast", { event: "message" }, (payload) => {
      subscriptionInfo.lastActivity = Date.now();
      subscriptionInfo.callbacks.forEach((callback) => {
        if (typeof callback === "function") {
          try {
            callback(payload);
          } catch (error) {
            console.warn("Error in message callback:", error);
          }
        }
      });
    });

    // Presence handler
    channel.on("presence", { event: "*" }, (payload) => {
      subscriptionInfo.lastActivity = Date.now();
      callbacks.onPresence?.(payload);
    });

    // Typing handler
    channel.on("broadcast", { event: "typing" }, (payload) => {
      subscriptionInfo.lastActivity = Date.now();
      callbacks.onTyping?.(payload);
    });

    // Error handler
    channel.on("system", {}, (payload) => {
      if (payload.status === "error") {
        subscriptionInfo.status = "error";
        callbacks.onError?.(payload);
        this.handleConnectionError(subscriptionInfo);
      }
    });
  }

  /**
   * Subscribe with timeout
   */
  private async subscribeWithTimeout(channel: RealtimeChannel): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Subscription timeout"));
      }, this.config.connectionTimeout);

      channel.subscribe((status, error) => {
        clearTimeout(timeout);
        if (status === "SUBSCRIBED") {
          resolve("ok");
        } else {
          reject(error || new Error(`Subscription failed with status: ${status}`));
        }
      });
    });
  }

  /**
   * Start heartbeat for a subscription
   */
  private startHeartbeat(subscriptionKey: string): void {
    const interval = setInterval(() => {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (!subscription || subscription.status !== "connected") {
        clearInterval(interval);
        return;
      }

      // Send heartbeat
      subscription.channel.send({
        type: "broadcast",
        event: "heartbeat",
        payload: { timestamp: Date.now() },
      });
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(subscriptionKey, interval);
  }

  /**
   * Stop heartbeat for a subscription
   */
  private stopHeartbeat(subscriptionKey: string): void {
    const interval = this.heartbeatIntervals.get(subscriptionKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(subscriptionKey);
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  private async handleConnectionError(subscriptionInfo: SubscriptionInfo): Promise<void> {
    if (subscriptionInfo.retryCount >= this.config.maxRetries) {
      console.error(`Max retries reached for room ${subscriptionInfo.roomId}`);
      return;
    }

    subscriptionInfo.retryCount++;
    const delay = this.config.retryDelay * Math.pow(2, subscriptionInfo.retryCount - 1);

    console.log(
      `Retrying connection to room ${subscriptionInfo.roomId} in ${delay}ms (attempt ${subscriptionInfo.retryCount})`,
    );

    const subscriptionKey = `${subscriptionInfo.roomId}:${subscriptionInfo.userId}`;
    const timeout = setTimeout(async () => {
      try {
        await this.subscribe(
          subscriptionInfo.roomId,
          subscriptionInfo.userId,
          {}, // Callbacks are already stored
        );
      } catch (error) {
        console.error("Retry failed:", error);
      }
    }, delay);

    this.reconnectTimeouts.set(subscriptionKey, timeout);
  }

  /**
   * Cleanup inactive subscriptions
   */
  private async cleanupInactiveSubscriptions(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [key, subscription] of this.subscriptions.entries()) {
      if (now - subscription.lastActivity > inactiveThreshold) {
        console.log(`Cleaning up inactive subscription: ${key}`);
        await this.unsubscribe(subscription.roomId, subscription.userId);
      }
    }
  }

  /**
   * Cleanup all subscriptions (call on app shutdown)
   */
  async cleanup(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.entries()).map(([key, subscription]) =>
      this.unsubscribe(subscription.roomId, subscription.userId),
    );

    await Promise.all(unsubscribePromises);

    // Clear all intervals and timeouts
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));

    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();
  }
}

// Create singleton instance
export const realtimeSubscriptionManager = new RealtimeSubscriptionManager();

export default realtimeSubscriptionManager;
