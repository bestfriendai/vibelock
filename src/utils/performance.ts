// Minimal performance monitor utility for lightweight timing
// Logs warnings for operations >100ms

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  start(label: string): () => void {
    const startTime = globalThis.performance?.now?.() ?? Date.now();
    return () => {
      const endTime = globalThis.performance?.now?.() ?? Date.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(label)) this.metrics.set(label, []);
      this.metrics.get(label)!.push(duration);

      if (duration > 100) {
        console.warn(`🐌 Slow operation: ${label} took ${duration.toFixed(1)}ms`);
      }
    };
  }

  average(label: string): number {
    const arr = this.metrics.get(label) || [];
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }
}

export function startTimer(label: string): () => void {
  return PerformanceMonitor.getInstance().start(label);
}

export function getAverageDuration(label: string): number {
  return PerformanceMonitor.getInstance().average(label);
}
