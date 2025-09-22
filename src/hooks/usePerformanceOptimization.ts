import { useEffect, useRef, useCallback, useState } from "react";
import { performanceMonitor } from "../utils/performance";
import { memoryManager } from "../services/memoryManager";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PerformanceOptions {
  componentName: string;
  enableMonitoring?: boolean;
  enableMemoryTracking?: boolean;
  enableAutoOptimization?: boolean;
  thresholds?: {
    renderTime?: number;
    memoryUsage?: number;
    fps?: number;
  };
}

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  memoryUsage: number;
  fps: number;
  lastRenderTime: number;
}

interface DeviceCapabilities {
  memory: number;
  cpu: "low" | "medium" | "high";
  isLowEndDevice: boolean;
}

interface OptimizationSettings {
  windowSize: number;
  maxToRenderPerBatch: number;
  updateCellsBatchingPeriod: number;
  enableAnimations: boolean;
  enableShadows: boolean;
  imageQuality: "low" | "medium" | "high";
}

export function usePerformanceOptimization(options: PerformanceOptions) {
  const {
    componentName,
    enableMonitoring = true,
    enableMemoryTracking = true,
    enableAutoOptimization = true,
    thresholds = {},
  } = options;

  const componentId = useRef(`${options.componentName}_${Date.now()}`);
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    fps: 60,
    lastRenderTime: 0,
  });
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>({
    windowSize: 21,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    enableAnimations: true,
    enableShadows: true,
    imageQuality: "high",
  });

  // Track component mount/unmount
  useEffect(() => {
    if (enableMemoryTracking !== false) {
      memoryManager.trackComponent(componentName, componentId.current);
    }

    // Detect device capabilities on mount

    detectDeviceCapabilities();

    // Subscribe to performance alerts

    const unsubscribe = performanceMonitor.onAlert((alert) => {
      if (enableAutoOptimization && alert.severity === "critical") {
        applyAutoOptimization(alert.type);
      }
    });

    cleanupFunctions.current.push(unsubscribe);

    return () => {
      if (enableMemoryTracking !== false) {
        memoryManager.untrackComponent(componentId.current);
      }

      // Cleanup all subscriptions

      cleanupFunctions.current.forEach((cleanup) => cleanup());

      cleanupFunctions.current = [];

      // Save performance metrics for future analysis

      savePerformanceMetrics();
    };
  }, [enableMemoryTracking, componentName, enableAutoOptimization]);

  // Track render performance
  const trackRender = useCallback(() => {
    if (!options.enableMonitoring) return;

    const startTime = performance.now();
    renderCount.current++;

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      renderTimes.current.push(renderTime);

      // Keep only last 50 render times
      if (renderTimes.current.length > 50) {
        renderTimes.current.shift();
      }

      // Update metrics
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

      setMetrics((prev) => ({
        ...prev,
        renderCount: renderCount.current,
        averageRenderTime: avgRenderTime,
        lastRenderTime: renderTime,
      }));

      // Check thresholds
      const threshold = options.thresholds?.renderTime || 16;
      if (renderTime > threshold) {
        performanceMonitor.recordMetric(`${options.componentName}_slowRender`, {
          renderTime,
          threshold,
          renderCount: renderCount.current,
        });
      }
    });
  }, [options.componentName, options.enableMonitoring, options.thresholds]);

  // Track memory usage
  const trackMemory = useCallback(async () => {
    if (!options.enableMemoryTracking) return;

    const usage = await memoryManager.getMemoryUsage();
    const percentage = usage.percentage;

    setMetrics((prev) => ({
      ...prev,
      memoryUsage: percentage,
    }));

    // Check memory threshold
    const threshold = options.thresholds?.memoryUsage || 0.8;
    if (percentage > threshold) {
      console.warn(
        `[usePerformanceOptimization] High memory usage in ${options.componentName}: ${percentage.toFixed(1)}%`,
      );

      // Trigger cleanup if critical
      if (percentage > 0.9) {
        await memoryManager.forceCleanup();
      }
    }
  }, [options.componentName, options.enableMemoryTracking, options.thresholds]);

  // Optimize settings based on device capabilities
  const optimizeForDevice = useCallback(
    (capabilities?: DeviceCapabilities) => {
      const caps = capabilities || deviceCapabilities;
      if (!caps) return;

      let settings: OptimizationSettings;

      if (caps.isLowEndDevice) {
        // Low-end device optimizations
        settings = {
          windowSize: 10,
          maxToRenderPerBatch: 5,
          updateCellsBatchingPeriod: 100,
          enableAnimations: false,
          enableShadows: false,
          imageQuality: "low",
        };
      } else if (caps.cpu === "high" && caps.memory > 4096) {
        // High-end device settings
        settings = {
          windowSize: 30,
          maxToRenderPerBatch: 20,
          updateCellsBatchingPeriod: 30,
          enableAnimations: true,
          enableShadows: true,
          imageQuality: "high",
        };
      } else {
        // Medium device settings
        settings = {
          windowSize: 21,
          maxToRenderPerBatch: 10,
          updateCellsBatchingPeriod: 50,
          enableAnimations: true,
          enableShadows: false,
          imageQuality: "medium",
        };
      }

      setOptimizationSettings(settings);

      performanceMonitor.recordMetric(`${options.componentName}_deviceOptimization`, {
        device: caps,
        settings,
      });
    },
    [deviceCapabilities, options.componentName],
  );

  // Get current performance metrics
  const getMetrics = useCallback(() => {
    return {
      ...metrics,
      deviceCapabilities,
      optimizationSettings,
    };
  }, [metrics, deviceCapabilities, optimizationSettings]);

  // Detect device capabilities
  const detectDeviceCapabilities = async () => {
    try {
      // Check saved capabilities first
      const saved = await AsyncStorage.getItem("deviceCapabilities");
      if (saved) {
        const caps = JSON.parse(saved);
        setDeviceCapabilities(caps);
        optimizeForDevice(caps);
        return;
      }

      // Run performance benchmark
      const benchmark = await runPerformanceBenchmark();

      const capabilities: DeviceCapabilities = {
        memory: benchmark.estimatedMemory,
        cpu: benchmark.cpuScore > 80 ? "high" : benchmark.cpuScore > 40 ? "medium" : "low",
        isLowEndDevice: benchmark.cpuScore < 40 || benchmark.estimatedMemory < 2048,
      };

      setDeviceCapabilities(capabilities);
      optimizeForDevice(capabilities);

      // Save capabilities
      await AsyncStorage.setItem("deviceCapabilities", JSON.stringify(capabilities));
    } catch (error) {
      console.error("Failed to detect device capabilities:", error);

      // Default to medium settings
      setDeviceCapabilities({
        memory: 4096,
        cpu: "medium",
        isLowEndDevice: false,
      });
    }
  };

  // Run performance benchmark
  const runPerformanceBenchmark = async (): Promise<{ cpuScore: number; estimatedMemory: number }> => {
    const iterations = 1000000;
    const startTime = performance.now();

    // CPU benchmark
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Lower duration = faster CPU
    const cpuScore = Math.max(0, Math.min(100, 100 - duration / 10));

    // Estimate memory (would use actual device APIs in production)
    const estimatedMemory = Platform.OS === "ios" ? 4096 : 3072;

    return { cpuScore, estimatedMemory };
  };

  // Apply auto-optimization based on performance issues
  const applyAutoOptimization = (issueType: string) => {
    const current = optimizationSettings;

    switch (issueType) {
      case "render":
      case "fps":
        // Reduce rendering complexity
        setOptimizationSettings({
          ...current,
          windowSize: Math.max(5, current.windowSize - 5),
          maxToRenderPerBatch: Math.max(3, current.maxToRenderPerBatch - 2),
          enableAnimations: false,
        });
        break;

      case "memory":
        // Reduce memory usage
        setOptimizationSettings({
          ...current,
          windowSize: Math.max(5, current.windowSize - 10),
          imageQuality: "low",
          enableShadows: false,
        });
        break;

      case "scroll":
        // Improve scroll performance
        setOptimizationSettings({
          ...current,
          updateCellsBatchingPeriod: Math.min(200, current.updateCellsBatchingPeriod + 50),
          maxToRenderPerBatch: Math.max(3, current.maxToRenderPerBatch - 3),
        });
        break;
    }

    console.log(`[usePerformanceOptimization] Auto-optimization applied for ${options.componentName}: ${issueType}`);
  };

  // Save performance metrics for analysis
  const savePerformanceMetrics = async () => {
    try {
      const metricsData = {
        componentName: options.componentName,
        metrics,
        timestamp: Date.now(),
      };

      // Get existing metrics
      const existing = await AsyncStorage.getItem("performanceMetrics");
      const allMetrics = existing ? JSON.parse(existing) : [];

      // Add new metrics
      allMetrics.push(metricsData);

      // Keep only last 100 entries
      if (allMetrics.length > 100) {
        allMetrics.splice(0, allMetrics.length - 100);
      }

      await AsyncStorage.setItem("performanceMetrics", JSON.stringify(allMetrics));
    } catch (error) {
      console.error("Failed to save performance metrics:", error);
    }
  };

  // Monitor FPS
  useEffect(() => {
    if (!options.enableMonitoring) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrame: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        setMetrics((prev) => ({
          ...prev,
          fps,
        }));

        // Check FPS threshold
        const threshold = options.thresholds?.fps || 30;
        if (fps < threshold) {
          performanceMonitor.recordMetric(`${options.componentName}_lowFPS`, {
            fps,
            threshold,
          });
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrame = requestAnimationFrame(measureFPS);
    };

    animationFrame = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [options.enableMonitoring, options.componentName, options.thresholds]);

  // Track memory periodically
  useEffect(() => {
    if (!options.enableMemoryTracking) return;

    const interval = setInterval(trackMemory, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [trackMemory, options.enableMemoryTracking]);

  return {
    trackRender,
    trackMemory,
    optimizeForDevice,
    getMetrics,
    metrics,
    deviceCapabilities,
    optimizationSettings,
  };
}
