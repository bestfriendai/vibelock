import { performanceMonitor } from "../utils/performance";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ComponentInstance {
  name: string;
  id: string;
  mountTime: number;
  unmountTime?: number;
  memoryUsage?: number;
}

interface Subscription {
  id: string;
  type: string;
  createdAt: number;
  component: string;
}

interface Timer {
  id: NodeJS.Timeout;
  type: "timeout" | "interval";
  createdAt: number;
  component: string;
  duration?: number;
}

interface MemoryThresholds {
  warning: number;
  critical: number;
  maxCacheSize: number;
}

interface MemoryReport {
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  componentCount: number;
  subscriptionCount: number;
  timerCount: number;
  leaks: MemoryLeak[];
  timestamp: number;
}

interface MemoryLeak {
  type: "component" | "subscription" | "timer" | "cache";
  id: string;
  description: string;
  duration: number;
  severity: "low" | "medium" | "high";
}

export class MemoryManager {
  private componentInstances: Map<string, ComponentInstance> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private timers: Map<NodeJS.Timeout, Timer> = new Map();
  private memorySnapshots: number[] = [];
  private leakDetectionInterval: NodeJS.Timeout | null = null;
  private thresholds: MemoryThresholds;
  private lastGCTime: number = Date.now();
  private memoryAlerts: Set<string> = new Set();
  private cacheRegistry: Map<string, { size: number; lastAccess: number }> = new Map();

  constructor() {
    this.thresholds = {
      warning: 0.7, // 70% of device memory
      critical: 0.85, // 85% of device memory
      maxCacheSize: 50 * 1024 * 1024, // 50MB max cache
    };

    this.initializeMemoryMonitoring();
  }

  private async initializeMemoryMonitoring() {
    // Load saved thresholds
    try {
      const saved = await AsyncStorage.getItem("memoryThresholds");
      if (saved) {
        this.thresholds = { ...this.thresholds, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("Failed to load memory thresholds:", error);
    }

    // Start leak detection
    this.startLeakDetection();
  }

  /**
   * Track a component instance
   */
  trackComponent(componentName: string, instanceId: string): void {
    const existing = this.componentInstances.get(instanceId);
    if (existing && !existing.unmountTime) {
      console.warn(`Component ${componentName} is already tracked and not unmounted`);
      // Clean up the existing instance before tracking new one
      this.componentInstances.delete(instanceId);
    }

    this.componentInstances.set(instanceId, {
      name: componentName,
      id: instanceId,
      mountTime: Date.now(),
      memoryUsage: this.estimateComponentMemory(componentName),
    });

    performanceMonitor.recordMetric("componentMount", {
      component: componentName,
      instanceId,
      totalComponents: this.componentInstances.size,
    });
  }

  /**
   * Untrack a component instance
   */
  untrackComponent(instanceId: string): void {
    const component = this.componentInstances.get(instanceId);
    if (!component) {
      return;
    }

    if (component.unmountTime) {
      return;
    }

    component.unmountTime = Date.now();
    const lifetime = component.unmountTime - component.mountTime;

    performanceMonitor.recordMetric("componentUnmount", {
      component: component.name,
      instanceId,
      lifetime,
      totalComponents: this.componentInstances.size,
    });

    // Clean up after a delay to detect potential leaks
    setTimeout(() => {
      const comp = this.componentInstances.get(instanceId);
      if (comp && comp.unmountTime) {
        this.componentInstances.delete(instanceId);
      }
    }, 5000);
  }

  /**
   * Track a subscription
   */
  trackSubscription(id: string, type: string, component: string): void {
    this.subscriptions.set(id, {
      id,
      type,
      createdAt: Date.now(),
      component,
    });
  }

  /**
   * Untrack a subscription
   */
  untrackSubscription(id: string): void {
    this.subscriptions.delete(id);
  }

  /**
   * Track a timer
   */
  trackTimer(id: NodeJS.Timeout, type: "timeout" | "interval", component: string, duration?: number): void {
    this.timers.set(id, {
      id,
      type,
      createdAt: Date.now(),
      component,
      duration,
    });
  }

  /**
   * Untrack a timer
   */
  untrackTimer(id: NodeJS.Timeout): void {
    this.timers.delete(id);
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    const now = Date.now();

    // Check for unmounted components still in memory
    this.componentInstances.forEach((component, id) => {
      if (component.unmountTime) {
        const timeSinceUnmount = now - component.unmountTime;
        if (timeSinceUnmount > 10000) {
          // 10 seconds
          leaks.push({
            type: "component",
            id,
            description: `Component ${component.name} not cleaned up after unmount`,
            duration: timeSinceUnmount,
            severity: timeSinceUnmount > 30000 ? "high" : "medium",
          });
        }
      } else {
        const lifetime = now - component.mountTime;
        if (lifetime > 300000) {
          // 5 minutes
          leaks.push({
            type: "component",
            id,
            description: `Component ${component.name} mounted for too long`,
            duration: lifetime,
            severity: lifetime > 600000 ? "high" : "low",
          });
        }
      }
    });

    // Check for orphaned subscriptions
    this.subscriptions.forEach((sub, id) => {
      const age = now - sub.createdAt;
      if (age > 300000) {
        // 5 minutes
        leaks.push({
          type: "subscription",
          id,
          description: `${sub.type} subscription from ${sub.component} is orphaned`,
          duration: age,
          severity: age > 600000 ? "high" : "medium",
        });
      }
    });

    // Check for long-running timers
    this.timers.forEach((timer) => {
      const age = now - timer.createdAt;
      if (timer.type === "interval" && age > 300000) {
        // 5 minutes for intervals
        leaks.push({
          type: "timer",
          id: timer.id.toString(),
          description: `Long-running interval from ${timer.component}`,
          duration: age,
          severity: age > 600000 ? "high" : "medium",
        });
      } else if (timer.type === "timeout" && timer.duration && timer.duration > 60000 && age > timer.duration + 10000) {
        leaks.push({
          type: "timer",
          id: timer.id.toString(),
          description: `Timeout from ${timer.component} should have fired`,
          duration: age,
          severity: "medium",
        });
      }
    });

    // Check cache sizes
    let totalCacheSize = 0;
    this.cacheRegistry.forEach((cache, name) => {
      totalCacheSize += cache.size;
      const age = now - cache.lastAccess;
      if (age > 600000 && cache.size > 1024 * 1024) {
        // 10 minutes and > 1MB
        leaks.push({
          type: "cache",
          id: name,
          description: `Cache ${name} not accessed recently (${Math.round(cache.size / 1024)}KB)`,
          duration: age,
          severity: cache.size > 5 * 1024 * 1024 ? "high" : "low",
        });
      }
    });

    if (totalCacheSize > this.thresholds.maxCacheSize) {
      leaks.push({
        type: "cache",
        id: "total",
        description: `Total cache size exceeded (${Math.round(totalCacheSize / 1024 / 1024)}MB)`,
        duration: 0,
        severity: "high",
      });
    }

    return leaks;
  }

  /**
   * Get current memory usage
   */
  async getMemoryUsage(): Promise<{ used: number; total: number; percentage: number }> {
    // This would use actual device memory APIs
    // For now, simulate with estimates
    const used = this.estimateMemoryUsage();
    const total = 4096 * 1024 * 1024; // 4GB simulated

    return {
      used,
      total,
      percentage: used / total,
    };
  }

  /**
   * Force cleanup of resources
   */
  async forceCleanup(): Promise<number> {
    const startSize = this.componentInstances.size + this.subscriptions.size + this.timers.size;

    // Clean up old unmounted components
    const now = Date.now();
    const toDelete: string[] = [];

    this.componentInstances.forEach((component, id) => {
      if (component.unmountTime && now - component.unmountTime > 5000) {
        toDelete.push(id);
      }
    });

    toDelete.forEach((id) => this.componentInstances.delete(id));

    // Clean up old subscriptions
    const subToDelete: string[] = [];
    this.subscriptions.forEach((sub, id) => {
      if (now - sub.createdAt > 600000) {
        // 10 minutes
        subToDelete.push(id);
      }
    });

    subToDelete.forEach((id) => this.subscriptions.delete(id));

    // Clean up old cache entries
    const cacheToDelete: string[] = [];
    this.cacheRegistry.forEach((cache, name) => {
      if (now - cache.lastAccess > 600000) {
        // 10 minutes
        cacheToDelete.push(name);
      }
    });

    cacheToDelete.forEach((name) => this.cacheRegistry.delete(name));

    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
      this.lastGCTime = now;
    }

    const endSize = this.componentInstances.size + this.subscriptions.size + this.timers.size;
    const cleaned = startSize - endSize;

    performanceMonitor.recordMetric("memoryCleanup", {
      cleaned,
      remaining: endSize,
      cachesCleaned: cacheToDelete.length,
    });

    return cleaned;
  }

  /**
   * Get detailed memory report
   */
  async getMemoryReport(): Promise<MemoryReport> {
    const memoryUsage = await this.getMemoryUsage();
    const leaks = this.detectLeaks();

    return {
      totalMemory: memoryUsage.total,
      usedMemory: memoryUsage.used,
      availableMemory: memoryUsage.total - memoryUsage.used,
      componentCount: this.componentInstances.size,
      subscriptionCount: this.subscriptions.size,
      timerCount: this.timers.size,
      leaks,
      timestamp: Date.now(),
    };
  }

  /**
   * Register a cache for monitoring
   */
  registerCache(name: string, size: number): void {
    this.cacheRegistry.set(name, {
      size,
      lastAccess: Date.now(),
    });
  }

  /**
   * Update cache access time
   */
  updateCacheAccess(name: string): void {
    const cache = this.cacheRegistry.get(name);
    if (cache) {
      cache.lastAccess = Date.now();
    }
  }

  /**
   * Check if memory threshold is exceeded
   */
  async checkMemoryPressure(): Promise<"normal" | "warning" | "critical"> {
    const usage = await this.getMemoryUsage();

    if (usage.percentage > this.thresholds.critical) {
      this.alertMemoryPressure("critical", usage.percentage);
      return "critical";
    } else if (usage.percentage > this.thresholds.warning) {
      this.alertMemoryPressure("warning", usage.percentage);
      return "warning";
    }

    return "normal";
  }

  /**
   * Start automatic leak detection
   */
  private startLeakDetection(): void {
    if (this.leakDetectionInterval) {
      return;
    }

    this.leakDetectionInterval = setInterval(async () => {
      const leaks = this.detectLeaks();

      if (leaks.length > 0) {
        const highSeverityLeaks = leaks.filter((l) => l.severity === "high");

        if (highSeverityLeaks.length > 0) {
          await this.forceCleanup();
        }

        performanceMonitor.recordMetric("memoryLeaks", {
          count: leaks.length,
          high: highSeverityLeaks.length,
          types: Array.from(new Set(leaks.map((l) => l.type))),
        });
      }

      // Check memory pressure
      const pressure = await this.checkMemoryPressure();
      if (pressure === "critical") {
        await this.forceCleanup();
      }

      // Record memory snapshot
      this.recordMemorySnapshot();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop leak detection
   */
  stopLeakDetection(): void {
    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
      this.leakDetectionInterval = null;
    }
  }

  /**
   * Estimate component memory usage
   */
  private estimateComponentMemory(componentName: string): number {
    // Rough estimates based on component type
    const estimates: Record<string, number> = {
      ChatRoomScreen: 5 * 1024 * 1024, // 5MB
      EnhancedMessageBubble: 50 * 1024, // 50KB per message
      MessageInput: 1 * 1024 * 1024, // 1MB
      FlashList: 2 * 1024 * 1024, // 2MB
      Modal: 1 * 1024 * 1024, // 1MB
      default: 100 * 1024, // 100KB default
    };

    return estimates[componentName] ?? estimates["default"] ?? 102400;
  }

  /**
   * Estimate total memory usage
   */
  private estimateMemoryUsage(): number {
    let total = 0;

    // Component memory
    this.componentInstances.forEach((component) => {
      if (!component.unmountTime) {
        total += component.memoryUsage || 0;
      }
    });

    // Subscription memory (rough estimate)
    total += this.subscriptions.size * 10 * 1024; // 10KB per subscription

    // Timer memory (rough estimate)
    total += this.timers.size * 5 * 1024; // 5KB per timer

    // Cache memory
    this.cacheRegistry.forEach((cache) => {
      total += cache.size;
    });

    return total;
  }

  /**
   * Record memory snapshot
   */
  private recordMemorySnapshot(): void {
    const usage = this.estimateMemoryUsage();
    this.memorySnapshots.push(usage);

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }

    // Check for memory growth trend
    if (this.memorySnapshots.length >= 10) {
      const recent = this.memorySnapshots.slice(-10);
      const lastValue = recent[recent.length - 1];
      const firstValue = recent[0];
      if (lastValue !== undefined && firstValue !== undefined) {
        const growth = lastValue - firstValue;

        if (growth > 10 * 1024 * 1024) {
          // 10MB growth
          console.warn(`Memory growth detected: ${(growth / 1024 / 1024).toFixed(2)} MB growth`);
        }
      }
    }
  }

  /**
   * Alert memory pressure
   */
  private alertMemoryPressure(level: "warning" | "critical", percentage: number): void {
    const alertKey = `${level}-${Math.floor(percentage * 10)}`;

    if (!this.memoryAlerts.has(alertKey)) {
      this.memoryAlerts.add(alertKey);

      console.warn(`${level} memory pressure: ${(percentage * 100).toFixed(1)}% usage`);

      performanceMonitor.recordMetric("memoryPressure", {
        level,
        percentage,
        timestamp: Date.now(),
      });

      // Clear alert after 5 minutes
      setTimeout(() => {
        this.memoryAlerts.delete(alertKey);
      }, 300000);
    }
  }

  /**
   * Get memory trends
   */
  getMemoryTrends(): { snapshots: number[]; trend: "stable" | "growing" | "shrinking" } {
    if (this.memorySnapshots.length < 2) {
      return { snapshots: this.memorySnapshots, trend: "stable" };
    }

    const recent = this.memorySnapshots.slice(-10);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const first = recent[0];
    const last = recent[recent.length - 1];

    let trend: "stable" | "growing" | "shrinking" = "stable";

    if (first !== undefined && last !== undefined) {
      if (last > first * 1.1) {
        trend = "growing";
      } else if (last < first * 0.9) {
        trend = "shrinking";
      }
    }

    return { snapshots: this.memorySnapshots, trend };
  }

  /**
   * Clear all tracking data
   */
  clearAll(): void {
    this.componentInstances.clear();
    this.subscriptions.clear();
    this.timers.clear();
    this.cacheRegistry.clear();
    this.memorySnapshots = [];
    this.memoryAlerts.clear();
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
