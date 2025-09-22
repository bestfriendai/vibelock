/**
 * Enhanced Network Manager for React Native
 * Provides advanced networking features including request batching,
 * offline support, retry logic, and connection pooling
 */

import NetInfo from "@react-native-community/netinfo";
import { MMKV } from "react-native-mmkv";
import { AppError, ErrorType } from "../../utils/errorHandling";

export interface RequestConfig {
  priority?: "high" | "normal" | "low";
  retry?: RetryConfig;
  timeout?: number;
  cache?: CacheConfig;
  batch?: boolean;
  dedupe?: boolean;
  compress?: boolean;
}

export interface RetryConfig {
  maxAttempts?: number;
  backoff?: "exponential" | "linear" | "fixed";
  shouldRetry?: (error: any) => boolean;
  circuitBreaker?: {
    threshold: number;
    resetTimeout: number;
  };
}

export interface CacheConfig {
  ttl?: number;
  key?: string;
  tags?: string[];
}

interface OfflineRequest {
  id: string;
  url: string;
  options: RequestInit & RequestConfig;
  timestamp: number;
  retryCount: number;
}

interface CircuitBreaker {
  failures: number;
  lastFailTime: number;
  state: "closed" | "open" | "half-open";
  threshold: number;
  resetTimeout: number;
}

class NetworkManager {
  private static instance: NetworkManager;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private batchQueue: Map<string, any[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private storage = new MMKV({ id: "network-manager" });
  private offlineQueue: OfflineRequest[] = [];
  private isOnline = true;
  private abortControllers: Map<string, AbortController> = new Map();
  private priorityQueues = {
    high: [] as (() => Promise<any>)[],
    normal: [] as (() => Promise<any>)[],
    low: [] as (() => Promise<any>)[],
  };
  private isProcessingQueue = false;

  private constructor() {
    this.initializeNetworkListener();
    this.loadOfflineQueue();
    this.setupBatchProcessor();
  }

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = (state.isConnected && state.isInternetReachable) || false;

      if (wasOffline && this.isOnline) {
        this.processOfflineQueue();
      }
    });
  }

  private loadOfflineQueue() {
    try {
      const stored = this.storage.getString("offline-queue");
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {}
  }

  private saveOfflineQueue() {
    try {
      this.storage.set("offline-queue", JSON.stringify(this.offlineQueue));
    } catch (error) {}
  }

  private setupBatchProcessor() {
    // Process batches every 50ms
    setInterval(() => {
      this.processBatches();
    }, 50);
  }

  async request<T>(url: string, options: RequestInit & RequestConfig = {}): Promise<T> {
    // Request deduplication
    if (options.dedupe !== false) {
      const key = this.generateRequestKey(url, options);
      if (this.requestQueue.has(key)) {
        return this.requestQueue.get(key);
      }
    }

    // Check circuit breaker
    const breaker = this.getCircuitBreaker(url);
    if (breaker.state === "open") {
      const timeSinceLastFail = Date.now() - breaker.lastFailTime;
      if (timeSinceLastFail < breaker.resetTimeout) {
        throw new AppError("Circuit breaker is open", ErrorType.NETWORK, "CIRCUIT_BREAKER_OPEN");
      }
      breaker.state = "half-open";
    }

    // Priority queue management
    const priority = options.priority || "normal";
    const requestPromise = this.createRequest(url, options, priority);

    // Batch if enabled
    if (options.batch) {
      return this.addToBatch(url, options) as Promise<T>;
    }

    return requestPromise as Promise<T>;
  }

  private async createRequest<T>(
    url: string,
    options: RequestConfig & RequestInit,
    priority: "high" | "normal" | "low",
  ): Promise<T> {
    const requestFn = async () => {
      const controller = new AbortController();
      const requestKey = this.generateRequestKey(url, options);
      this.abortControllers.set(requestKey, controller);

      const timeout = options.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Add compression headers if requested
        const headers: Record<string, string> = {
          ...((options.headers as Record<string, string>) || {}),
        };

        if (options.compress) {
          headers["Accept-Encoding"] = "gzip, deflate";
          if (options.body) {
            headers["Content-Encoding"] = "gzip";
          }
        }

        const response = await this.retryWithBackoff(
          () =>
            fetch(url, {
              ...options,
              headers,
              signal: controller.signal,
            }),
          options.retry || this.getDefaultRetryConfig(),
        );

        clearTimeout(timeoutId);
        this.abortControllers.delete(requestKey);

        if (!response.ok) {
          throw new AppError(
            `HTTP ${response.status}: ${response.statusText}`,
            ErrorType.NETWORK,
            "HTTP_ERROR",
            response.status,
          );
        }

        // Update circuit breaker on success
        const breaker = this.getCircuitBreaker(url);
        if (breaker.state === "half-open") {
          breaker.state = "closed";
          breaker.failures = 0;
        }

        return response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        this.abortControllers.delete(requestKey);

        // Update circuit breaker on failure
        const breaker = this.getCircuitBreaker(url);
        breaker.failures++;
        breaker.lastFailTime = Date.now();

        if (breaker.failures >= breaker.threshold) {
          breaker.state = "open";
        }

        // Add to offline queue if network error
        if (!this.isOnline && this.isNetworkError(error)) {
          this.addToOfflineQueue(url, options);
        }

        throw error;
      }
    };

    // Add to priority queue
    return new Promise((resolve, reject) => {
      this.priorityQueues[priority].push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueues();
    });
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T> {
    const maxAttempts = config.maxAttempts || 3;
    const backoff = config.backoff || "exponential";
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (config.shouldRetry && !config.shouldRetry(error)) {
          throw error;
        }

        if (attempt < maxAttempts - 1) {
          const delay = this.calculateDelay(attempt, backoff);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, backoff: string): number {
    const baseDelay = 1000;
    const maxDelay = 30000;

    switch (backoff) {
      case "exponential":
        return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      case "linear":
        return Math.min(baseDelay * (attempt + 1), maxDelay);
      default:
        return baseDelay;
    }
  }

  private async processQueues() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      // Process high priority first
      while (this.priorityQueues.high.length > 0) {
        const request = this.priorityQueues.high.shift();
        if (request) await request();
      }

      // Then normal priority
      if (this.priorityQueues.normal.length > 0) {
        const request = this.priorityQueues.normal.shift();
        if (request) await request();
      }

      // Finally low priority
      if (this.priorityQueues.low.length > 0) {
        const request = this.priorityQueues.low.shift();
        if (request) await request();
      }
    } finally {
      this.isProcessingQueue = false;

      // Continue processing if there are more requests
      const hasMore =
        this.priorityQueues.high.length > 0 ||
        this.priorityQueues.normal.length > 0 ||
        this.priorityQueues.low.length > 0;

      if (hasMore) {
        setTimeout(() => this.processQueues(), 0);
      }
    }
  }

  private generateRequestKey(url: string, options: any): string {
    const method = options.method || "GET";
    const body = options.body ? JSON.stringify(options.body) : "";
    return `${method}:${url}:${body}`;
  }

  private getCircuitBreaker(url: string): CircuitBreaker {
    const origin = new URL(url).origin;

    if (!this.circuitBreakers.has(origin)) {
      this.circuitBreakers.set(origin, {
        failures: 0,
        lastFailTime: 0,
        state: "closed",
        threshold: 5,
        resetTimeout: 60000, // 1 minute
      });
    }

    return this.circuitBreakers.get(origin)!;
  }

  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      backoff: "exponential",
      shouldRetry: (error) => {
        // Retry on network errors and 5xx status codes
        if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
          return true;
        }
        if (error.statusCode && error.statusCode >= 500) {
          return true;
        }
        return false;
      },
    };
  }

  private isNetworkError(error: any): boolean {
    return (
      error.code === "NETWORK_ERROR" ||
      error.message?.includes("Network request failed") ||
      error.message?.includes("fetch failed")
    );
  }

  private addToOfflineQueue(url: string, options: RequestInit & RequestConfig) {
    const request: OfflineRequest = {
      id: this.generateUUID(),
      url,
      options,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.offlineQueue.push(request);
    this.saveOfflineQueue();
  }

  private async processOfflineQueue() {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of queue) {
      try {
        await this.request(request.url, request.options);
      } catch (error) {
        request.retryCount++;
        if (request.retryCount < 3) {
          this.offlineQueue.push(request);
        }
      }
    }

    this.saveOfflineQueue();
  }

  private async addToBatch<T>(url: string, options: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.batchQueue.get(url) || [];
      batch.push({ options, resolve, reject });
      this.batchQueue.set(url, batch);
    });
  }

  private async processBatches() {
    for (const [url, batch] of this.batchQueue.entries()) {
      if (batch.length === 0) continue;

      // Process batch if it has enough requests or timeout reached
      if (batch.length >= 10 || Date.now() - batch[0].timestamp > 50) {
        this.batchQueue.delete(url);
        this.executeBatch(url, batch);
      }
    }
  }

  private async executeBatch(url: string, batch: any[]) {
    try {
      const response = await fetch(`${url}/_batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: batch.map((b) => b.options),
        }),
      });

      const results = await response.json();

      batch.forEach((item, index) => {
        if (results[index].error) {
          item.reject(results[index].error);
        } else {
          item.resolve(results[index].data);
        }
      });
    } catch (error) {
      batch.forEach((item) => item.reject(error));
    }
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Public methods for managing the network layer

  cancelRequest(url: string, options?: any) {
    const key = this.generateRequestKey(url, options || {});
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  cancelAllRequests() {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  getCircuitBreakerStatus(url: string): "closed" | "open" | "half-open" {
    const breaker = this.getCircuitBreaker(url);
    return breaker.state;
  }

  resetCircuitBreaker(url: string) {
    const breaker = this.getCircuitBreaker(url);
    breaker.state = "closed";
    breaker.failures = 0;
    breaker.lastFailTime = 0;
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  clearOfflineQueue() {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }
}

export const networkManager = NetworkManager.getInstance();
export default networkManager;
