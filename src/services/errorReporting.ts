/**
 * Simple Error Reporting Service (Sentry removed)
 * Provides error logging and tracking without external dependencies
 */

import { AppError, ErrorType } from "../utils/errorHandling";
import Constants from "expo-constants";

interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  subscription?: string;
  location?: string;
}

interface SessionContext {
  sessionId: string;
  startTime: number;
  platform: string;
  appVersion: string;
  buildNumber: string;
}

class ErrorReportingService {
  private _isInitialized = false;
  private sessionContext: SessionContext | null = null;
  private userContext: UserContext | null = null;
  private errorCount = 0;
  private warningCount = 0;

  /**
   * Initialize error reporting (simplified without Sentry)
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      console.log("[ErrorReporting] Already initialized");
      return;
    }

    try {
      console.log("[ErrorReporting] Initializing error reporting service...");

      // Set up session context
      this.sessionContext = {
        sessionId: this.generateSessionId(),
        startTime: Date.now(),
        platform: Constants.platform?.os || "unknown",
        appVersion: Constants.expoConfig?.version || "unknown",
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || "unknown",
      };

      this._isInitialized = true;
      console.log("[ErrorReporting] Initialization complete");
    } catch (error) {
      console.error("[ErrorReporting] Failed to initialize:", error);
    }
  }

  /**
   * Report an AppError
   */
  reportError(appError: AppError): void {
    if (!this._isInitialized) {
      console.warn("[ErrorReporting] Service not initialized, logging error only");
    }

    try {
      // Update counters
      if (appError.type === ErrorType.CRITICAL || appError.type === ErrorType.FUNCTIONAL) {
        this.errorCount++;
      } else {
        this.warningCount++;
      }

      // Create error report
      const errorReport = {
        message: appError.message,
        type: appError.type,
        code: appError.code,
        context: appError.context,
        stackTrace: appError.stackTrace,
        timestamp: appError.timestamp,
        sessionInfo: {
          ...this.sessionContext,
          errorCount: this.errorCount,
          warningCount: this.warningCount,
        },
        userInfo: this.userContext,
      };

      // Log based on severity
      if (appError.type === ErrorType.CRITICAL) {
        console.error("[CRITICAL ERROR]", errorReport);
      } else if (appError.type === ErrorType.FUNCTIONAL) {
        console.error("[ERROR]", errorReport);
      } else if (appError.type === ErrorType.VALIDATION) {
        console.warn("[VALIDATION]", errorReport);
      } else {
        console.log("[INFO]", errorReport);
      }

      // In production, you could send this to your own backend
      if (process.env.NODE_ENV === "production" && !__DEV__) {
        // TODO: Implement custom error reporting to your backend
        // this.sendToBackend(errorReport);
      }
    } catch (error) {
      console.error("[ErrorReporting] Failed to report error:", error);
    }
  }

  /**
   * Track performance (simplified)
   */
  async trackPerformance<T>(operation: string, callback: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await callback();
      const duration = Date.now() - startTime;

      if (duration > 3000) {
        console.warn(`[Performance] Slow operation '${operation}' took ${duration}ms`);
      } else if (__DEV__) {
        console.log(`[Performance] Operation '${operation}' took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Performance] Operation '${operation}' failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: UserContext | null): void {
    if (!this._isInitialized) {
      return;
    }

    this.userContext = user;

    if (user) {
      console.log("[ErrorReporting] User context set:", {
        id: user.id,
        subscription: user.subscription,
      });
    } else {
      console.log("[ErrorReporting] User context cleared");
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (__DEV__) {
      console.log(`[Breadcrumb] ${category}: ${message}`, data);
    }
  }

  /**
   * Set context data
   */
  setContext(key: string, context: Record<string, any>): void {
    if (__DEV__) {
      console.log(`[Context] ${key}:`, context);
    }
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
    const logFn = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
    logFn(`[Message] ${message}`);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    if (!this.sessionContext) {
      return null;
    }

    return {
      ...this.sessionContext,
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      uptime: Date.now() - this.sessionContext.startTime,
    };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const errorReportingService = new ErrorReportingService();
