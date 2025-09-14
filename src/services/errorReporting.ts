/**
 * Comprehensive Sentry Error Reporting Service
 * Integrates with existing AppError system for production-ready error monitoring
 */

import * as Sentry from '@sentry/react-native';
import { AppError, ErrorType } from '../utils/errorHandling';
import Constants from 'expo-constants';

interface ErrorReportingConfig {
  dsn: string;
  environment: 'development' | 'staging' | 'production';
  enableInExpoDevelopment: boolean;
  sampleRate: number;
  tracesSampleRate: number;
  enableAutoSessionTracking: boolean;
  enableNativeCrashHandling: boolean;
  maxBreadcrumbs: number;
  attachStacktrace: boolean;
  enableUserInteractionTracing: boolean;
}

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
  private isInitialized = false;
  private config: ErrorReportingConfig;
  private sessionContext: SessionContext | null = null;
  private userContext: UserContext | null = null;

  constructor() {
    this.config = this.getConfiguration();
  }

  /**
   * Initialize Sentry with production-ready configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[ErrorReporting] Already initialized');
      return;
    }

    try {
      // Skip initialization in Expo Go unless explicitly enabled
      if (this.isExpoGo() && !this.config.enableInExpoDevelopment) {
        console.log('[ErrorReporting] Skipping initialization in Expo Go');
        return;
      }

      if (!this.config.dsn) {
        console.warn('[ErrorReporting] No DSN provided, error reporting disabled');
        return;
      }

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        sampleRate: this.config.sampleRate,
        tracesSampleRate: this.config.tracesSampleRate,
        enableAutoSessionTracking: this.config.enableAutoSessionTracking,
        enableNativeCrashHandling: this.config.enableNativeCrashHandling,
        maxBreadcrumbs: this.config.maxBreadcrumbs,
        attachStacktrace: this.config.attachStacktrace,
        enableUserInteractionTracing: this.config.enableUserInteractionTracing,
        
        // Production-specific configurations
        beforeSend: (event: Sentry.Event, hint: Sentry.EventHint) => this.beforeSend(event, hint),
        beforeBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => this.beforeBreadcrumb(breadcrumb),
        
        // Performance monitoring
        integrations: [
          new Sentry.ReactNativeTracing({
            enableUserInteractionTracing: this.config.enableUserInteractionTracing,
            enableNativeFramesTracking: true,
            enableStallTracking: true,
            enableAppStartTracking: true,
          }),
        ],

        // Release and distribution info
        release: this.getRelease(),
        dist: this.getDistribution(),
      });

      // Set initial context
      this.setInitialContext();
      this.isInitialized = true;

      console.log('[ErrorReporting] Initialized successfully');
    } catch (error) {
      console.error('[ErrorReporting] Failed to initialize:', error);
    }
  }

  /**
   * Report an AppError to Sentry with proper categorization
   */
  reportError(error: AppError | Error, context?: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('[ErrorReporting] Not initialized, error not reported');
      return;
    }

    try {
      const appError = error instanceof AppError ? error : this.convertToAppError(error);
      
      // Set error context
      Sentry.withScope((scope: Sentry.Scope) => {
        // Set error level based on type
        scope.setLevel(this.getErrorLevel(appError));
        
        // Set error tags
        scope.setTag('error.type', appError.type);
        scope.setTag('error.retryable', appError.retryable);
        
        if (appError.code) {
          scope.setTag('error.code', appError.code);
        }
        
        if (appError.statusCode) {
          scope.setTag('error.statusCode', appError.statusCode);
        }

        // Set additional context
        if (context) {
          scope.setContext('additional', context);
        }

        // Set fingerprint for better grouping
        scope.setFingerprint([
          appError.type,
          appError.code || 'unknown',
          appError.message,
        ]);

        // Report the error
        Sentry.captureException(appError);
      });

      // Add breadcrumb for error reporting
      this.addBreadcrumb({
        message: `Error reported: ${appError.type}`,
        category: 'error',
        level: 'error',
        data: {
          type: appError.type,
          code: appError.code,
          retryable: appError.retryable,
        },
      });

    } catch (reportingError) {
      console.error('[ErrorReporting] Failed to report error:', reportingError);
    }
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, operation: string): Sentry.Transaction | null {
    if (!this.isInitialized) return null;

    try {
      return Sentry.startTransaction({
        name,
        op: operation,
        tags: {
          'transaction.source': 'custom',
        },
      });
    } catch (error) {
      console.warn('[ErrorReporting] Failed to start transaction:', error);
      return null;
    }
  }

  /**
   * Set user context for error reporting
   */
  setUserContext(user: UserContext): void {
    if (!this.isInitialized) return;

    try {
      this.userContext = user;
      
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        subscription: user.subscription,
        location: user.location,
      });

      this.addBreadcrumb({
        message: 'User context updated',
        category: 'user',
        level: 'info',
        data: {
          userId: user.id,
          hasEmail: !!user.email,
          hasSubscription: !!user.subscription,
        },
      });
    } catch (error) {
      console.warn('[ErrorReporting] Failed to set user context:', error);
    }
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext(): void {
    if (!this.isInitialized) return;

    try {
      this.userContext = null;
      Sentry.setUser(null);
      
      this.addBreadcrumb({
        message: 'User context cleared',
        category: 'user',
        level: 'info',
      });
    } catch (error) {
      console.warn('[ErrorReporting] Failed to clear user context:', error);
    }
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category: string;
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
    data?: Record<string, any>;
  }): void {
    if (!this.isInitialized) return;

    try {
      Sentry.addBreadcrumb({
        message: breadcrumb.message,
        category: breadcrumb.category,
        level: breadcrumb.level,
        data: breadcrumb.data,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      console.warn('[ErrorReporting] Failed to add breadcrumb:', error);
    }
  }

  /**
   * Set custom context for debugging
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.isInitialized) return;

    try {
      Sentry.setContext(key, context);
    } catch (error) {
      console.warn('[ErrorReporting] Failed to set context:', error);
    }
  }

  /**
   * Capture a message with context
   */
  captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info'): void {
    if (!this.isInitialized) return;

    try {
      Sentry.captureMessage(message, level);
    } catch (error) {
      console.warn('[ErrorReporting] Failed to capture message:', error);
    }
  }

  /**
   * Get configuration based on environment
   */
  private getConfiguration(): ErrorReportingConfig {
    const isProduction = this.getEnvironment() === 'production';
    const isDevelopment = this.getEnvironment() === 'development';

    return {
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      environment: this.getEnvironment(),
      enableInExpoDevelopment: false, // Disable in Expo Go by default
      sampleRate: isProduction ? 0.1 : 1.0, // Sample 10% in production, 100% in dev
      tracesSampleRate: isProduction ? 0.05 : 0.2, // Lower performance sampling in production
      enableAutoSessionTracking: true,
      enableNativeCrashHandling: true,
      maxBreadcrumbs: isProduction ? 50 : 100,
      attachStacktrace: true,
      enableUserInteractionTracing: !isDevelopment, // Disable in development for performance
    };
  }

  /**
   * Get current environment
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    if (__DEV__) return 'development';
    
    const buildProfile = Constants.expoConfig?.extra?.buildEnvironment?.buildProfile;
    if (buildProfile === 'production') return 'production';
    if (buildProfile === 'preview') return 'staging';
    
    return 'development';
  }

  /**
   * Check if running in Expo Go
   */
  private isExpoGo(): boolean {
    return Constants.expoConfig?.extra?.buildEnvironment?.isExpoGo || false;
  }

  /**
   * Get release version
   */
  private getRelease(): string {
    const version = Constants.expoConfig?.version || '1.0.0';
    const buildNumber = Constants.expoConfig?.ios?.buildNumber || 
                       Constants.expoConfig?.android?.versionCode?.toString() || '1';
    return `${version}+${buildNumber}`;
  }

  /**
   * Get distribution identifier
   */
  private getDistribution(): string {
    const buildProfile = Constants.expoConfig?.extra?.buildEnvironment?.buildProfile || 'development';
    const platform = Constants.platform?.ios ? 'ios' : 'android';
    return `${buildProfile}-${platform}`;
  }

  /**
   * Set initial context
   */
  private setInitialContext(): void {
    // Set session context
    this.sessionContext = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      platform: Constants.platform?.ios ? 'ios' : 'android',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      buildNumber: Constants.expoConfig?.ios?.buildNumber || 
                  Constants.expoConfig?.android?.versionCode?.toString() || '1',
    };

    Sentry.setContext('session', this.sessionContext);
    
    // Set device context
    Sentry.setContext('device', {
      platform: Constants.platform,
      isDevice: Constants.isDevice,
      expoVersion: Constants.expoVersion,
    });

    // Set build context
    Sentry.setContext('build', {
      environment: this.config.environment,
      buildProfile: Constants.expoConfig?.extra?.buildEnvironment?.buildProfile,
      isExpoGo: this.isExpoGo(),
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert regular Error to AppError
   */
  private convertToAppError(error: Error): AppError {
    return new AppError(
      error.message,
      ErrorType.UNKNOWN,
      'UNKNOWN_ERROR',
      undefined,
      false
    );
  }

  /**
   * Get Sentry error level from AppError type
   */
  private getErrorLevel(error: AppError): 'debug' | 'info' | 'warning' | 'error' | 'fatal' {
    switch (error.type) {
      case ErrorType.NETWORK:
        return error.retryable ? 'warning' : 'error';
      case ErrorType.AUTH:
        return 'warning';
      case ErrorType.PERMISSION:
        return 'warning';
      case ErrorType.VALIDATION:
        return 'info';
      case ErrorType.SERVER:
        return error.statusCode && error.statusCode >= 500 ? 'error' : 'warning';
      default:
        return 'error';
    }
  }

  /**
   * Filter events before sending to Sentry
   */
  private beforeSend(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
    // Filter out development-only errors in production
    if (this.config.environment === 'production') {
      // Skip certain error types in production
      if (event.tags?.['error.type'] === ErrorType.VALIDATION && 
          event.level === 'info') {
        return null;
      }
    }

    // Add session context to all events
    if (this.sessionContext) {
      event.contexts = event.contexts || {};
      event.contexts.session = this.sessionContext;
    }

    return event;
  }

  /**
   * Filter breadcrumbs before adding
   */
  private beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    // Filter out noisy breadcrumbs in production
    if (this.config.environment === 'production') {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
    }

    return breadcrumb;
  }
}

// Create singleton instance
export const errorReportingService = new ErrorReportingService();

export default errorReportingService;
