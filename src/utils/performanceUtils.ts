import { performanceMonitor } from './performance';
import { Platform } from 'react-native';

/**
 * Measure performance of an operation
 */
export function measurePerformance<T>(
  operation: string,
  callback: () => T
): T {
  const stop = performanceMonitor.start(operation);
  try {
    const result = callback();
    const duration = stop();

    if (duration > 100) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(1)}ms`);
    }

    return result;
  } catch (error) {
    stop();
    throw error;
  }
}

/**
 * Detect memory leaks by tracking component instances
 */
export function detectMemoryLeaks(
  componentName: string,
  instances: Map<string, any>
): string[] {
  const leaks: string[] = [];
  const now = Date.now();

  instances.forEach((instance, id) => {
    if (instance.unmounted && now - instance.unmountTime > 10000) {
      leaks.push(`${componentName} instance ${id} not cleaned up after unmount`);
    }
  });

  return leaks;
}

/**
 * Get optimal settings based on device capabilities
 */
export function optimizeForDevice(deviceSpecs: {
  memory?: number;
  cpu?: number;
  screenDensity?: number;
}) {
  const isLowEnd = (deviceSpecs.memory || 4096) < 2048 || (deviceSpecs.cpu || 2) < 1.5;
  const isHighEnd = (deviceSpecs.memory || 4096) > 6144 && (deviceSpecs.cpu || 2) > 2.5;

  return {
    windowSize: isLowEnd ? 10 : isHighEnd ? 30 : 21,
    maxToRenderPerBatch: isLowEnd ? 5 : isHighEnd ? 20 : 10,
    updateCellsBatchingPeriod: isLowEnd ? 100 : isHighEnd ? 30 : 50,
    enableAnimations: !isLowEnd,
    enableShadows: isHighEnd,
    imageQuality: isLowEnd ? 'low' : isHighEnd ? 'high' : 'medium',
    memoryLimit: isLowEnd ? 100 : isHighEnd ? 500 : 200,
    cacheSize: isLowEnd ? 3 : isHighEnd ? 10 : 5
  };
}

/**
 * Throttle function with performance awareness
 */
export function throttleWithPerformance<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  performanceThreshold: number = 16
): T {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;

  return ((...args: any[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Adjust delay based on current performance
    const fps = performanceMonitor.average('frame') || 60;
    const adjustedDelay = fps < 30 ? delay * 2 : delay;

    if (timeSinceLastCall >= adjustedDelay) {
      lastCall = now;
      func(...args);
    } else {
      lastArgs = args;

      if (!timeout) {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          func(...(lastArgs || []));
          timeout = null;
          lastArgs = null;
        }, adjustedDelay - timeSinceLastCall);
      }
    }
  }) as T;
}

/**
 * Batch updates for efficient state changes
 */
export function batchUpdates<T>(
  updates: T[],
  batchSize: number,
  processBatch: (batch: T[]) => void
): void {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    // Process batch asynchronously to avoid blocking
    requestAnimationFrame(() => {
      processBatch(batch);
    });
  }
}

/**
 * Measure render time for a component
 */
export function measureRenderTime(
  componentName: string,
  renderFunction: () => void
): number {
  const startTime = performance.now();
  renderFunction();
  const endTime = performance.now();
  const duration = endTime - startTime;

  performanceMonitor.recordMetric(`render_${componentName}`, duration);

  return duration;
}

/**
 * Get optimal FlashList settings
 */
export function getOptimalFlashListSettings(
  messageCount: number,
  deviceSpecs: any
): any {
  const optimized = optimizeForDevice(deviceSpecs);

  // Adjust based on message count
  if (messageCount > 500) {
    return {
      ...optimized,
      windowSize: Math.max(5, optimized.windowSize - 10),
      maxToRenderPerBatch: Math.max(3, optimized.maxToRenderPerBatch - 5),
      disableAutoLayout: true,
      drawDistance: 100
    };
  } else if (messageCount > 100) {
    return {
      ...optimized,
      windowSize: Math.max(10, optimized.windowSize - 5),
      maxToRenderPerBatch: Math.max(5, optimized.maxToRenderPerBatch - 2),
      disableAutoLayout: messageCount > 200,
      drawDistance: 200
    };
  }

  return {
    ...optimized,
    disableAutoLayout: false,
    drawDistance: 300
  };
}

/**
 * Monitor scroll performance
 */
export function monitorScrollPerformance(
  scrollHandler: (event: any) => void
): (event: any) => void {
  let lastScrollTime = 0;
  let scrollEvents = 0;
  let lagCount = 0;

  return (event: any) => {
    const now = performance.now();
    const timeSinceLastScroll = now - lastScrollTime;

    if (timeSinceLastScroll > 100) {
      lagCount++;
    }

    scrollEvents++;

    // Report metrics every 50 scroll events
    if (scrollEvents % 50 === 0) {
      performanceMonitor.recordMetric('scrollPerformance', {
        events: scrollEvents,
        lagEvents: lagCount,
        lagRate: lagCount / scrollEvents
      });

      if (lagCount / scrollEvents > 0.2) {
        console.warn('Poor scroll performance detected');
      }
    }

    lastScrollTime = now;
    scrollHandler(event);
  };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(metrics: any): {
  summary: string;
  recommendations: string[];
  score: number;
} {
  const recommendations: string[] = [];
  let score = 100;

  // Analyze render performance
  if (metrics.averageRenderTime > 16) {
    recommendations.push('Optimize component rendering - consider memoization');
    score -= 20;
  }

  // Analyze memory usage
  if (metrics.memoryUsage > 0.8) {
    recommendations.push('High memory usage - implement cleanup strategies');
    score -= 25;
  }

  // Analyze FPS
  if (metrics.fps < 30) {
    recommendations.push('Low FPS - reduce animations and visual effects');
    score -= 30;
  }

  // Analyze scroll performance
  if (metrics.scrollLag > 100) {
    recommendations.push('Scroll lag detected - reduce list complexity');
    score -= 15;
  }

  const summary = score >= 80 ? 'Excellent' :
                  score >= 60 ? 'Good' :
                  score >= 40 ? 'Fair' : 'Poor';

  return {
    summary: `Performance: ${summary} (${score}/100)`,
    recommendations,
    score
  };
}

/**
 * Debounce with memory pressure awareness
 */
export function debounceWithMemory<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  memoryThreshold: number = 0.8
): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    // Check memory pressure
    performanceMonitor.trackMemoryUsage().then(usage => {
      // Increase delay if memory pressure is high
      const adjustedDelay = usage > memoryThreshold ? delay * 2 : delay;

      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, adjustedDelay);
    });
  }) as T;
}