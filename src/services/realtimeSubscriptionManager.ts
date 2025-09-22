/**
 * Production-Optimized Real-time Subscription Manager
 * Manages Supabase real-time subscriptions with advanced connection pooling,
 * automatic reconnection, resource optimization, and production monitoring
 */

import { RealtimeChannel, RealtimeChannelSendResponse } from "@supabase/supabase-js";
import supabase, { trackConnection, getConnectionMetrics, checkRateLimit } from "../config/supabase";
import { AppError, ErrorType } from "../utils/errorHandling";
import {
  validateSubscriptionState,
  checkQuotaLimits,
  trackPerformanceMetrics,
  optimizeConnectionSharing,
  checkConnectionHealth,
  classifyError,
} from "../utils/realtimeUtils";

interface SubscriptionConfig {
  maxRetries: number;
  retryDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxConcurrentSubscriptions: number;
  // Production-specific configurations
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  enableMetrics: boolean;
  enablePerformanceTracking: boolean;
  memoryThreshold: number; // MB
  connectionPoolSize: number;
  enableQuotaMonitoring?: boolean;
  healthCheckInterval?: number;
  enableConnectionSharing?: boolean;
  quotaResetInterval?: number;
  priorityQueueEnabled?: boolean;
}

interface SubscriptionInfo {
  channel: RealtimeChannel;
  roomId: string;
  userId: string;
  callbacks: Set<Function>;
  retryCount: number;
  lastActivity: number;
  status:
    | "connecting"
    | "connected"
    | "disconnected"
    | "error"
    | "circuit-breaker"
    | "subscribed"
    | "channel-error"
    | "timed-out"
    | "closed";
  // Production monitoring fields
  createdAt: number;
  messagesReceived: number;
  messagesSent: number;
  lastError?: AppError;
  lastHealthCheck: number;
  quotaUsage: number;
  priority: "high" | "normal" | "low";
  sharedConnections: Set<string>;
  performanceMetrics: {
    averageLatency: number;
    totalMessages: number;
    errorCount: number;
    lastMessageTime: number;
    messageRate: number;
    errorRate: number;
  };
}

class RealtimeSubscriptionManager {
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private connectionPool: Map<string, RealtimeChannel> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Production monitoring and circuit breaker
  private circuitBreakerState: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();
  private quotaMonitor = {
    messageCount: 0,
    lastReset: Date.now(),
    warningThreshold: 1800000, // 1.8M messages (90% of 2M free tier limit)
    criticalThreshold: 1950000, // 1.95M messages (97.5% of 2M free tier limit)
  };
  private performanceMetrics = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalMessages: 0,
    totalErrors: 0,
    averageLatency: 0,
    memoryUsage: 0,
    quotaUsagePercentage: 0,
    healthyConnections: 0,
  };
  private connectionSharing: Map<string, Set<string>> = new Map();

  private config: SubscriptionConfig = {
    maxRetries: 5,
    retryDelay: 1000,
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 10000, // 10 seconds
    maxConcurrentSubscriptions: typeof __DEV__ !== "undefined" && __DEV__ ? 10 : 50, // Higher limit for production
    // Production-specific configurations
    enableCircuitBreaker: typeof __DEV__ === "undefined" || !__DEV__,
    circuitBreakerThreshold: 5,
    enableMetrics: typeof __DEV__ === "undefined" || !__DEV__,
    enablePerformanceTracking: typeof __DEV__ === "undefined" || !__DEV__,
    memoryThreshold: 100, // 100MB
    connectionPoolSize: typeof __DEV__ !== "undefined" && __DEV__ ? 5 : 20,
    enableQuotaMonitoring: typeof __DEV__ === "undefined" || !__DEV__,
    enableConnectionSharing: typeof __DEV__ === "undefined" || !__DEV__,
    healthCheckInterval: 60000, // 1 minute
    quotaResetInterval: 2592000000, // 30 days in milliseconds
    priorityQueueEnabled: typeof __DEV__ === "undefined" || !__DEV__,
  };

  constructor(config?: Partial<SubscriptionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Start cleanup interval
    setInterval(() => this.cleanupInactiveSubscriptions(), 60000); // Every minute

    // Start performance monitoring in production
    if (this.config.enablePerformanceTracking) {
      setInterval(() => this.updatePerformanceMetrics(), 30000); // Every 30 seconds
    }

    // Start memory monitoring
    if (this.config.enableMetrics) {
      setInterval(() => this.checkMemoryUsage(), 120000); // Every 2 minutes
    }

    // Start quota monitoring
    if (this.config.enableQuotaMonitoring) {
      setInterval(() => this.updateQuotaUsage(), 300000); // Every 5 minutes
    }

    // Start health monitoring
    if (this.config.enableMetrics) {
      setInterval(() => this.performHealthChecks(), this.config.healthCheckInterval);
    }
  }

  /**
   * Subscribe to a chat room with production-optimized connection management
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
    const subscriptionKey = `${roomId}:${userId}`;

    try {
      // Validate subscription state before proceeding
      if (!validateSubscriptionState(subscriptionKey, this.subscriptions)) {
        const error = new AppError(
          "Invalid subscription state",
          ErrorType.VALIDATION,
          "INVALID_SUBSCRIPTION_STATE",
          400,
          true,
        );
        callbacks.onError?.(error);
        return false;
      }

      // Check quota limits
      const quotaStatus = checkQuotaLimits(this.quotaMonitor);
      if (!quotaStatus.allowed) {
        const error = new AppError(
          `Quota limit exceeded: ${quotaStatus.reason}`,
          ErrorType.SERVER,
          "QUOTA_EXCEEDED",
          429,
          true,
        );
        callbacks.onError?.(error);
        return false;
      }

      // Production rate limiting check
      if (!checkRateLimit()) {
        const error = new AppError("Rate limit exceeded", ErrorType.SERVER, "RATE_LIMIT_EXCEEDED", 429, true);
        callbacks.onError?.(error);
        return false;
      }

      // Circuit breaker check
      if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen(subscriptionKey)) {
        const error = new AppError("Circuit breaker is open", ErrorType.SERVER, "CIRCUIT_BREAKER_OPEN", 503, true);
        callbacks.onError?.(error);
        return false;
      }

      // Check if we're at the subscription limit
      if (this.subscriptions.size >= this.config.maxConcurrentSubscriptions) {
        await this.cleanupInactiveSubscriptions();

        if (this.subscriptions.size >= this.config.maxConcurrentSubscriptions) {
          // Try connection sharing before failing
          const sharedConnection = optimizeConnectionSharing(roomId, this.connectionSharing, this.subscriptions);
          if (!sharedConnection) {
            const error = new AppError(
              "Maximum concurrent subscriptions reached",
              ErrorType.SERVER,
              "MAX_SUBSCRIPTIONS_REACHED",
              503,
              true,
            );
            callbacks.onError?.(error);
            return false;
          }
        }
      }

      // Check if subscription already exists
      const existing = this.subscriptions.get(subscriptionKey);
      if (existing && existing.status === "connected") {
        // Add callbacks to existing subscription
        if (callbacks.onMessage) existing.callbacks.add(callbacks.onMessage);
        if (callbacks.onPresence) existing.callbacks.add(callbacks.onPresence);
        if (callbacks.onTyping) existing.callbacks.add(callbacks.onTyping);
        if (callbacks.onError) existing.callbacks.add(callbacks.onError);

        // Update activity timestamp
        existing.lastActivity = Date.now();

        if (this.config.enableMetrics) {
        }

        return true;
      }

      // Try to reuse existing connection if sharing is enabled
      let channel: RealtimeChannel;
      const sharedConnectionKey = this.config.enableConnectionSharing
        ? optimizeConnectionSharing(roomId, this.connectionSharing, this.subscriptions)
        : null;

      if (sharedConnectionKey && this.subscriptions.has(sharedConnectionKey)) {
        // Reuse existing connection
        const sharedSub = this.subscriptions.get(sharedConnectionKey)!;
        channel = sharedSub.channel;
      } else {
        // Create new subscription
        channel = supabase.channel(`room:${roomId}`, {
          config: {
            presence: { key: userId },
            broadcast: { self: true },
          },
        });
      }

      const subscriptionInfo: SubscriptionInfo = {
        channel,
        roomId,
        userId,
        callbacks: new Set(),
        retryCount: 0,
        lastActivity: Date.now(),
        status: "connecting",
        createdAt: Date.now(),
        messagesReceived: 0,
        messagesSent: 0,
        lastHealthCheck: Date.now(),
        quotaUsage: 0,
        priority: "normal",
        sharedConnections: new Set(),
        performanceMetrics: {
          averageLatency: 0,
          totalMessages: 0,
          errorCount: 0,
          lastMessageTime: 0,
          messageRate: 0,
          errorRate: 0,
        },
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

      if (subscribeResponse === "ok" || subscribeResponse === "SUBSCRIBED") {
        subscriptionInfo.status = "subscribed";
        subscriptionInfo.lastActivity = Date.now();
        subscriptionInfo.lastHealthCheck = Date.now();

        // Update connection sharing if enabled
        if (this.config.enableConnectionSharing) {
          this.updateConnectionSharing(roomId, subscriptionKey);
        }

        // Start heartbeat
        this.startHeartbeat(subscriptionKey);

        // Track presence
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          status: "online",
        });

        // Track performance metrics
        trackPerformanceMetrics(subscriptionInfo, "subscription_created");

        // Update quota usage
        this.quotaMonitor.messageCount++;

        return true;
      } else {
        const classifiedError = classifyError(subscribeResponse);
        this.recordCircuitBreakerFailure(subscriptionKey);
        throw new AppError(
          `Subscription failed: ${subscribeResponse}`,
          classifiedError.type,
          classifiedError.code,
          classifiedError.statusCode,
          classifiedError.retryable,
        );
      }
    } catch (error) {
      console.error(`❌ Failed to subscribe to room ${roomId}:`, error);

      // Classify and handle error appropriately
      const classifiedError = classifyError(error);
      this.recordCircuitBreakerFailure(subscriptionKey);

      // Update performance metrics
      const subscription = this.subscriptions.get(subscriptionKey);
      if (subscription) {
        subscription.performanceMetrics.errorCount++;
        subscription.lastError = classifiedError;
        trackPerformanceMetrics(subscription, "subscription_error");
      }

      callbacks.onError?.(classifiedError);
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

      // Update connection sharing
      if (this.config.enableConnectionSharing) {
        this.removeFromConnectionSharing(subscriptionKey);
      }

      // Unsubscribe from channel only if no other subscriptions are using it
      const isSharedConnection = Array.from(this.subscriptions.values()).some(
        (sub) => sub.channel === subscription.channel && sub !== subscription,
      );

      if (!isSharedConnection) {
        await subscription.channel.unsubscribe();
      }

      // Track performance metrics before removal
      trackPerformanceMetrics(subscription, "subscription_removed");

      // Remove from subscriptions
      this.subscriptions.delete(subscriptionKey);
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
    subscription.messagesSent++;
    subscription.quotaUsage++;
    this.quotaMonitor.messageCount++;

    // Track performance metrics
    const startTime = Date.now();
    const result = await subscription.channel.send({
      type: "broadcast",
      event: "message",
      payload,
    });

    // Update performance metrics
    const latency = Date.now() - startTime;
    subscription.performanceMetrics.averageLatency = (subscription.performanceMetrics.averageLatency + latency) / 2;
    subscription.performanceMetrics.totalMessages++;
    subscription.performanceMetrics.lastMessageTime = Date.now();

    trackPerformanceMetrics(subscription, "message_sent", { latency });

    return result;
  }

  /**
   * Send typing indicator
   */
  async sendTyping(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    const subscriptionKey = `${roomId}:${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (!subscription || subscription.status !== "connected") return;

    subscription.lastActivity = Date.now();
    subscription.quotaUsage++;
    this.quotaMonitor.messageCount++;

    await subscription.channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, is_typing: isTyping },
    });

    // Track performance metrics
    trackPerformanceMetrics(subscription, "typing_sent");
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
    channel.on("broadcast", { event: "message" }, (payload: any) => {
      subscriptionInfo.lastActivity = Date.now();
      subscriptionInfo.messagesReceived++;
      subscriptionInfo.performanceMetrics.totalMessages++;
      subscriptionInfo.performanceMetrics.lastMessageTime = Date.now();

      // Update message rate (messages per minute)
      const now = Date.now();
      const timeDiff = now - subscriptionInfo.createdAt;
      subscriptionInfo.performanceMetrics.messageRate =
        subscriptionInfo.performanceMetrics.totalMessages / (timeDiff / 60000);

      subscriptionInfo.callbacks.forEach((callback) => {
        if (typeof callback === "function") {
          try {
            callback(payload);
          } catch (error) {
            subscriptionInfo.performanceMetrics.errorCount++;
            subscriptionInfo.performanceMetrics.errorRate =
              subscriptionInfo.performanceMetrics.errorCount / subscriptionInfo.performanceMetrics.totalMessages;
          }
        }
      });

      // Track performance metrics
      trackPerformanceMetrics(subscriptionInfo, "message_received");
    });

    // Presence handlers (register explicit events for correct typings)
    channel.on("presence", { event: "sync" }, () => {
      subscriptionInfo.lastActivity = Date.now();
      const state = (channel as any).presenceState ? (channel as any).presenceState() : null;
      callbacks.onPresence?.({ type: "sync", state });
    });

    channel.on("presence", { event: "join" }, (payload: any) => {
      subscriptionInfo.lastActivity = Date.now();
      callbacks.onPresence?.({ type: "join", payload });
    });

    channel.on("presence", { event: "leave" }, (payload: any) => {
      subscriptionInfo.lastActivity = Date.now();
      callbacks.onPresence?.({ type: "leave", payload });
    });

    // Typing handler
    channel.on("broadcast", { event: "typing" }, (payload: any) => {
      subscriptionInfo.lastActivity = Date.now();
      callbacks.onTyping?.(payload);
    });

    // Enhanced error handler with state validation
    channel.on("system", {}, (payload: any) => {
      if (payload.status === "error" || payload.status === "CHANNEL_ERROR" || payload.status === "TIMED_OUT") {
        const newStatus =
          payload.status === "CHANNEL_ERROR" ? "channel-error" : payload.status === "TIMED_OUT" ? "timed-out" : "error";

        subscriptionInfo.status = newStatus;
        subscriptionInfo.performanceMetrics.errorCount++;

        const classifiedError = classifyError(payload);
        subscriptionInfo.lastError = classifiedError;

        // Update error rate
        subscriptionInfo.performanceMetrics.errorRate =
          subscriptionInfo.performanceMetrics.errorCount /
          Math.max(subscriptionInfo.performanceMetrics.totalMessages, 1);

        // Track performance metrics
        trackPerformanceMetrics(subscriptionInfo, "system_error", { error: classifiedError });

        callbacks.onError?.(classifiedError);
        this.handleConnectionError(subscriptionInfo);
      } else if (payload.status === "CLOSED") {
        subscriptionInfo.status = "closed";
        trackPerformanceMetrics(subscriptionInfo, "connection_closed");
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
   * Connection sharing optimization methods
   */
  private updateConnectionSharing(roomId: string, subscriptionKey: string): void {
    if (!this.connectionSharing.has(roomId)) {
      this.connectionSharing.set(roomId, new Set());
    }
    this.connectionSharing.get(roomId)!.add(subscriptionKey);
  }

  private removeFromConnectionSharing(subscriptionKey: string): void {
    for (const [roomId, connections] of this.connectionSharing.entries()) {
      connections.delete(subscriptionKey);
      if (connections.size === 0) {
        this.connectionSharing.delete(roomId);
      }
    }
  }

  /**
   * Subscription state validation
   */
  private validateSubscriptionStates(): void {
    for (const [key, subscription] of this.subscriptions.entries()) {
      if (!validateSubscriptionState(key, this.subscriptions)) {
        subscription.status = "error";
      }
    }
  }

  /**
   * Enhanced cleanup with priority and health-based decisions
   */
  private async cleanupInactiveSubscriptions(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    const cleanupCandidates: { key: string; subscription: SubscriptionInfo; priority: number }[] = [];

    for (const [key, subscription] of this.subscriptions.entries()) {
      const inactiveTime = now - subscription.lastActivity;
      const errorRate = subscription.performanceMetrics.errorRate;
      const isUnhealthy = errorRate > 0.1; // More than 10% error rate
      const hasRecentErrors = subscription.lastError && now - subscription.createdAt < 300000; // 5 minutes

      if (inactiveTime > inactiveThreshold || isUnhealthy || hasRecentErrors) {
        // Calculate cleanup priority (higher = more likely to be cleaned up)
        let priority = inactiveTime / inactiveThreshold; // Base priority on inactivity
        if (isUnhealthy) priority += 2; // Boost priority for unhealthy connections
        if (hasRecentErrors) priority += 1; // Boost priority for recent errors
        if (subscription.priority === "low") priority += 0.5; // Boost priority for low-priority subs

        cleanupCandidates.push({ key, subscription, priority });
      }
    }

    // Sort by priority (highest first) and clean up
    cleanupCandidates
      .sort((a, b) => b.priority - a.priority)
      .slice(0, Math.ceil(cleanupCandidates.length * 0.3)) // Clean up max 30% at once
      .forEach(async ({ key, subscription }) => {
        console.log(`Cleaning up inactive subscription for ${key}`);
        await this.unsubscribe(subscription.roomId, subscription.userId);
      });
  }

  /**
   * Health monitoring methods
   */
  private async performHealthChecks(): Promise<void> {
    const now = Date.now();
    const healthCheckPromises: Promise<void>[] = [];

    for (const [key, subscription] of this.subscriptions.entries()) {
      // Skip if recently checked
      if (now - subscription.lastHealthCheck < (this.config.healthCheckInterval ?? 30000) / 2) {
        continue;
      }

      const healthCheckPromise = this.performSingleHealthCheck(key, subscription);
      healthCheckPromises.push(healthCheckPromise);
    }

    await Promise.allSettled(healthCheckPromises);
    this.updateHealthMetrics();
  }

  private async performSingleHealthCheck(key: string, subscription: SubscriptionInfo): Promise<void> {
    try {
      subscription.lastHealthCheck = Date.now();

      // Check connection health
      const isHealthy = await checkConnectionHealth(subscription.channel);

      if (!isHealthy) {
        subscription.status = "error";
        subscription.performanceMetrics.errorCount++;

        // Attempt recovery for critical connections
        if (subscription.priority === "high") {
          await this.handleConnectionError(subscription);
        }
      }
    } catch (error) {
      console.error(`[RealtimeManager] Health check failed for ${key}:`, error);
      subscription.performanceMetrics.errorCount++;
    }
  }

  private updateHealthMetrics(): void {
    let healthyCount = 0;
    for (const subscription of this.subscriptions.values()) {
      if (subscription.status === "subscribed" || subscription.status === "connected") {
        healthyCount++;
      }
    }
    this.performanceMetrics.healthyConnections = healthyCount;
  }

  /**
   * Quota monitoring methods
   */
  private updateQuotaUsage(): void {
    // Reset quota counter monthly
    const now = Date.now();
    if (now - this.quotaMonitor.lastReset > (this.config.quotaResetInterval ?? 2592000000)) {
      this.quotaMonitor.messageCount = 0;
      this.quotaMonitor.lastReset = now;
    }

    // Calculate usage percentage
    const maxMessages = 2000000; // 2M free tier limit
    this.performanceMetrics.quotaUsagePercentage = (this.quotaMonitor.messageCount / maxMessages) * 100;

    // Issue warnings
    if (this.quotaMonitor.messageCount > this.quotaMonitor.criticalThreshold) {
      console.error(
        `[RealtimeManager] CRITICAL: Quota usage at ${this.performanceMetrics.quotaUsagePercentage.toFixed(1)}%`,
      );
    } else if (this.quotaMonitor.messageCount > this.quotaMonitor.warningThreshold) {
      console.warn(
        `[RealtimeManager] Warning: Quota usage at ${this.performanceMetrics.quotaUsagePercentage.toFixed(1)}%`,
      );
    }
  }

  /**
   * Enhanced cleanup with comprehensive resource management
   */
  async cleanup(): Promise<void> {
    // Prioritize cleanup by subscription priority
    const subscriptionEntries = Array.from(this.subscriptions.entries()).sort(([, a], [, b]) => {
      const priorityOrder = { low: 0, normal: 1, high: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Batch unsubscribe in chunks to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < subscriptionEntries.length; i += batchSize) {
      const batch = subscriptionEntries.slice(i, i + batchSize);
      const unsubscribePromises = batch.map(([key, subscription]) =>
        this.unsubscribe(subscription.roomId, subscription.userId),
      );

      await Promise.allSettled(unsubscribePromises);

      // Small delay between batches to prevent overwhelming the server
      if (i + batchSize < subscriptionEntries.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Clear all intervals and timeouts
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));

    // Clear all maps and sets
    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();
    this.circuitBreakerState.clear();
    this.connectionSharing.clear();
    this.connectionPool.clear();
  }

  /**
   * Production monitoring methods
   */

  // Circuit breaker implementation
  private isCircuitBreakerOpen(subscriptionKey: string): boolean {
    if (!this.config.enableCircuitBreaker) return false;

    const state = this.circuitBreakerState.get(subscriptionKey);
    if (!state) return false;

    // Check if circuit breaker should be reset (after 60 seconds)
    if (state.isOpen && Date.now() - state.lastFailure > 60000) {
      state.isOpen = false;
      state.failures = 0;
    }

    return state.isOpen;
  }

  private recordCircuitBreakerFailure(subscriptionKey: string): void {
    if (!this.config.enableCircuitBreaker) return;

    let state = this.circuitBreakerState.get(subscriptionKey);
    if (!state) {
      state = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitBreakerState.set(subscriptionKey, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.isOpen = true;
    }
  }

  // Performance monitoring
  private updatePerformanceMetrics(): void {
    if (!this.config.enablePerformanceTracking) return;

    this.performanceMetrics.activeSubscriptions = this.subscriptions.size;

    let totalLatency = 0;
    let totalMessages = 0;
    let totalErrors = 0;

    for (const subscription of this.subscriptions.values()) {
      totalLatency += subscription.performanceMetrics.averageLatency;
      totalMessages += subscription.performanceMetrics.totalMessages;
      totalErrors += subscription.performanceMetrics.errorCount;
    }

    this.performanceMetrics.averageLatency = this.subscriptions.size > 0 ? totalLatency / this.subscriptions.size : 0;
    this.performanceMetrics.totalMessages = totalMessages;
    this.performanceMetrics.totalErrors = totalErrors;

    if (this.config.enableMetrics) {
    }
  }

  // Memory monitoring
  private checkMemoryUsage(): void {
    if (!this.config.enableMetrics) return;

    // Estimate memory usage (rough calculation)
    const subscriptionMemory = this.subscriptions.size * 1024; // ~1KB per subscription
    const callbackMemory = Array.from(this.subscriptions.values()).reduce(
      (total, sub) => total + sub.callbacks.size * 100,
      0,
    ); // ~100 bytes per callback

    const totalMemoryKB = (subscriptionMemory + callbackMemory) / 1024;
    this.performanceMetrics.memoryUsage = totalMemoryKB;

    if (totalMemoryKB > this.config.memoryThreshold * 1024) {
      // Convert MB to KB
      console.warn(`[RealtimeManager] Memory usage warning: ${totalMemoryKB}KB`);

      // Trigger aggressive cleanup
      this.cleanupInactiveSubscriptions();
    }
  }

  /**
   * Subscription priority management
   */
  setSubscriptionPriority(roomId: string, userId: string, priority: "high" | "normal" | "low"): void {
    const subscriptionKey = `${roomId}:${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.priority = priority;
    }
  }

  /**
   * Get comprehensive production metrics
   */
  getProductionMetrics() {
    return {
      ...this.performanceMetrics,
      quotaStatus: {
        messageCount: this.quotaMonitor.messageCount,
        usagePercentage: this.performanceMetrics.quotaUsagePercentage,
        warningThreshold: this.quotaMonitor.warningThreshold,
        criticalThreshold: this.quotaMonitor.criticalThreshold,
        lastReset: this.quotaMonitor.lastReset,
      },
      subscriptionDetails: Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
        key,
        status: sub.status,
        priority: sub.priority,
        messagesReceived: sub.messagesReceived,
        messagesSent: sub.messagesSent,
        quotaUsage: sub.quotaUsage,
        lastActivity: sub.lastActivity,
        lastHealthCheck: sub.lastHealthCheck,
        uptime: Date.now() - sub.createdAt,
        errorCount: sub.performanceMetrics.errorCount,
        errorRate: sub.performanceMetrics.errorRate,
        messageRate: sub.performanceMetrics.messageRate,
        averageLatency: sub.performanceMetrics.averageLatency,
        sharedConnections: sub.sharedConnections.size,
        lastError: sub.lastError
          ? {
              message: sub.lastError.message,
              code: sub.lastError.code,
              type: sub.lastError.type,
            }
          : null,
      })),
      circuitBreakerStates: Array.from(this.circuitBreakerState.entries()).map(([key, state]) => ({
        key,
        failures: state.failures,
        isOpen: state.isOpen,
        lastFailure: state.lastFailure,
      })),
      connectionSharing: Array.from(this.connectionSharing.entries()).map(([roomId, connections]) => ({
        roomId,
        connectionCount: connections.size,
        connections: Array.from(connections),
      })),
      connectionMetrics: getConnectionMetrics(),
    };
  }

  /**
   * Get subscription analytics for monitoring dashboards
   */
  getSubscriptionAnalytics() {
    const analytics = {
      totalSubscriptions: this.subscriptions.size,
      healthySubscriptions: this.performanceMetrics.healthyConnections,
      subscriptionsByStatus: {} as Record<string, number>,
      subscriptionsByPriority: { high: 0, normal: 0, low: 0 },
      averageUptime: 0,
      averageMessageRate: 0,
      averageErrorRate: 0,
      topErrorTypes: {} as Record<string, number>,
    };

    const now = Date.now();
    let totalUptime = 0;
    let totalMessageRate = 0;
    let totalErrorRate = 0;

    for (const subscription of this.subscriptions.values()) {
      // Count by status
      analytics.subscriptionsByStatus[subscription.status] =
        (analytics.subscriptionsByStatus[subscription.status] || 0) + 1;

      // Count by priority
      analytics.subscriptionsByPriority[subscription.priority]++;

      // Calculate averages
      const uptime = now - subscription.createdAt;
      totalUptime += uptime;
      totalMessageRate += subscription.performanceMetrics.messageRate;
      totalErrorRate += subscription.performanceMetrics.errorRate;

      // Track error types
      if (subscription.lastError) {
        const errorType = subscription.lastError.code || "UNKNOWN";
        analytics.topErrorTypes[errorType] = (analytics.topErrorTypes[errorType] || 0) + 1;
      }
    }

    if (this.subscriptions.size > 0) {
      analytics.averageUptime = totalUptime / this.subscriptions.size;
      analytics.averageMessageRate = totalMessageRate / this.subscriptions.size;
      analytics.averageErrorRate = totalErrorRate / this.subscriptions.size;
    }

    return analytics;
  }
}

// Create singleton instance
/**
 * Enhanced configuration interface
 */
export interface EnhancedSubscriptionConfig extends SubscriptionConfig {
  enableQuotaMonitoring?: boolean;
  enableConnectionSharing?: boolean;
  healthCheckInterval?: number;
  quotaResetInterval?: number;
  priorityQueueEnabled?: boolean;
}

// Create singleton instance with enhanced configuration
export const realtimeSubscriptionManager = new RealtimeSubscriptionManager();

export default realtimeSubscriptionManager;
