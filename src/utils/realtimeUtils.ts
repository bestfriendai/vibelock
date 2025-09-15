/**
 * Comprehensive Supabase Realtime v2.57.4 Compatibility and Monitoring Utilities
 *
 * This module provides utilities for:
 * - Subscription state validation and management
 * - Quota monitoring and rate limiting
 * - Performance metrics tracking
 * - Connection health monitoring
 * - Error classification and handling
 * - Connection pool optimization
 * - Diagnostic tools and monitoring
 */

import { RealtimeChannel } from "@supabase/supabase-js";
import { AppError, ErrorType } from "./errorHandling";

// Types and Interfaces
export interface SubscriptionStateInfo {
  subscriptionKey: string;
  status: string;
  lastActivity: number;
  retryCount: number;
  healthCheckCount: number;
  quotaUsage: number;
}

export interface QuotaMonitor {
  messageCount: number;
  lastReset: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface QuotaStatus {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  percentageUsed: number;
  timeUntilReset?: number;
}

export interface PerformanceMetrics {
  latency?: number;
  messageCount?: number;
  errorCount?: number;
  timestamp: number;
  eventType: string;
  subscriptionKey?: string;
}

export interface ConnectionHealthStatus {
  isHealthy: boolean;
  lastCheck: number;
  issues: string[];
  recommendations: string[];
}

export interface ErrorClassification {
  type: ErrorType;
  code: string;
  statusCode: number;
  retryable: boolean;
  severity: "low" | "medium" | "high" | "critical";
  category: "network" | "quota" | "permission" | "server" | "client";
}

export interface ConnectionSharingResult {
  canShare: boolean;
  sharedConnectionKey?: string;
  reason?: string;
}

export interface DiagnosticInfo {
  timestamp: number;
  subscriptionKey: string;
  diagnosticType: string;
  data: any;
  severity: "info" | "warning" | "error" | "critical";
}

// Internal metrics storage (renamed from realtimeMetrics to avoid conflicts)
const realtimeMetrics = {
  performanceData: new Map<string, PerformanceMetrics[]>(),
  connectionHealth: new Map<string, ConnectionHealthStatus>(),
  diagnosticLogs: [] as DiagnosticInfo[],
  maxDiagnosticLogs: 1000,
};

/**
 * Subscription State Validation
 */
export function validateSubscriptionState(subscriptionKey: string, subscriptions: Map<string, any>): boolean {
  try {
    // Check if subscription key is valid format
    if (!subscriptionKey || typeof subscriptionKey !== "string") {
      logDiagnostic(
        subscriptionKey,
        "validation",
        {
          error: "Invalid subscription key format",
          key: subscriptionKey,
        },
        "error",
      );
      return false;
    }

    // Check for duplicate subscriptions
    if (subscriptions.has(subscriptionKey)) {
      const existingSubscription = subscriptions.get(subscriptionKey);
      if (existingSubscription?.status === "connected" || existingSubscription?.status === "subscribed") {
        logDiagnostic(
          subscriptionKey,
          "validation",
          {
            warning: "Subscription already exists and is active",
            status: existingSubscription.status,
          },
          "warning",
        );
        return true; // Allow reuse of active connections
      }
    }

    // Validate subscription key format (should match expected patterns)
    const keyPatterns = [
      /^room:\w+$/, // Basic room pattern
      /^enhanced_room_\w+$/, // Enhanced room pattern
      /^\w+:\w+$/, // Generic key:value pattern
    ];

    const isValidPattern = keyPatterns.some((pattern) => pattern.test(subscriptionKey));
    if (!isValidPattern) {
      logDiagnostic(
        subscriptionKey,
        "validation",
        {
          error: "Subscription key doesn't match expected patterns",
          key: subscriptionKey,
          expectedPatterns: keyPatterns.map((p) => p.toString()),
        },
        "warning",
      );
    }

    logDiagnostic(
      subscriptionKey,
      "validation",
      {
        result: "Valid subscription state",
        key: subscriptionKey,
      },
      "info",
    );

    return true;
  } catch (error) {
    logDiagnostic(
      subscriptionKey,
      "validation",
      {
        error: "Exception during validation",
        message: (error as Error).message,
      },
      "error",
    );
    return false;
  }
}

/**
 * Quota Monitoring and Limits
 */
export function checkQuotaLimits(quotaMonitor: QuotaMonitor): QuotaStatus {
  try {
    const now = Date.now();
    const monthlyResetInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
    const maxMessages = 2000000; // 2M free tier limit

    // Check if quota period has reset
    if (now - quotaMonitor.lastReset > monthlyResetInterval) {
      quotaMonitor.messageCount = 0;
      quotaMonitor.lastReset = now;

      logDiagnostic(
        "global",
        "quota",
        {
          event: "Quota period reset",
          timestamp: now,
        },
        "info",
      );
    }

    const percentageUsed = (quotaMonitor.messageCount / maxMessages) * 100;
    const timeUntilReset = monthlyResetInterval - (now - quotaMonitor.lastReset);

    // Check critical threshold
    if (quotaMonitor.messageCount >= quotaMonitor.criticalThreshold) {
      logDiagnostic(
        "global",
        "quota",
        {
          event: "Critical quota threshold exceeded",
          current: quotaMonitor.messageCount,
          threshold: quotaMonitor.criticalThreshold,
          percentage: percentageUsed,
        },
        "critical",
      );

      return {
        allowed: false,
        reason: `Critical quota exceeded: ${quotaMonitor.messageCount}/${maxMessages} messages (${percentageUsed.toFixed(1)}%)`,
        currentUsage: quotaMonitor.messageCount,
        percentageUsed,
        timeUntilReset,
      };
    }

    // Check warning threshold
    if (quotaMonitor.messageCount >= quotaMonitor.warningThreshold) {
      logDiagnostic(
        "global",
        "quota",
        {
          event: "Warning quota threshold exceeded",
          current: quotaMonitor.messageCount,
          threshold: quotaMonitor.warningThreshold,
          percentage: percentageUsed,
        },
        "warning",
      );
    }

    return {
      allowed: true,
      currentUsage: quotaMonitor.messageCount,
      percentageUsed,
      timeUntilReset,
    };
  } catch (error) {
    logDiagnostic(
      "global",
      "quota",
      {
        error: "Exception during quota check",
        message: (error as Error).message,
      },
      "error",
    );

    // Default to allowing on error to prevent blocking
    return {
      allowed: true,
      reason: "Quota check failed, defaulting to allow",
      currentUsage: quotaMonitor.messageCount || 0,
      percentageUsed: 0,
    };
  }
}

/**
 * Performance Metrics Tracking
 */
export function trackPerformanceMetrics(context: any, eventType: string, additionalData?: any): void {
  try {
    const subscriptionKey = context.subscriptionKey || context.roomId || context.id || "unknown";

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      eventType,
      subscriptionKey,
      ...additionalData,
    };

    // Store metrics
    if (!realtimeMetrics.performanceData.has(subscriptionKey)) {
      realtimeMetrics.performanceData.set(subscriptionKey, []);
    }

    const metricsArray = realtimeMetrics.performanceData.get(subscriptionKey)!;
    metricsArray.push(metrics);

    // Keep only recent metrics (last 1000 entries)
    if (metricsArray.length > 1000) {
      metricsArray.splice(0, metricsArray.length - 1000);
    }

    // Update context performance metrics if available
    if (context.performanceMetrics) {
      switch (eventType) {
        case "message_received":
          context.performanceMetrics.totalMessages++;
          if (additionalData?.latency) {
            context.performanceMetrics.averageLatency =
              (context.performanceMetrics.averageLatency + additionalData.latency) / 2;
          }
          break;
        case "subscription_error":
          context.performanceMetrics.errorCount++;
          break;
        case "message_sent":
          if (additionalData?.latency) {
            context.performanceMetrics.averageLatency =
              (context.performanceMetrics.averageLatency + additionalData.latency) / 2;
          }
          break;
      }
    }

    logDiagnostic(
      subscriptionKey,
      "performance",
      {
        eventType,
        metrics,
        contextType: typeof context,
      },
      "info",
    );
  } catch (error) {
    // Silently ignore performance metrics errors to prevent app crashes
  }
}

/**
 * Connection Health Monitoring
 */
export async function checkConnectionHealth(channel: RealtimeChannel): Promise<boolean> {
  try {
    if (!channel) {
      return false;
    }

    const channelState = (channel as any).state;
    const isConnected = channelState === "joined" || channelState === "joining";

    // Additional health checks
    const healthIssues: string[] = [];
    const recommendations: string[] = [];

    // Check channel state
    if (!isConnected) {
      healthIssues.push(`Channel state is ${channelState}`);
      recommendations.push("Consider reconnecting the channel");
    }

    // Check for socket connection
    const socket = (channel as any).socket;
    if (socket) {
      const socketState = socket.readyState;
      if (socketState !== 1) {
        // WebSocket.OPEN = 1
        healthIssues.push(`WebSocket state is ${socketState}`);
        recommendations.push("Check network connectivity");
      }
    }

    // Perform a simple ping test if possible
    try {
      const pingStartTime = Date.now();

      // Send a heartbeat-like message to test connectivity
      const pingResult = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000); // 5 second timeout

        // Try to send a minimal message
        if (channel.send && typeof channel.send === "function") {
          channel
            .send({
              type: "broadcast",
              event: "ping",
              payload: { timestamp: pingStartTime },
            })
            .then(() => {
              clearTimeout(timeout);
              resolve(true);
            })
            .catch(() => {
              clearTimeout(timeout);
              resolve(false);
            });
        } else {
          clearTimeout(timeout);
          resolve(isConnected);
        }
      });

      if (!pingResult) {
        healthIssues.push("Ping test failed");
        recommendations.push("Verify channel responsiveness");
      }

      const pingLatency = Date.now() - pingStartTime;
      if (pingLatency > 2000) {
        healthIssues.push(`High latency: ${pingLatency}ms`);
        recommendations.push("Check network performance");
      }
    } catch (pingError) {
      healthIssues.push("Ping test exception");
      recommendations.push("Investigate connection stability");
    }

    const healthStatus: ConnectionHealthStatus = {
      isHealthy: healthIssues.length === 0,
      lastCheck: Date.now(),
      issues: healthIssues,
      recommendations,
    };

    // Store health status
    const channelKey = (channel as any).topic || "unknown";
    realtimeMetrics.connectionHealth.set(channelKey, healthStatus);

    logDiagnostic(
      channelKey,
      "health_check",
      {
        isHealthy: healthStatus.isHealthy,
        issues: healthIssues,
        recommendations,
        channelState,
        socketState: socket?.readyState,
      },
      healthIssues.length > 0 ? "warning" : "info",
    );

    return healthStatus.isHealthy;
  } catch (error) {
    logDiagnostic(
      "unknown",
      "health_check",
      {
        error: "Health check exception",
        message: (error as Error).message,
      },
      "error",
    );

    return false;
  }
}

/**
 * Error Classification and Handling
 */
export function classifyError(error: any): AppError {
  try {
    let classification: ErrorClassification;

    // Default classification
    classification = {
      type: ErrorType.UNKNOWN,
      code: "UNKNOWN_ERROR",
      statusCode: 500,
      retryable: false,
      severity: "medium",
      category: "server",
    };

    // Classify based on error type and message
    if (error instanceof AppError) {
      return error; // Already classified
    }

    const errorMessage = error?.message || error?.toString() || "Unknown error";
    const errorCode = error?.code || error?.status || error?.statusCode;

    // Network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection") ||
      errorCode === "NETWORK_ERROR"
    ) {
      classification = {
        type: ErrorType.NETWORK,
        code: "NETWORK_ERROR",
        statusCode: 503,
        retryable: true,
        severity: "medium",
        category: "network",
      };
    }

    // Quota errors
    else if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorCode === 429) {
      classification = {
        type: ErrorType.SERVER,
        code: "QUOTA_EXCEEDED",
        statusCode: 429,
        retryable: false,
        severity: "high",
        category: "quota",
      };
    }

    // Permission errors
    else if (
      errorMessage.includes("permission") ||
      errorMessage.includes("unauthorized") ||
      errorCode === 401 ||
      errorCode === 403
    ) {
      classification = {
        type: ErrorType.VALIDATION,
        code: "PERMISSION_DENIED",
        statusCode: errorCode || 403,
        retryable: false,
        severity: "high",
        category: "permission",
      };
    }

    // Subscription errors
    else if (
      errorMessage.includes("subscription") ||
      errorMessage.includes("channel") ||
      errorMessage.includes("CHANNEL_ERROR") ||
      errorMessage.includes("TIMED_OUT")
    ) {
      classification = {
        type: ErrorType.NETWORK,
        code: error.includes?.("TIMED_OUT") ? "SUBSCRIPTION_TIMEOUT" : "SUBSCRIPTION_ERROR",
        statusCode: 503,
        retryable: true,
        severity: "medium",
        category: "network",
      };
    }

    // Server errors
    else if (errorCode >= 500 && errorCode < 600) {
      classification = {
        type: ErrorType.SERVER,
        code: "SERVER_ERROR",
        statusCode: errorCode,
        retryable: true,
        severity: "medium",
        category: "server",
      };
    }

    // Client errors
    else if (errorCode >= 400 && errorCode < 500) {
      classification = {
        type: ErrorType.VALIDATION,
        code: "CLIENT_ERROR",
        statusCode: errorCode,
        retryable: false,
        severity: "low",
        category: "client",
      };
    }

    const classifiedError = new AppError(
      errorMessage,
      classification.type,
      classification.code,
      classification.statusCode,
      classification.retryable,
    );

    logDiagnostic(
      "global",
      "error_classification",
      {
        originalError: errorMessage,
        classification,
        retryable: classification.retryable,
      },
      classification.severity === "critical" ? "critical" : "warning",
    );

    return classifiedError;
  } catch (classificationError) {
    // Silently ignore error classification errors to prevent app crashes

    // Return a safe default error
    return new AppError("Error classification failed", ErrorType.UNKNOWN, "CLASSIFICATION_ERROR", 500, false);
  }
}

/**
 * Connection Pool Optimization
 */
export function optimizeConnectionSharing(
  roomId: string,
  connectionSharing: Map<string, Set<string>>,
  subscriptions: Map<string, any>,
): string | null {
  try {
    // Find existing connections for the same room
    const existingConnections = connectionSharing.get(roomId);
    if (!existingConnections || existingConnections.size === 0) {
      logDiagnostic(
        roomId,
        "connection_sharing",
        {
          result: "No existing connections to share",
          roomId,
        },
        "info",
      );
      return null;
    }

    // Find a healthy connection to share
    for (const connectionKey of existingConnections) {
      const subscription = subscriptions.get(connectionKey);
      if (subscription && (subscription.status === "connected" || subscription.status === "subscribed")) {
        const timeSinceLastActivity = Date.now() - (subscription.lastActivity || 0);
        const isRecentlyActive = timeSinceLastActivity < 300000; // 5 minutes

        if (isRecentlyActive) {
          logDiagnostic(
            roomId,
            "connection_sharing",
            {
              result: "Found shareable connection",
              roomId,
              sharedConnectionKey: connectionKey,
              lastActivity: subscription.lastActivity,
            },
            "info",
          );
          return connectionKey;
        }
      }
    }

    logDiagnostic(
      roomId,
      "connection_sharing",
      {
        result: "No healthy connections available for sharing",
        roomId,
        availableConnections: Array.from(existingConnections),
      },
      "warning",
    );

    return null;
  } catch (error) {
    logDiagnostic(
      roomId,
      "connection_sharing",
      {
        error: "Exception during connection sharing optimization",
        message: (error as Error).message,
      },
      "error",
    );
    return null;
  }
}

/**
 * Diagnostic Tools and Monitoring
 */
export function logDiagnostic(
  subscriptionKey: string,
  diagnosticType: string,
  data: any,
  severity: "info" | "warning" | "error" | "critical" = "info",
): void {
  try {
    const diagnostic: DiagnosticInfo = {
      timestamp: Date.now(),
      subscriptionKey,
      diagnosticType,
      data,
      severity,
    };

    realtimeMetrics.diagnosticLogs.push(diagnostic);

    // Keep only recent logs
    if (realtimeMetrics.diagnosticLogs.length > realtimeMetrics.maxDiagnosticLogs) {
      realtimeMetrics.diagnosticLogs.splice(
        0,
        realtimeMetrics.diagnosticLogs.length - realtimeMetrics.maxDiagnosticLogs,
      );
    }

    // Safely log to console based on severity without accessing console methods directly
    const logMessage = `[RealtimeUtils] ${diagnosticType} - ${subscriptionKey}`;

    // Use a safer approach to console logging to avoid property configuration issues
    if (typeof console !== "undefined" && console) {
      try {
        switch (severity) {
          case "critical":
          case "error":
            if (console.error) console.error(logMessage, data);
            break;
          case "warning":
            if (console.warn) console.warn(logMessage, data);
            break;
          case "info":
          default:
            if (console.log) console.log(logMessage, data);
            break;
        }
      } catch (consoleError) {
        // Ignore console errors to prevent app crashes
      }
    }
  } catch (error) {
    // Silently fail to prevent app crashes from diagnostic logging
  }
}

/**
 * Compatibility Validation for Supabase v2.57.4
 */
export function validateSupabaseCompatibility(): {
  isCompatible: boolean;
  version?: string;
  issues: string[];
  recommendations: string[];
} {
  try {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if Supabase v2.57.4 features are available
    // Note: REALTIME_SUBSCRIBE_STATES may not be available in all versions
    // We'll do a basic compatibility check instead

    // Test if RealtimeChannel has the expected methods
    const expectedMethods = ["subscribe", "unsubscribe", "send", "on"];

    try {
      // Safely check if methods exist without accessing prototype directly
      for (const method of expectedMethods) {
        if (
          typeof RealtimeChannel === "function" &&
          RealtimeChannel.prototype &&
          typeof RealtimeChannel.prototype[method] !== "function"
        ) {
          issues.push(`Missing RealtimeChannel method: ${method}`);
          recommendations.push(`Update to Supabase v2.57.4 or later`);
        }
      }
    } catch (prototypeError) {
      // If we can't check prototype, just note that we can't validate
      recommendations.push("Unable to validate RealtimeChannel methods");
    }

    const isCompatible = issues.length === 0;

    logDiagnostic(
      "global",
      "compatibility_check",
      {
        isCompatible,
        issues,
        recommendations,
        supabaseVersion: "v2.57.4+",
      },
      isCompatible ? "info" : "warning",
    );

    return {
      isCompatible,
      issues,
      recommendations,
    };
  } catch (error) {
    logDiagnostic(
      "global",
      "compatibility_check",
      {
        error: "Exception during compatibility check",
        message: (error as Error).message,
      },
      "error",
    );

    return {
      isCompatible: false,
      issues: ["Compatibility check failed"],
      recommendations: ["Verify Supabase installation and version"],
    };
  }
}

/**
 * Get Analytics and Monitoring Data
 */
export function getRealtimeAnalytics() {
  try {
    const analytics = {
      diagnostics: {
        totalLogs: realtimeMetrics.diagnosticLogs.length,
        logsByType: {} as Record<string, number>,
        logsBySeverity: {} as Record<string, number>,
        recentLogs: realtimeMetrics.diagnosticLogs.slice(-50), // Last 50 logs
      },
      performance: {
        totalSubscriptions: realtimeMetrics.performanceData.size,
        metricsCount: Array.from(realtimeMetrics.performanceData.values()).reduce(
          (total, metrics) => total + metrics.length,
          0,
        ),
        subscriptionMetrics: Array.from(realtimeMetrics.performanceData.entries()).map(([key, metrics]) => ({
          subscriptionKey: key,
          totalEvents: metrics.length,
          eventTypes: [...new Set(metrics.map((m) => m.eventType))],
          averageLatency:
            metrics.filter((m) => m.latency).reduce((sum, m, _, arr) => sum + m.latency! / arr.length, 0) || 0,
        })),
      },
      health: {
        totalConnections: realtimeMetrics.connectionHealth.size,
        healthyConnections: Array.from(realtimeMetrics.connectionHealth.values()).filter((h) => h.isHealthy).length,
        connections: Array.from(realtimeMetrics.connectionHealth.entries()).map(([key, health]) => ({
          connectionKey: key,
          isHealthy: health.isHealthy,
          lastCheck: health.lastCheck,
          issueCount: health.issues.length,
          issues: health.issues,
          recommendations: health.recommendations,
        })),
      },
      compatibility: validateSupabaseCompatibility(),
    };

    // Count diagnostics by type and severity
    for (const log of realtimeMetrics.diagnosticLogs) {
      analytics.diagnostics.logsByType[log.diagnosticType] =
        (analytics.diagnostics.logsByType[log.diagnosticType] || 0) + 1;
      analytics.diagnostics.logsBySeverity[log.severity] =
        (analytics.diagnostics.logsBySeverity[log.severity] || 0) + 1;
    }

    return analytics;
  } catch (error) {
    // Silently ignore analytics errors to prevent app crashes
    return {
      diagnostics: { totalLogs: 0, logsByType: {}, logsBySeverity: {}, recentLogs: [] },
      performance: { totalSubscriptions: 0, metricsCount: 0, subscriptionMetrics: [] },
      health: { totalConnections: 0, healthyConnections: 0, connections: [] },
      compatibility: { isCompatible: false, issues: ["Analytics generation failed"], recommendations: [] },
    };
  }
}

/**
 * Reset Analytics Data
 */
export function resetAnalytics(): void {
  try {
    realtimeMetrics.performanceData.clear();
    realtimeMetrics.connectionHealth.clear();
    realtimeMetrics.diagnosticLogs.length = 0;

    logDiagnostic(
      "global",
      "analytics_reset",
      {
        timestamp: Date.now(),
        action: "Analytics data reset",
      },
      "info",
    );
  } catch (error) {
    // Silently ignore reset analytics errors to prevent app crashes
  }
}

/**
 * Export utility functions and types
 * Note: Using individual exports instead of default export to avoid potential module conflicts
 */
