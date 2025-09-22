// Enhanced performance monitor utility with real-time metrics and alerts
// Provides comprehensive performance tracking for large message lists

import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Simple memoization utility for expensive operations
 */
export class Memoizer {
  private static cache = new Map<string, { value: any; timestamp: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyFn: (...args: Parameters<T>) => string,
    ttl: number = Memoizer.DEFAULT_TTL,
  ): T {
    return ((...args: Parameters<T>) => {
      const key = keyFn(...args);
      const cached = Memoizer.cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }

      const result = fn(...args);
      Memoizer.cache.set(key, { value: result, timestamp: Date.now() });
      return result;
    }) as T;
  }

  static clear(): void {
    Memoizer.cache.clear();
  }
}

/**
 * Debounce utility for performance-critical operations
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate: boolean = false): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  }) as T;
}

export interface PerformanceMetrics {
  renderTime: number;
  scrollLag: number;
  memoryUsage: number;
  fps: number;
  networkLatency: number;
  timestamp: number;
}

interface PerformanceThresholds {
  renderTime: number; // Max render time in ms (default: 16ms for 60fps)
  scrollLag: number; // Max scroll lag in ms (default: 100ms)
  memoryUsage: number; // Max memory usage percentage (default: 0.8)
  fps: number; // Min FPS (default: 30)
  networkLatency: number; // Max network latency in ms (default: 1000ms)
}

interface DetailedMetric {
  label: string;
  samples: number[];
  average: number;
  min: number;
  max: number;
  p95: number;
  lastValue: number;
  trend: "improving" | "stable" | "degrading";
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private detailedMetrics: Map<string, DetailedMetric> = new Map();
  private thresholds: PerformanceThresholds;
  private fpsInterval: NodeJS.Timeout | { stop: () => void } | null = null;
  private currentFPS: number = 60;
  private frameTimestamps: number[] = [];
  private memoryInterval: NodeJS.Timeout | null = null;
  private currentMemoryUsage: number = 0;
  private performanceBaseline: Map<string, number> = new Map();
  private alertCallbacks: Set<(alert: PerformanceAlert) => void> = new Set();
  private networkMetrics: Map<string, number[]> = new Map();
  private interactionMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.thresholds = {
      renderTime: 16,
      scrollLag: 100,
      memoryUsage: 0.8,
      fps: 30,
      networkLatency: 1000,
    };

    this.loadBaseline();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  start(label: string): () => number {
    const startTime = globalThis.performance?.now?.() ?? Date.now();
    return () => {
      const endTime = globalThis.performance?.now?.() ?? Date.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(label)) this.metrics.set(label, []);
      this.metrics.get(label)!.push(duration);

      // Update detailed metrics
      this.updateDetailedMetric(label, duration);

      // Check thresholds
      if (label.includes("render") && duration > this.thresholds.renderTime) {
        this.triggerAlert("render", duration, this.thresholds.renderTime);
      } else if (label.includes("scroll") && duration > this.thresholds.scrollLag) {
        this.triggerAlert("scroll", duration, this.thresholds.scrollLag);
      } else if (duration > 100) {
        console.warn(`${label} took ${duration}ms`);
      }

      return duration;
    };
  }

  /**
   * Track render time for a component
   */
  trackRenderTime(componentName: string, renderFunction: () => void): number {
    const stop = this.start(`render-${componentName}`);
    renderFunction();
    const duration = stop();
    return duration;
  }

  /**
   * Track scroll performance
   */
  trackScrollPerformance(listName: string, scrollHandler: () => void): number {
    const stop = this.start(`scroll-${listName}`);
    scrollHandler();
    const duration = stop();
    return duration;
  }

  /**
   * Track memory usage
   */
  async trackMemoryUsage(): Promise<number> {
    // Simulate memory tracking (would use actual device APIs)
    const used = this.estimateMemoryUsage();
    const total = 4096 * 1024 * 1024; // 4GB simulated
    const percentage = used / total;

    this.currentMemoryUsage = percentage;

    if (percentage > this.thresholds.memoryUsage) {
      this.triggerAlert("memory", percentage, this.thresholds.memoryUsage);
    }

    return percentage;
  }

  /**
   * Set performance thresholds
   */
  setPerformanceThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    this.saveThresholds();
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics(): Map<string, DetailedMetric> {
    return new Map(this.detailedMetrics);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): PerformanceReport {
    const metrics = Array.from(this.detailedMetrics.values());
    const memoryTrend = this.analyzeMemoryTrend();
    const fpsTrend = this.analyzeFPSTrend();
    const networkStats = this.getNetworkStats();
    const interactionStats = this.getInteractionStats();

    return {
      timestamp: Date.now(),
      metrics,
      memoryTrend,
      fpsTrend,
      networkStats,
      interactionStats,
      summary: this.generateSummary(metrics),
      recommendations: this.generateRecommendations(metrics),
    };
  }

  /**
   * Start FPS monitoring
   */
  startFPSMonitoring(): void {
    if (this.fpsInterval) return;

    let lastTime = performance.now();
    let frames = 0;
    let rafHandle: number | null = null;
    let stopRequested = false;

    const measureFPS = () => {
      // Check if stop was requested
      if (stopRequested) {
        this.fpsInterval = null;
        return;
      }

      const currentTime = performance.now();
      frames++;

      if (currentTime >= lastTime + 1000) {
        this.currentFPS = Math.round((frames * 1000) / (currentTime - lastTime));
        this.frameTimestamps.push(this.currentFPS);

        if (this.frameTimestamps.length > 60) {
          this.frameTimestamps.shift();
        }

        if (this.currentFPS < this.thresholds.fps) {
          this.triggerAlert("fps", this.currentFPS, this.thresholds.fps);
        }

        frames = 0;
        lastTime = currentTime;
      }

      rafHandle = requestAnimationFrame(measureFPS);
    };

    // Store a reference to stop the monitoring
    this.fpsInterval = {
      stop: () => {
        stopRequested = true;
        if (rafHandle !== null) {
          cancelAnimationFrame(rafHandle);
        }
      },
    } as any;

    requestAnimationFrame(measureFPS);
  }

  /**
   * Stop FPS monitoring
   */
  stopFPSMonitoring(): void {
    if (this.fpsInterval) {
      if (typeof this.fpsInterval === "object" && "stop" in this.fpsInterval) {
        this.fpsInterval.stop();
      } else {
        clearInterval(this.fpsInterval);
      }
      this.fpsInterval = null;
    }
  }

  /**
   * Track network performance
   */
  trackNetworkPerformance(operation: string, latency: number): void {
    if (!this.networkMetrics.has(operation)) {
      this.networkMetrics.set(operation, []);
    }

    this.networkMetrics.get(operation)!.push(latency);

    if (latency > this.thresholds.networkLatency) {
      this.triggerAlert("network", latency, this.thresholds.networkLatency);
    }
  }

  /**
   * Track user interaction
   */
  trackInteraction(type: string, responseTime: number): void {
    if (!this.interactionMetrics.has(type)) {
      this.interactionMetrics.set(type, []);
    }

    this.interactionMetrics.get(type)!.push(responseTime);
  }

  /**
   * Record a metric
   */
  recordMetric(name: string, value: any): void {
    const key = `metric-${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const numValue = typeof value === "number" ? value : JSON.stringify(value).length;
    this.metrics.get(key)!.push(numValue);
    this.updateDetailedMetric(key, numValue);
  }

  /**
   * Update detailed metric
   */
  private updateDetailedMetric(label: string, value: number): void {
    let metric = this.detailedMetrics.get(label);

    if (!metric) {
      metric = {
        label,
        samples: [],
        average: 0,
        min: value,
        max: value,
        p95: value,
        lastValue: value,
        trend: "stable",
      };
      this.detailedMetrics.set(label, metric);
    }

    metric.samples.push(value);
    if (metric.samples.length > 100) {
      metric.samples.shift();
    }

    metric.lastValue = value;
    metric.min = Math.min(...metric.samples);
    metric.max = Math.max(...metric.samples);
    metric.average = metric.samples.reduce((a, b) => a + b, 0) / metric.samples.length;
    metric.p95 = this.calculatePercentile(metric.samples, 95);
    metric.trend = this.analyzeTrend(metric.samples);
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Analyze trend
   */
  private analyzeTrend(samples: number[]): "improving" | "stable" | "degrading" {
    if (samples.length < 10) return "stable";

    const recent = samples.slice(-10);
    const older = samples.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    if (recentAvg < olderAvg * 0.9) return "improving";
    if (recentAvg > olderAvg * 1.1) return "degrading";
    return "stable";
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(type: string, value: number, threshold: number): void {
    const alert: PerformanceAlert = {
      type,
      value,
      threshold,
      severity: value > threshold * 1.5 ? "critical" : "warning",
      timestamp: Date.now(),
    };

    console.warn(`Performance alert: ${type} = ${value}ms (threshold: ${threshold}ms)`);

    this.alertCallbacks.forEach((callback) => callback(alert));
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  /**
   * Estimate memory usage (simulated)
   */
  private estimateMemoryUsage(): number {
    // This would use actual device memory APIs
    // For now, simulate based on metrics
    const metricCount = this.metrics.size;
    const sampleCount = Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0);
    return metricCount * 1024 + sampleCount * 8; // Rough estimate in bytes
  }

  /**
   * Analyze memory trend
   */
  private analyzeMemoryTrend(): "stable" | "growing" | "shrinking" {
    // Simplified trend analysis
    return "stable";
  }

  /**
   * Analyze FPS trend
   */
  private analyzeFPSTrend(): "stable" | "improving" | "degrading" {
    if (this.frameTimestamps.length < 10) return "stable";
    return this.analyzeTrend(this.frameTimestamps);
  }

  /**
   * Get network statistics
   */
  private getNetworkStats(): NetworkStats {
    const stats: NetworkStats = {
      operations: {},
    };

    let totalLatency = 0;
    let totalSamples = 0;

    this.networkMetrics.forEach((values, operation) => {
      const operationAverage = values.reduce((a, b) => a + b, 0) / values.length;
      stats.operations[operation] = {
        average: operationAverage,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.calculatePercentile(values, 95),
      };

      // Accumulate for overall average
      totalLatency += values.reduce((a, b) => a + b, 0);
      totalSamples += values.length;
    });

    // Calculate overall average latency
    if (totalSamples > 0) {
      stats.averageLatency = totalLatency / totalSamples;
    }

    return stats;
  }

  /**
   * Get interaction statistics
   */
  private getInteractionStats(): InteractionStats {
    const stats: InteractionStats = {
      interactions: {},
    };

    this.interactionMetrics.forEach((values, type) => {
      stats.interactions[type] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    return stats;
  }

  /**
   * Generate summary
   */
  private generateSummary(metrics: DetailedMetric[]): string {
    const slowOperations = metrics.filter((m) => m.average > 100).length;
    const degradingOperations = metrics.filter((m) => m.trend === "degrading").length;

    if (slowOperations === 0 && degradingOperations === 0) {
      return "Performance is optimal";
    } else if (slowOperations > 5 || degradingOperations > 3) {
      return "Performance issues detected - optimization recommended";
    } else {
      return "Performance is acceptable with minor issues";
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: DetailedMetric[]): string[] {
    const recommendations: string[] = [];

    // Check for slow renders
    const renderMetrics = metrics.filter((m) => m.label.includes("render"));
    const slowRenders = renderMetrics.filter((m) => m.average > this.thresholds.renderTime);
    if (slowRenders.length > 0) {
      recommendations.push("Optimize component rendering - consider memoization");
    }

    // Check for scroll lag
    const scrollMetrics = metrics.filter((m) => m.label.includes("scroll"));
    const laggyScrolls = scrollMetrics.filter((m) => m.average > this.thresholds.scrollLag);
    if (laggyScrolls.length > 0) {
      recommendations.push("Improve scroll performance - reduce windowSize or item complexity");
    }

    // Check memory usage
    if (this.currentMemoryUsage > this.thresholds.memoryUsage) {
      recommendations.push("High memory usage detected - implement cleanup strategies");
    }

    // Check FPS
    if (this.currentFPS < this.thresholds.fps) {
      recommendations.push("Low FPS detected - reduce animations or visual effects");
    }

    return recommendations;
  }

  /**
   * Load performance baseline
   */
  private async loadBaseline(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem("performanceBaseline");
      if (saved) {
        const baseline = JSON.parse(saved);
        Object.entries(baseline).forEach(([key, value]) => {
          this.performanceBaseline.set(key, value as number);
        });
      }
    } catch (error) {
      console.error("Failed to load performance baseline:", error);
    }
  }

  /**
   * Save performance thresholds
   */
  private async saveThresholds(): Promise<void> {
    try {
      await AsyncStorage.setItem("performanceThresholds", JSON.stringify(this.thresholds));
    } catch (error) {
      console.error("Failed to save performance thresholds:", error);
    }
  }

  /**
   * Compare to baseline
   */
  compareToBaseline(label: string, value: number): "better" | "similar" | "worse" {
    const baseline = this.performanceBaseline.get(label);
    if (!baseline) return "similar";

    if (value < baseline * 0.9) return "better";
    if (value > baseline * 1.1) return "worse";
    return "similar";
  }

  average(label: string): number {
    const arr = this.metrics.get(label) || [];
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.detailedMetrics.clear();
    this.networkMetrics.clear();
    this.interactionMetrics.clear();
    this.frameTimestamps = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const data = {
      metrics: Array.from(this.metrics.entries()),
      detailedMetrics: Array.from(this.detailedMetrics.entries()),
      networkMetrics: Array.from(this.networkMetrics.entries()),
      interactionMetrics: Array.from(this.interactionMetrics.entries()),
      timestamp: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  }
}

// Type definitions
interface PerformanceAlert {
  type: string;
  value: number;
  threshold: number;
  severity: "warning" | "critical";
  timestamp: number;
}

interface PerformanceReport {
  timestamp: number;
  metrics: DetailedMetric[];
  memoryTrend: "stable" | "growing" | "shrinking";
  fpsTrend: "stable" | "improving" | "degrading";
  networkStats: NetworkStats;
  interactionStats: InteractionStats;
  summary: string;
  recommendations: string[];
}

interface NetworkStats {
  operations: Record<
    string,
    {
      average: number;
      min: number;
      max: number;
      p95: number;
    }
  >;
  averageLatency?: number; // Overall average latency across all operations
}

interface InteractionStats {
  interactions: Record<
    string,
    {
      average: number;
      min: number;
      max: number;
      count: number;
    }
  >;
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Backward compatibility exports
export function startTimer(label: string): () => void {
  return performanceMonitor.start(label);
}

export function getAverageDuration(label: string): number {
  return performanceMonitor.average(label);
}
