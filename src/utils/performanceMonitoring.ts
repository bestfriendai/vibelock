import { performanceMonitor } from "./performance";
import { memoryManager } from "../services/memoryManager";

export class PerformanceMonitoring {
  private static instance: PerformanceMonitoring;
  private metrics: Map<string, any> = new Map();

  static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  trackScreenLoad(screenName: string, loadTime: number) {
    performanceMonitor.recordMetric("screenLoad", {
      screen: screenName,
      loadTime,
      timestamp: Date.now(),
    });

    if (loadTime > 1000) {
      // Add slow loading handling here
    }
  }

  trackMemoryUsage() {
    setInterval(async () => {
      const usage = await memoryManager.getMemoryUsage();
      if (usage.percentage > 0.8) {
        console.warn(`High memory usage: ${(usage.percentage * 100).toFixed(1)}%`);
      }
    }, 30000);
  }

  trackBundleSize() {
    // This would integrate with bundle analysis tools
  }
}

export const performanceMonitoring = PerformanceMonitoring.getInstance();
