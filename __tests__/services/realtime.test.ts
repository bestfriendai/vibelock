/**
 * Comprehensive Test Suite for Supabase Realtime v2.57.4 Compatibility
 *
 * This test suite covers:
 * - Connection pooling and resource management
 * - Subscription lifecycle and state transitions
 * - Error handling and recovery mechanisms
 * - Performance monitoring and metrics
 * - Quota monitoring and throttling
 * - Circuit breaker functionality
 * - Health monitoring and diagnostics
 * - Integration between services
 * - Edge cases and boundary conditions
 * - Production scenarios and configurations
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";
import { RealtimeChannel } from "@supabase/supabase-js";
import { realtimeSubscriptionManager } from "../../src/services/realtimeSubscriptionManager";
import { enhancedRealtimeChatService } from "../../src/services/realtimeChat";
import {
  validateSubscriptionState,
  checkQuotaLimits,
  trackPerformanceMetrics,
  checkConnectionHealth,
  classifyError,
  optimizeConnectionSharing,
  validateSupabaseCompatibility,
  getRealtimeAnalytics,
  resetAnalytics,
} from "../../src/utils/realtimeUtils";
import { AppError, ErrorType } from "../../src/utils/errorHandling";

// Mock Supabase
const mockChannel = {
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  send: jest.fn(),
  track: jest.fn(),
  on: jest.fn(),
  presenceState: jest.fn(() => ({})),
  state: "joined",
  topic: "test-topic",
  socket: { readyState: 1 },
} as unknown as RealtimeChannel;

const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

// Mock config/supabase
jest.mock("../../src/config/supabase", () => ({
  supabase: mockSupabase,
  trackConnection: jest.fn(),
  getConnectionMetrics: jest.fn(() => ({ connected: true, latency: 50 })),
  checkRateLimit: jest.fn(() => true),
}));

// Mock console methods to reduce test noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe("Supabase Realtime v2.57.4 Compatibility Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAnalytics();
  });

  afterEach(async () => {
    // Cleanup any active subscriptions
    await realtimeSubscriptionManager.cleanup();
    await enhancedRealtimeChatService.cleanup();
  });

  describe("Connection Pooling Tests", () => {
    it("should efficiently manage connection pool resources", async () => {
      const roomId = "test-room-pooling";
      const userId = "user-1";

      // Mock successful subscription
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      expect(result).toBe(true);
      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBe(1);

      // Test connection reuse
      const result2 = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      expect(result2).toBe(true);
      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBe(1); // Should reuse
    });

    it("should optimize connection sharing for similar subscriptions", () => {
      const roomId = "shared-room";
      const connectionSharing = new Map([["shared-room", new Set(["connection-1", "connection-2"])]]);

      const subscriptions = new Map([
        ["connection-1", { status: "subscribed", lastActivity: Date.now() - 60000 }], // 1 min ago
        ["connection-2", { status: "connected", lastActivity: Date.now() - 30000 }], // 30 sec ago
      ]);

      const sharedConnection = optimizeConnectionSharing(roomId, connectionSharing, subscriptions);
      expect(sharedConnection).toBe("connection-2"); // More recent activity
    });

    it("should handle connection pool cleanup efficiently", async () => {
      const roomIds = ["room-1", "room-2", "room-3"];
      const userId = "test-user";

      // Mock subscriptions
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      // Create multiple subscriptions
      for (const roomId of roomIds) {
        await realtimeSubscriptionManager.subscribe(roomId, userId, {
          onMessage: jest.fn(),
        });
      }

      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBe(3);

      // Test cleanup
      await realtimeSubscriptionManager.cleanup();
      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBe(0);
    });

    it("should respect connection pool size limits", async () => {
      const maxConnections = 2;
      const manager = new (realtimeSubscriptionManager.constructor as any)({
        maxConcurrentSubscriptions: maxConnections,
      });

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      // Try to create more subscriptions than the limit
      const promises = [];
      for (let i = 0; i < maxConnections + 1; i++) {
        promises.push(manager.subscribe(`room-${i}`, "user", { onMessage: jest.fn() }));
      }

      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === "fulfilled" && r.value === true).length;

      expect(successCount).toBeLessThanOrEqual(maxConnections);
    });
  });

  describe("Subscription Management Tests", () => {
    it("should validate subscription state transitions", () => {
      const subscriptionKey = "room:test-room";
      const subscriptions = new Map();

      // Test valid subscription key
      expect(validateSubscriptionState(subscriptionKey, subscriptions)).toBe(true);

      // Test invalid subscription key
      expect(validateSubscriptionState("", subscriptions)).toBe(false);
      expect(validateSubscriptionState(null as any, subscriptions)).toBe(false);

      // Test duplicate subscription detection
      subscriptions.set(subscriptionKey, { status: "connected" });
      expect(validateSubscriptionState(subscriptionKey, subscriptions)).toBe(true); // Should allow reuse
    });

    it("should handle subscription lifecycle correctly", async () => {
      const roomId = "lifecycle-room";
      const userId = "lifecycle-user";
      const userName = "Test User";

      let subscriptionCallback: Function | null = null;
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      // Mock channel event listeners
      const eventHandlers = new Map<string, Function>();
      (mockChannel.on as jest.Mock).mockImplementation((type, config, handler) => {
        if (typeof config === "function") {
          eventHandlers.set(type, config);
        } else {
          eventHandlers.set(`${type}-${config.event}`, handler);
        }
        return mockChannel;
      });

      // Start joining room
      const joinPromise = enhancedRealtimeChatService.joinRoom(roomId, userId, userName);

      // Simulate successful subscription
      setTimeout(() => {
        if (subscriptionCallback) {
          subscriptionCallback("SUBSCRIBED");
        }
      }, 10);

      const channel = await joinPromise;
      expect(channel).toBe(mockChannel);
      expect(enhancedRealtimeChatService.getActiveChannelsCount()).toBe(1);

      // Test leaving room
      await enhancedRealtimeChatService.leaveRoom(roomId);
      expect(enhancedRealtimeChatService.getActiveChannelsCount()).toBe(0);
    });

    it("should handle subscription errors appropriately", async () => {
      const roomId = "error-room";
      const userId = "error-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("CHANNEL_ERROR", new Error("Test error")), 10);
      });

      const onError = jest.fn();
      const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onError,
      });

      expect(result).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it("should manage subscription state transitions correctly", async () => {
      const roomId = "state-room";
      const userId = "state-user";
      const userName = "State User";

      let subscriptionCallback: Function | null = null;
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      const joinPromise = enhancedRealtimeChatService.joinRoom(roomId, userId, userName);

      // Test different state transitions
      const states = ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"];

      for (const state of states) {
        setTimeout(() => {
          if (subscriptionCallback) {
            subscriptionCallback(state, state === "CHANNEL_ERROR" ? new Error("Test") : undefined);
          }
        }, 10);

        if (state === "SUBSCRIBED") {
          await joinPromise;
          break;
        }
      }

      expect(enhancedRealtimeChatService.getActiveChannelsCount()).toBe(1);
    });
  });

  describe("Error Handling Tests", () => {
    it("should classify errors correctly", () => {
      // Test network error
      const networkError = new Error("network timeout");
      const classifiedNetwork = classifyError(networkError);
      expect(classifiedNetwork.type).toBe(ErrorType.NETWORK);
      expect(classifiedNetwork.retryable).toBe(true);

      // Test quota error
      const quotaError = { code: 429, message: "rate limit exceeded" };
      const classifiedQuota = classifyError(quotaError);
      expect(classifiedQuota.code).toBe("QUOTA_EXCEEDED");
      expect(classifiedQuota.retryable).toBe(false);

      // Test permission error
      const permissionError = { code: 403, message: "unauthorized access" };
      const classifiedPermission = classifyError(permissionError);
      expect(classifiedPermission.type).toBe(ErrorType.VALIDATION);
      expect(classifiedPermission.retryable).toBe(false);
    });

    it("should handle different error types in subscription manager", async () => {
      const roomId = "error-test-room";
      const userId = "error-test-user";

      // Test network error
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("TIMED_OUT"), 10);
      });

      const onError = jest.fn();
      const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onError,
      });

      expect(result).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it("should implement circuit breaker correctly", async () => {
      const manager = new (realtimeSubscriptionManager.constructor as any)({
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
      });

      const roomId = "circuit-room";
      const userId = "circuit-user";

      // Mock consistent failures
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("CHANNEL_ERROR", new Error("Consistent failure")), 10);
      });

      // Trigger failures to open circuit breaker
      for (let i = 0; i < 3; i++) {
        const result = await manager.subscribe(roomId, userId, {
          onError: jest.fn(),
        });
        expect(result).toBe(false);
      }

      // Subsequent attempts should be blocked by circuit breaker
      const onError = jest.fn();
      const result = await manager.subscribe(roomId, userId, { onError });
      expect(result).toBe(false);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "CIRCUIT_BREAKER_OPEN",
        }),
      );
    });

    it("should recover from transient errors", async () => {
      const roomId = "recovery-room";
      const userId = "recovery-user";

      let attemptCount = 0;
      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        attemptCount++;
        if (attemptCount < 3) {
          setTimeout(() => callback("CHANNEL_ERROR", new Error("Transient error")), 10);
        } else {
          setTimeout(() => callback("SUBSCRIBED"), 10);
        }
      });

      const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      // Should eventually succeed after retries
      expect(result).toBe(true);
    });
  });

  describe("Performance Tests", () => {
    it("should track performance metrics correctly", () => {
      const context = {
        subscriptionKey: "test-subscription",
        performanceMetrics: {
          totalMessages: 0,
          errorCount: 0,
          averageLatency: 0,
        },
      };

      // Track message received
      trackPerformanceMetrics(context, "message_received", { latency: 100 });
      expect(context.performanceMetrics.totalMessages).toBe(1);
      expect(context.performanceMetrics.averageLatency).toBe(100);

      // Track error
      trackPerformanceMetrics(context, "subscription_error");
      expect(context.performanceMetrics.errorCount).toBe(1);
    });

    it("should handle high message throughput", async () => {
      const roomId = "throughput-room";
      const userId = "throughput-user";
      const userName = "Throughput User";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      let messageHandler: Function | null = null;
      (mockChannel.on as jest.Mock).mockImplementation((type, config, handler) => {
        if (type === "postgres_changes" && config.event === "INSERT") {
          messageHandler = handler;
        }
        return mockChannel;
      });

      await enhancedRealtimeChatService.joinRoom(roomId, userId, userName);

      // Simulate rapid message arrival
      const messageCount = 100;
      const messages: any[] = [];

      for (let i = 0; i < messageCount; i++) {
        messages.push({
          new: {
            id: `msg-${i}`,
            chat_room_id: roomId,
            sender_id: userId,
            content: `Message ${i}`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Send messages rapidly
      if (messageHandler) {
        const startTime = Date.now();
        for (const message of messages) {
          messageHandler(message);
        }
        const processingTime = Date.now() - startTime;

        // Should process messages efficiently (less than 1 second for 100 messages)
        expect(processingTime).toBeLessThan(1000);
      }
    });

    it("should monitor memory usage", async () => {
      const manager = new (realtimeSubscriptionManager.constructor as any)({
        enableMetrics: true,
        memoryThreshold: 1, // Very low threshold for testing
      });

      const roomId = "memory-room";
      const userId = "memory-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      // Create subscription that would trigger memory warning
      const result = await manager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      expect(result).toBe(true);

      // Memory monitoring should be active
      const metrics = manager.getProductionMetrics();
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Quota Monitoring Tests", () => {
    it("should monitor quota limits correctly", () => {
      const quotaMonitor = {
        messageCount: 1900000, // 95% of 2M limit
        lastReset: Date.now() - 86400000, // 1 day ago
        warningThreshold: 1800000,
        criticalThreshold: 1950000,
      };

      const status = checkQuotaLimits(quotaMonitor);
      expect(status.allowed).toBe(true);
      expect(status.percentageUsed).toBeCloseTo(95, 0);
    });

    it("should block when quota exceeded", () => {
      const quotaMonitor = {
        messageCount: 1980000, // 99% of 2M limit
        lastReset: Date.now(),
        warningThreshold: 1800000,
        criticalThreshold: 1950000,
      };

      const status = checkQuotaLimits(quotaMonitor);
      expect(status.allowed).toBe(false);
      expect(status.reason).toContain("Critical quota exceeded");
    });

    it("should reset quota after period", () => {
      const quotaMonitor = {
        messageCount: 1900000,
        lastReset: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
        warningThreshold: 1800000,
        criticalThreshold: 1950000,
      };

      const status = checkQuotaLimits(quotaMonitor);
      expect(quotaMonitor.messageCount).toBe(0); // Should reset
      expect(status.allowed).toBe(true);
    });

    it("should integrate quota monitoring with subscription manager", async () => {
      // Create manager with quota monitoring enabled
      const manager = new (realtimeSubscriptionManager.constructor as any)({
        enableQuotaMonitoring: true,
      });

      // Set quota near limit
      (manager as any).quotaMonitor.messageCount = 1980000;

      const roomId = "quota-room";
      const userId = "quota-user";

      const result = await manager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      expect(result).toBe(false); // Should be blocked by quota
    });
  });

  describe("Health Monitoring Tests", () => {
    it("should check connection health correctly", async () => {
      const healthyChannel = {
        ...mockChannel,
        state: "joined",
        socket: { readyState: 1 },
        send: jest.fn(() => Promise.resolve()),
      } as unknown as RealtimeChannel;

      const isHealthy = await checkConnectionHealth(healthyChannel);
      expect(isHealthy).toBe(true);
    });

    it("should detect unhealthy connections", async () => {
      const unhealthyChannel = {
        ...mockChannel,
        state: "closed",
        socket: { readyState: 3 }, // WebSocket.CLOSED
        send: jest.fn(() => Promise.reject(new Error("Connection closed"))),
      } as unknown as RealtimeChannel;

      const isHealthy = await checkConnectionHealth(unhealthyChannel);
      expect(isHealthy).toBe(false);
    });

    it("should handle health check timeouts", async () => {
      const slowChannel = {
        ...mockChannel,
        send: jest.fn(() => new Promise((resolve) => setTimeout(resolve, 10000))), // 10 second delay
      } as unknown as RealtimeChannel;

      const startTime = Date.now();
      const isHealthy = await checkConnectionHealth(slowChannel);
      const duration = Date.now() - startTime;

      expect(isHealthy).toBe(false);
      expect(duration).toBeLessThan(6000); // Should timeout before 6 seconds
    });

    it("should integrate health monitoring with chat service", async () => {
      const roomId = "health-room";
      const userId = "health-user";
      const userName = "Health User";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      await enhancedRealtimeChatService.joinRoom(roomId, userId, userName);

      const analytics = enhancedRealtimeChatService.getSubscriptionAnalytics();
      expect(analytics.activeSubscriptions).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    it("should coordinate between subscription manager and chat service", async () => {
      const roomId = "integration-room";
      const userId = "integration-user";
      const userName = "Integration User";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      // Use subscription manager
      const managerResult = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      // Use chat service
      const chatChannel = await enhancedRealtimeChatService.joinRoom(roomId, userId, userName);

      expect(managerResult).toBe(true);
      expect(chatChannel).toBe(mockChannel);

      // Both should be active
      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBeGreaterThan(0);
      expect(enhancedRealtimeChatService.getActiveChannelsCount()).toBeGreaterThan(0);
    });

    it("should handle concurrent subscriptions correctly", async () => {
      const roomCount = 5;
      const userId = "concurrent-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), Math.random() * 100);
      });

      // Create multiple concurrent subscriptions
      const promises = Array.from({ length: roomCount }, (_, i) =>
        realtimeSubscriptionManager.subscribe(`room-${i}`, userId, {
          onMessage: jest.fn(),
        }),
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r === true).length;

      expect(successCount).toBe(roomCount);
      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBe(roomCount);
    });

    it("should maintain state consistency across services", async () => {
      const roomId = "consistency-room";
      const userId = "consistency-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      // Subscribe via manager
      await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      // Join via chat service
      await enhancedRealtimeChatService.joinRoom(roomId, userId, "Test User");

      // Get analytics from both
      const managerMetrics = realtimeSubscriptionManager.getProductionMetrics();
      const chatAnalytics = enhancedRealtimeChatService.getSubscriptionAnalytics();
      const utilsAnalytics = getRealtimeAnalytics();

      // All should report activity
      expect(managerMetrics.activeSubscriptions).toBeGreaterThan(0);
      expect(chatAnalytics.activeSubscriptions).toBeGreaterThan(0);
      expect(utilsAnalytics.performance.totalSubscriptions).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle null and undefined inputs gracefully", () => {
      expect(validateSubscriptionState(null as any, new Map())).toBe(false);
      expect(validateSubscriptionState(undefined as any, new Map())).toBe(false);
      expect(classifyError(null)).toBeInstanceOf(AppError);
      expect(classifyError(undefined)).toBeInstanceOf(AppError);
    });

    it("should handle very long subscription keys", () => {
      const longKey = "a".repeat(1000);
      const result = validateSubscriptionState(longKey, new Map());
      expect(typeof result).toBe("boolean");
    });

    it("should handle rapid subscribe/unsubscribe cycles", async () => {
      const roomId = "rapid-cycle-room";
      const userId = "rapid-cycle-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 5);
      });

      // Rapid subscribe/unsubscribe cycles
      for (let i = 0; i < 10; i++) {
        const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
          onMessage: jest.fn(),
        });
        expect(result).toBe(true);

        await realtimeSubscriptionManager.unsubscribe(roomId, userId);
      }

      expect(realtimeSubscriptionManager.getActiveSubscriptionsCount()).toBe(0);
    });

    it("should handle malformed channel responses", async () => {
      const roomId = "malformed-room";
      const userId = "malformed-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("UNKNOWN_STATUS", { malformed: "data" }), 10);
      });

      const onError = jest.fn();
      const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
        onError,
      });

      expect(result).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it("should handle system resource exhaustion", async () => {
      // Mock system under stress
      const originalSetTimeout = global.setTimeout;
      let timeoutCount = 0;

      global.setTimeout = jest.fn((callback, delay) => {
        timeoutCount++;
        if (timeoutCount > 100) {
          throw new Error("System resource exhaustion");
        }
        return originalSetTimeout(callback, delay);
      }) as any;

      try {
        const roomId = "resource-room";
        const userId = "resource-user";

        (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
          setTimeout(() => callback("SUBSCRIBED"), 10);
        });

        // Should handle resource exhaustion gracefully
        const result = await realtimeSubscriptionManager.subscribe(roomId, userId, {
          onMessage: jest.fn(),
        });

        // Result may vary based on when exhaustion occurs
        expect(typeof result).toBe("boolean");
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe("Production Scenarios", () => {
    it("should handle production-level concurrent users", async () => {
      const userCount = 50;
      const roomId = "production-room";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), Math.random() * 50);
      });

      // Simulate many users joining
      const promises = Array.from({ length: userCount }, (_, i) =>
        realtimeSubscriptionManager.subscribe(roomId, `user-${i}`, {
          onMessage: jest.fn(),
        }),
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === "fulfilled" && r.value === true).length;

      // Should handle most users successfully
      expect(successCount).toBeGreaterThan(userCount * 0.8); // At least 80% success rate
    });

    it("should maintain performance under load", async () => {
      const roomId = "performance-room";
      const userId = "performance-user";
      const userName = "Performance User";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      await enhancedRealtimeChatService.joinRoom(roomId, userId, userName);

      // Simulate high message volume
      const messageCount = 1000;
      const startTime = Date.now();

      for (let i = 0; i < messageCount; i++) {
        trackPerformanceMetrics({ subscriptionKey: roomId }, "message_received", { latency: Math.random() * 100 });
      }

      const processingTime = Date.now() - startTime;

      // Should process 1000 metrics quickly
      expect(processingTime).toBeLessThan(1000); // Less than 1 second
    });

    it("should provide comprehensive monitoring data", () => {
      const analytics = getRealtimeAnalytics();

      expect(analytics).toHaveProperty("diagnostics");
      expect(analytics).toHaveProperty("performance");
      expect(analytics).toHaveProperty("health");
      expect(analytics).toHaveProperty("compatibility");

      expect(analytics.diagnostics).toHaveProperty("totalLogs");
      expect(analytics.performance).toHaveProperty("totalSubscriptions");
      expect(analytics.health).toHaveProperty("totalConnections");
      expect(analytics.compatibility).toHaveProperty("isCompatible");
    });

    it("should validate Supabase v2.57.4 compatibility", () => {
      const compatibility = validateSupabaseCompatibility();

      expect(compatibility).toHaveProperty("isCompatible");
      expect(compatibility).toHaveProperty("issues");
      expect(compatibility).toHaveProperty("recommendations");

      expect(Array.isArray(compatibility.issues)).toBe(true);
      expect(Array.isArray(compatibility.recommendations)).toBe(true);
    });

    it("should handle production configuration correctly", async () => {
      // Create manager with production settings
      const productionManager = new (realtimeSubscriptionManager.constructor as any)({
        maxConcurrentSubscriptions: 50,
        enableCircuitBreaker: true,
        enableMetrics: true,
        enablePerformanceTracking: true,
        connectionPoolSize: 20,
      });

      const roomId = "production-config-room";
      const userId = "production-user";

      (mockChannel.subscribe as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback("SUBSCRIBED"), 10);
      });

      const result = await productionManager.subscribe(roomId, userId, {
        onMessage: jest.fn(),
      });

      expect(result).toBe(true);

      const metrics = productionManager.getProductionMetrics();
      expect(metrics).toHaveProperty("connectionMetrics");
      expect(metrics).toHaveProperty("circuitBreakerStates");
      expect(metrics).toHaveProperty("quotaStatus");
    });
  });

  describe("Monitoring Tests", () => {
    it("should collect diagnostic information", () => {
      // Generate some diagnostic logs
      trackPerformanceMetrics({ subscriptionKey: "test" }, "test_event");
      validateSubscriptionState("test-key", new Map());
      checkQuotaLimits({
        messageCount: 100,
        lastReset: Date.now(),
        warningThreshold: 1000,
        criticalThreshold: 2000,
      });

      const analytics = getRealtimeAnalytics();
      expect(analytics.diagnostics.totalLogs).toBeGreaterThan(0);
    });

    it("should provide actionable monitoring data", () => {
      const analytics = getRealtimeAnalytics();

      // Should have structured data for monitoring dashboards
      expect(analytics.diagnostics).toHaveProperty("logsByType");
      expect(analytics.diagnostics).toHaveProperty("logsBySeverity");
      expect(analytics.performance).toHaveProperty("subscriptionMetrics");
      expect(analytics.health).toHaveProperty("connections");
    });

    it("should support analytics reset", () => {
      // Generate some data
      trackPerformanceMetrics({ subscriptionKey: "test" }, "test_event");

      let analytics = getRealtimeAnalytics();
      expect(analytics.diagnostics.totalLogs).toBeGreaterThan(0);

      // Reset analytics
      resetAnalytics();

      analytics = getRealtimeAnalytics();
      expect(analytics.diagnostics.totalLogs).toBe(0);
    });
  });
});
