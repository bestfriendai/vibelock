/**
 * Initialization Service
 *
 * Comprehensive initialization validation and monitoring system for React Native 0.81.4 + Expo 54.
 * Manages service initialization order, health checks, performance monitoring, and graceful degradation.
 */

import { performHealthCheck } from "../config/supabase";
import { compatibilityChecker, PerformanceMonitor } from "../utils/compatibilityUtils";
import { errorReportingService } from "./errorReporting";
import { notificationService } from "./notificationService";
import { adMobService } from "./adMobService";
import { enhancedRealtimeChatService } from "./realtimeChat";
import useAuthStore from "../state/authStore";
import { withRetry } from "../utils/retryLogic";
import { AppError, ErrorType } from "../utils/errorHandling";
import {
  detectHermesEngine,
  detectHermesPropertyConflicts,
  applyHermesWorkarounds,
} from "../utils/hermesCompatibility";
import { getPropertyConflicts, clearPropertyConflicts } from "../utils/propertyGuards";
import { validatePolyfills, getPolyfillStatus } from "../config/polyfillConfig";

// Initialization phases
export enum InitializationPhase {
  PROPERTY_CONFLICT_DETECTION = "property_conflict_detection",
  HERMES_COMPATIBILITY = "hermes_compatibility",
  POLYFILL_VALIDATION = "polyfill_validation",
  COMPATIBILITY_CHECK = "compatibility_check",
  ENVIRONMENT_VALIDATION = "environment_validation",
  CORE_SERVICES = "core_services",
  AUTHENTICATION = "authentication",
  DATA_STORES = "data_stores",
  OPTIONAL_SERVICES = "optional_services",
  HEALTH_CHECKS = "health_checks",
  FINALIZATION = "finalization",
}

// Service initialization status
export enum ServiceStatus {
  PENDING = "pending",
  INITIALIZING = "initializing",
  READY = "ready",
  FAILED = "failed",
  DEGRADED = "degraded",
  UNAVAILABLE = "unavailable",
}

// Service configuration
interface ServiceConfig {
  name: string;
  required: boolean;
  timeout: number;
  retryAttempts: number;
  dependencies: string[];
  healthCheck?: () => Promise<boolean>;
  initialize: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

// Initialization state
interface InitializationState {
  phase: InitializationPhase;
  progress: number;
  services: Map<string, ServiceStatus>;
  errors: AppError[];
  warnings: string[];
  startTime: number;
  phaseStartTime: number;
  metrics: InitializationMetrics;
}

// Performance metrics
interface InitializationMetrics {
  totalTime: number;
  phaseTimings: Map<InitializationPhase, number>;
  serviceTimings: Map<string, number>;
  memoryUsage: any;
  retryCount: number;
  failureCount: number;
}

// Health check result
interface HealthCheckResult {
  service: string;
  healthy: boolean;
  responseTime: number;
  error?: string;
  details?: any;
}

class InitializationService {
  private static instance: InitializationService;
  private state: InitializationState;
  private services: Map<string, ServiceConfig> = new Map();
  private listeners: ((state: InitializationState) => void)[] = [];
  private initialized = false;

  constructor() {
    this.state = {
      phase: InitializationPhase.COMPATIBILITY_CHECK,
      progress: 0,
      services: new Map(),
      errors: [],
      warnings: [],
      startTime: Date.now(),
      phaseStartTime: Date.now(),
      metrics: {
        totalTime: 0,
        phaseTimings: new Map(),
        serviceTimings: new Map(),
        memoryUsage: null,
        retryCount: 0,
        failureCount: 0,
      },
    };

    this.setupServices();
  }

  static getInstance(): InitializationService {
    if (!InitializationService.instance) {
      InitializationService.instance = new InitializationService();
    }
    return InitializationService.instance;
  }

  /**
   * Setup service configurations
   */
  private setupServices(): void {
    // Core services (required)
    this.registerService({
      name: "compatibility",
      required: true,
      timeout: 5000,
      retryAttempts: 1,
      dependencies: [],
      initialize: this.initializeCompatibilityCheck.bind(this),
      healthCheck: this.checkCompatibilityHealth.bind(this),
    });

    this.registerService({
      name: "environment",
      required: true,
      timeout: 3000,
      retryAttempts: 1,
      dependencies: ["compatibility"],
      initialize: this.initializeEnvironmentValidation.bind(this),
      healthCheck: this.checkEnvironmentHealth.bind(this),
    });

    this.registerService({
      name: "supabase",
      required: true,
      timeout: 10000,
      retryAttempts: 3,
      dependencies: ["environment"],
      initialize: this.initializeSupabase.bind(this),
      healthCheck: this.checkSupabaseHealth.bind(this),
    });

    this.registerService({
      name: "error_reporting",
      required: true,
      timeout: 5000,
      retryAttempts: 2,
      dependencies: ["environment"],
      initialize: this.initializeErrorReporting.bind(this),
      healthCheck: this.checkErrorReportingHealth.bind(this),
    });

    this.registerService({
      name: "auth_store",
      required: true,
      timeout: 8000,
      retryAttempts: 2,
      dependencies: ["supabase"],
      initialize: this.initializeAuthStore.bind(this),
      healthCheck: this.checkAuthStoreHealth.bind(this),
    });

    // Optional services
    this.registerService({
      name: "notifications",
      required: false,
      timeout: 10000,
      retryAttempts: 2,
      dependencies: ["auth_store"],
      initialize: this.initializeNotifications.bind(this),
      healthCheck: this.checkNotificationsHealth.bind(this),
    });

    this.registerService({
      name: "admob",
      required: false,
      timeout: 8000,
      retryAttempts: 2,
      dependencies: [],
      initialize: this.initializeAdMob.bind(this),
      healthCheck: this.checkAdMobHealth.bind(this),
    });

    this.registerService({
      name: "subscriptions",
      required: false,
      timeout: 10000,
      retryAttempts: 2,
      dependencies: ["auth_store"],
      initialize: this.initializeSubscriptions.bind(this),
      healthCheck: this.checkSubscriptionsHealth.bind(this),
    });

    this.registerService({
      name: "realtime_chat",
      required: false,
      timeout: 8000,
      retryAttempts: 2,
      dependencies: ["supabase", "auth_store"],
      initialize: this.initializeRealtimeChat.bind(this),
      healthCheck: this.checkRealtimeChatHealth.bind(this),
    });

    this.registerService({
      name: "background_tasks",
      required: false,
      timeout: 5000,
      retryAttempts: 1,
      dependencies: [],
      initialize: this.initializeBackgroundTasks.bind(this),
      healthCheck: this.checkBackgroundTasksHealth.bind(this),
    });
  }

  /**
   * Register a service for initialization
   */
  registerService(config: ServiceConfig): void {
    this.services.set(config.name, config);
    this.state.services.set(config.name, ServiceStatus.PENDING);
  }

  /**
   * Add initialization state listener
   */
  addStateListener(listener: (state: InitializationState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current initialization state
   */
  getState(): InitializationState {
    return { ...this.state };
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Start the initialization process
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    PerformanceMonitor.startMeasurement("total_initialization");

    try {
      // Property conflict detection must run first
      await this.executePhase(InitializationPhase.PROPERTY_CONFLICT_DETECTION);
      await this.executePhase(InitializationPhase.HERMES_COMPATIBILITY);
      await this.executePhase(InitializationPhase.POLYFILL_VALIDATION);
      await this.executePhase(InitializationPhase.COMPATIBILITY_CHECK);
      await this.executePhase(InitializationPhase.ENVIRONMENT_VALIDATION);
      await this.executePhase(InitializationPhase.CORE_SERVICES);
      await this.executePhase(InitializationPhase.AUTHENTICATION);
      await this.executePhase(InitializationPhase.DATA_STORES);
      await this.executePhase(InitializationPhase.OPTIONAL_SERVICES);
      await this.executePhase(InitializationPhase.HEALTH_CHECKS);
      await this.executePhase(InitializationPhase.FINALIZATION);

      this.initialized = true;
      this.state.metrics.totalTime = PerformanceMonitor.endMeasurement("total_initialization") || 0;
      this.state.progress = 100;

      this.notifyListeners();
    } catch (error) {
      this.state.metrics.failureCount++;
      const appError =
        error instanceof AppError ? error : new AppError(`Initialization failed: ${error}`, ErrorType.SERVER);

      this.state.errors.push(appError);
      console.error("❌ App initialization failed:", error);

      // Attempt graceful degradation
      await this.attemptGracefulDegradation();
      throw appError;
    }
  }

  /**
   * Execute a specific initialization phase
   */
  private async executePhase(phase: InitializationPhase): Promise<void> {
    this.state.phase = phase;
    this.state.phaseStartTime = Date.now();
    this.notifyListeners();

    PerformanceMonitor.startMeasurement(`phase_${phase}`);

    try {
      switch (phase) {
        case InitializationPhase.PROPERTY_CONFLICT_DETECTION:
          await this.initializePropertyConflictDetection();
          break;

        case InitializationPhase.HERMES_COMPATIBILITY:
          await this.initializeHermesCompatibility();
          break;

        case InitializationPhase.POLYFILL_VALIDATION:
          await this.initializePolyfillValidation();
          break;

        case InitializationPhase.COMPATIBILITY_CHECK:
          await this.initializeService("compatibility");
          break;

        case InitializationPhase.ENVIRONMENT_VALIDATION:
          await this.initializeService("environment");
          break;

        case InitializationPhase.CORE_SERVICES:
          await this.initializeService("supabase");
          await this.initializeService("error_reporting");
          break;

        case InitializationPhase.AUTHENTICATION:
          await this.initializeService("auth_store");
          break;

        case InitializationPhase.DATA_STORES:
          // Additional data stores can be initialized here
          break;

        case InitializationPhase.OPTIONAL_SERVICES:
          await this.initializeOptionalServices();
          break;

        case InitializationPhase.HEALTH_CHECKS:
          await this.runHealthChecks();
          break;

        case InitializationPhase.FINALIZATION:
          await this.finalize();
          break;
      }

      const phaseTime = PerformanceMonitor.endMeasurement(`phase_${phase}`) || 0;
      this.state.metrics.phaseTimings.set(phase, phaseTime);
      this.updateProgress();
    } catch (error) {
      console.error(`❌ Phase ${phase} failed:`, error);
      throw error;
    }
  }

  /**
   * Initialize a specific service
   */
  private async initializeService(serviceName: string): Promise<void> {
    const config = this.services.get(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // Check dependencies
    for (const dep of config.dependencies) {
      const depStatus = this.state.services.get(dep);
      if (depStatus !== ServiceStatus.READY) {
        throw new Error(`Service ${serviceName} dependency ${dep} not ready`);
      }
    }

    this.state.services.set(serviceName, ServiceStatus.INITIALIZING);
    this.notifyListeners();

    PerformanceMonitor.startMeasurement(`service_${serviceName}`);

    try {
      await withRetry(
        async () => {
          await Promise.race([
            config.initialize(),
            this.createTimeout(config.timeout, `${serviceName} initialization timeout`),
          ]);
        },
        {
          maxAttempts: config.retryAttempts,
          baseDelay: 1000,
          maxDelay: 5000,
          retryableErrors: ["timeout", "network", "temporary"],
        },
      );

      const serviceTime = PerformanceMonitor.endMeasurement(`service_${serviceName}`) || 0;
      this.state.metrics.serviceTimings.set(serviceName, serviceTime);

      this.state.services.set(serviceName, ServiceStatus.READY);
    } catch (error) {
      this.state.metrics.retryCount++;

      if (config.required) {
        this.state.services.set(serviceName, ServiceStatus.FAILED);
        throw new AppError(`Required service ${serviceName} failed to initialize: ${error}`, ErrorType.SERVER);
      } else {
        this.state.services.set(serviceName, ServiceStatus.DEGRADED);
        this.state.warnings.push(`Optional service ${serviceName} failed: ${error}`);
      }
    }
  }

  /**
   * Initialize optional services with parallel execution
   */
  private async initializeOptionalServices(): Promise<void> {
    const optionalServices = ["notifications", "admob", "subscriptions", "realtime_chat", "background_tasks"];

    // Initialize optional services in parallel for better performance
    const promises = optionalServices.map(async (serviceName) => {
      try {
        await this.initializeService(serviceName);
      } catch (error) {}
    });

    await Promise.allSettled(promises);
  }

  /**
   * Run comprehensive health checks
   */
  private async runHealthChecks(): Promise<void> {
    const healthChecks: Promise<HealthCheckResult>[] = [];

    for (const [serviceName, config] of this.services) {
      if (this.state.services.get(serviceName) === ServiceStatus.READY && config.healthCheck) {
        healthChecks.push(this.runServiceHealthCheck(serviceName, config));
      }
    }

    const results = await Promise.allSettled(healthChecks);
    let healthyServices = 0;
    let totalServices = results.length;

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.healthy) {
        healthyServices++;
      } else {
        const serviceName = Array.from(this.services.keys())[index];
        this.state.warnings.push(`Health check failed for ${serviceName}`);
      }
    });
  }

  /**
   * Run health check for a specific service
   */
  private async runServiceHealthCheck(serviceName: string, config: ServiceConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await config.healthCheck!();
      return {
        service: serviceName,
        healthy: isHealthy,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: serviceName,
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Finalization phase
   */
  private async finalize(): Promise<void> {
    // Record memory usage
    this.state.metrics.memoryUsage = PerformanceMonitor.getMemoryUsage();

    // Apply any final optimizations
    compatibilityChecker.applyWorkarounds();
  }

  /**
   * Attempt graceful degradation on initialization failure
   */
  private async attemptGracefulDegradation(): Promise<void> {
    // Try to keep essential services running
    const criticalServices = ["supabase", "error_reporting", "auth_store"];
    let criticalServicesReady = 0;

    for (const service of criticalServices) {
      if (this.state.services.get(service) === ServiceStatus.READY) {
        criticalServicesReady++;
      }
    }

    if (criticalServicesReady >= 2) {
      this.state.warnings.push("Running in degraded mode - some features may not be available");
      this.initialized = true;
    } else {
    }
  }

  /**
   * Update initialization progress
   */
  private updateProgress(): void {
    const totalServices = this.services.size;
    const readyServices = Array.from(this.state.services.values()).filter(
      (status) => status === ServiceStatus.READY,
    ).length;

    this.state.progress = Math.round((readyServices / totalServices) * 100);
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error("Listener error:", error);
      }
    });
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  // Service initialization methods

  private async initializePropertyConflictDetection(): Promise<void> {
    try {
      // Get any property conflicts that occurred during app startup
      const conflicts = getPropertyConflicts();

      if (conflicts.length > 0) {
        // Log each conflict for debugging
        for (const conflict of conflicts) {
        }

        // For now, continue initialization but track the issues
        // In production, we might want to halt initialization for critical conflicts
        this.state.warnings.push("Property conflicts detected during startup");
      } else {
      }

      // Clear conflicts for the next phase
      clearPropertyConflicts();
    } catch (error) {
      console.error("[InitializationService] Property conflict detection failed:", error);
      throw new AppError("Property conflict detection failed", ErrorType.SERVER);
    }
  }

  private async initializeHermesCompatibility(): Promise<void> {
    try {
      // Detect Hermes engine and get engine info
      const hermesInfo = detectHermesEngine();
      if (hermesInfo.isHermes) {
        // Detect any Hermes-specific property conflicts
        const hermesIssues = detectHermesPropertyConflicts();

        if (hermesIssues.length > 0) {
          // Apply workarounds for critical issues
          const criticalIssues = hermesIssues.filter((issue) => issue.severity === "critical");
          if (criticalIssues.length > 0) {
            applyHermesWorkarounds();
          }

          // Track non-critical issues as warnings
          for (const issue of hermesIssues) {
            if (issue.severity !== "critical") {
              this.state.warnings.push(`Hermes compatibility issue: ${issue.description}`);
            }
          }
        }
      } else {
      }
    } catch (error) {
      console.error("[InitializationService] Hermes compatibility check failed:", error);
      // Don't throw for Hermes compatibility issues, just log and continue
      this.state.warnings.push("Hermes compatibility check failed");
    }
  }

  private async initializePolyfillValidation(): Promise<void> {
    try {
      // Validate that all required polyfills are working
      const polyfillsValid = validatePolyfills();

      if (!polyfillsValid) {
        // Get detailed status of each polyfill
        const polyfillStatus = getPolyfillStatus();
        // Check for critical polyfill failures
        const failedPolyfills = Object.entries(polyfillStatus)
          .filter(([name, status]) => !status)
          .map(([name]) => name);

        if (failedPolyfills.length > 0) {
          console.error("[InitializationService] Failed polyfills:", failedPolyfills);

          // For now, continue with warnings, but in production we might want to fail
          for (const polyfill of failedPolyfills) {
            this.state.warnings.push(`Polyfill validation failed: ${polyfill}`);
          }
        }
      } else {
      }
    } catch (error) {
      console.error("[InitializationService] Polyfill validation failed:", error);
      throw new AppError("Polyfill validation failed", ErrorType.SERVER);
    }
  }

  private async initializeCompatibilityCheck(): Promise<void> {
    const result = compatibilityChecker.checkCompatibility();
    if (!result.isCompatible) {
      throw new Error(`Compatibility check failed: ${result.issues.map((i) => i.description).join(", ")}`);
    }
  }

  private async initializeEnvironmentValidation(): Promise<void> {
    // Environment validation is handled by the compatibility check
    // Additional validation can be added here
  }

  private async initializeSupabase(): Promise<void> {
    const healthResult = await performHealthCheck();
    if (!healthResult.healthy) {
      // Log detailed health check results for debugging
      console.error("Supabase health check details:", healthResult.details);
      throw new Error(`Supabase health check failed: ${JSON.stringify(healthResult.details)}`);
    }

    // Log successful initialization with any warnings
    if (healthResult.details && !healthResult.details.realtime) {
      console.log("Supabase initialized with warnings: realtime not available");
    } else {
      console.log("Supabase fully initialized");
    }
  }

  private async initializeErrorReporting(): Promise<void> {
    await errorReportingService.initialize();
  }

  private async initializeAuthStore(): Promise<void> {
    const authStore = useAuthStore.getState();
    // Initialize the auth listener which handles session restoration
    authStore.initializeAuthListener();
    // Wait a moment for the auth listener to process any existing session
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async initializeNotifications(): Promise<void> {
    await notificationService.initialize();
  }

  private async initializeAdMob(): Promise<void> {
    await adMobService.initialize();
  }

  private async initializeSubscriptions(): Promise<void> {
    // Subscription service doesn't have an initialize method, it's ready to use
    // Subscription store also doesn't have an initialize method, so we just mark it as ready
  }

  private async initializeRealtimeChat(): Promise<void> {
    await enhancedRealtimeChatService.initialize();
  }

  /**
   * Initialize background tasks with proper error handling
   */
  private async initializeBackgroundTasks(): Promise<void> {
    try {
      // Check if expo-task-manager is available before importing
      try {
        await import("expo-task-manager");
      } catch (importError) {
        // This is expected if expo-task-manager is not installed
      }
    } catch (error) {
      // Don't throw error for background task failures
    }
  }

  /**
   * Check background tasks health
   */
  private async checkBackgroundTasksHealth(): Promise<boolean> {
    try {
      // Check if expo-task-manager is available
      try {
        await import("expo-task-manager");
        return true;
      } catch (importError) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Health check methods

  private async checkCompatibilityHealth(): Promise<boolean> {
    return compatibilityChecker.checkCompatibility().isCompatible;
  }

  private async checkEnvironmentHealth(): Promise<boolean> {
    return true; // Environment is validated during compatibility check
  }

  private async checkSupabaseHealth(): Promise<boolean> {
    const result = await performHealthCheck();
    return result.healthy;
  }

  private async checkErrorReportingHealth(): Promise<boolean> {
    return errorReportingService.isInitialized();
  }

  private async checkAuthStoreHealth(): Promise<boolean> {
    // Check if auth store is properly initialized by checking if it has a user or is not loading
    const authState = useAuthStore.getState();
    return !authState.isLoading;
  }

  private async checkNotificationsHealth(): Promise<boolean> {
    // Check if notification service has been initialized (private property, so we assume it's healthy if no errors)
    return true;
  }

  private async checkAdMobHealth(): Promise<boolean> {
    // Check if AdMob service has been initialized (private property, so we assume it's healthy if no errors)
    return true;
  }

  private async checkSubscriptionsHealth(): Promise<boolean> {
    // Check if subscription service is available (no isInitialized method, so we assume it's healthy if no errors)
    return true;
  }

  private async checkRealtimeChatHealth(): Promise<boolean> {
    return enhancedRealtimeChatService.getConnectionStatus() === "connected";
  }

  /**
   * Cleanup all services (for app shutdown)
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    for (const [serviceName, config] of this.services) {
      if (config.cleanup && this.state.services.get(serviceName) === ServiceStatus.READY) {
        cleanupPromises.push(config.cleanup().catch((error) => {}));
      }
    }

    await Promise.allSettled(cleanupPromises);
  }
}

// Export singleton instance
export const initializationService = InitializationService.getInstance();

// Export types and enums
export type { InitializationState, InitializationMetrics, HealthCheckResult };

export default initializationService;
