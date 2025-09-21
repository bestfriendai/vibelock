import { ChatMessage } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { performanceMonitor } from "../utils/performance";

interface PaginationState {
  cursor: string | null;
  hasMore: boolean;
  loadedCount: number;
  lastLoadTime: number;
}

interface DeviceSpecs {
  totalMemory?: number;
  availableMemory?: number;
  cpuSpeed?: number;
  isLowEndDevice?: boolean;
}

interface PaginationMetrics {
  loadTime: number;
  batchSize: number;
  memoryUsage: number;
  totalMessages: number;
}

export class MessagePaginationManager {
  private paginationStates: Map<string, PaginationState> = new Map();
  private messageIndex: Map<string, Map<string, ChatMessage>> = new Map();
  private loadingPromises: Map<string, Promise<ChatMessage[]>> = new Map();
  private metrics: PaginationMetrics[] = [];
  private retryCount: Map<string, number> = new Map();
  private memoryThreshold: number = 200; // Default: keep 200 messages in memory

  constructor() {
    this.initializeMemoryThreshold();
  }

  private async initializeMemoryThreshold() {
    try {
      const savedThreshold = await AsyncStorage.getItem("messagePaginationThreshold");
      if (savedThreshold) {
        this.memoryThreshold = parseInt(savedThreshold, 10);
      }
    } catch (error) {
      console.error("Failed to load pagination threshold:", error);
    }
  }

  /**
   * Load the next batch of messages for a room
   */
  async loadNextBatch(
    roomId: string,
    batchSize?: number,
    loadFunction?: (
      roomId: string,
      cursor: string | null,
      limit: number,
    ) => Promise<{ messages: ChatMessage[]; cursor: string | null; hasMore: boolean }>,
  ): Promise<ChatMessage[]> {
    const startTime = Date.now();

    // Check if already loading
    const existingPromise = this.loadingPromises.get(roomId);
    if (existingPromise) {
      return existingPromise;
    }

    const state = this.paginationStates.get(roomId) || {
      cursor: null,
      hasMore: true,
      loadedCount: 0,
      lastLoadTime: 0,
    };

    if (!state.hasMore) {
      return [];
    }

    // Get optimal batch size
    const deviceSpecs = await this.getDeviceSpecs();
    const optimalBatchSize = batchSize || this.getOptimalBatchSize(state.loadedCount, deviceSpecs);

    const loadPromise = this.performLoad(roomId, state, optimalBatchSize, loadFunction);
    this.loadingPromises.set(roomId, loadPromise);

    try {
      const messages = await loadPromise;

      // Record metrics
      this.recordMetrics({
        loadTime: Date.now() - startTime,
        batchSize: messages.length,
        memoryUsage: this.getMemoryUsage(roomId),
        totalMessages: state.loadedCount + messages.length,
      });

      // Trigger cleanup if needed
      if (state.loadedCount > this.memoryThreshold) {
        await this.cleanupOldMessages(roomId, this.memoryThreshold);
      }

      return messages;
    } finally {
      this.loadingPromises.delete(roomId);
    }
  }

  /**
   * Preload the next batch when user is close to the end
   */
  async preloadNextBatch(
    roomId: string,
    scrollPercentage: number = 80,
    loadFunction?: (
      roomId: string,
      cursor: string | null,
      limit: number,
    ) => Promise<{ messages: ChatMessage[]; cursor: string | null; hasMore: boolean }>,
  ): Promise<void> {
    const state = this.paginationStates.get(roomId);
    if (!state || !state.hasMore || scrollPercentage < 80) {
      return;
    }

    // Avoid loading too frequently
    const timeSinceLastLoad = Date.now() - state.lastLoadTime;
    if (timeSinceLastLoad < 1000) {
      return;
    }

    // Preload with smaller batch size
    const deviceSpecs = await this.getDeviceSpecs();
    const preloadSize = Math.floor(this.getOptimalBatchSize(state.loadedCount, deviceSpecs) * 0.7);

    // Fire and forget preload
    this.loadNextBatch(roomId, preloadSize, loadFunction).catch((error) => {
      console.warn("Preload failed:", error);
    });
  }

  /**
   * Clean up old messages to free memory
   */
  async cleanupOldMessages(roomId: string, retentionCount: number): Promise<number> {
    const roomIndex = this.messageIndex.get(roomId);
    if (!roomIndex) {
      return 0;
    }

    const messages = Array.from(roomIndex.values());
    if (messages.length <= retentionCount) {
      return 0;
    }

    // Sort by timestamp (keep newest)
    messages.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp;
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp;
      return timeB - timeA;
    });

    // Remove oldest messages
    const toRemove = messages.slice(retentionCount);
    toRemove.forEach((msg) => {
      roomIndex.delete(msg.id);
    });

    performanceMonitor.recordMetric("messageCleanup", {
      roomId,
      removed: toRemove.length,
      remaining: roomIndex.size,
    });

    return toRemove.length;
  }

  /**
   * Get optimal batch size based on device capabilities
   */
  getOptimalBatchSize(currentMessageCount: number, deviceSpecs: DeviceSpecs): number {
    // Initial load
    if (currentMessageCount === 0) {
      return 20;
    }

    // Low-end device detection
    if (deviceSpecs.isLowEndDevice || (deviceSpecs.availableMemory && deviceSpecs.availableMemory < 1024)) {
      return currentMessageCount < 50 ? 15 : 10;
    }

    // High-end device with good memory
    if (deviceSpecs.availableMemory && deviceSpecs.availableMemory > 4096) {
      return currentMessageCount < 100 ? 50 : 30;
    }

    // Default adaptive sizing
    if (currentMessageCount < 50) {
      return 30;
    } else if (currentMessageCount < 200) {
      return 25;
    } else {
      return 20;
    }
  }

  /**
   * Perform the actual load with retry logic
   */
  private async performLoad(
    roomId: string,
    state: PaginationState,
    batchSize: number,
    loadFunction?: (
      roomId: string,
      cursor: string | null,
      limit: number,
    ) => Promise<{ messages: ChatMessage[]; cursor: string | null; hasMore: boolean }>,
  ): Promise<ChatMessage[]> {
    const retries = this.retryCount.get(roomId) || 0;

    try {
      // Simulate load function if not provided
      const result = loadFunction
        ? await loadFunction(roomId, state.cursor, batchSize)
        : await this.simulateLoad(roomId, state.cursor, batchSize);

      // Update state
      const newState: PaginationState = {
        cursor: result.cursor,
        hasMore: result.hasMore,
        loadedCount: state.loadedCount + result.messages.length,
        lastLoadTime: Date.now(),
      };
      this.paginationStates.set(roomId, newState);

      // Index messages for fast lookup
      this.indexMessages(roomId, result.messages);

      // Reset retry count on success
      this.retryCount.delete(roomId);

      return result.messages;
    } catch (error) {
      // Exponential backoff retry
      if (retries < 3) {
        this.retryCount.set(roomId, retries + 1);
        const delay = Math.pow(2, retries) * 1000;

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.performLoad(roomId, state, batchSize, loadFunction);
      }

      throw error;
    }
  }

  /**
   * Index messages for fast lookup
   */
  private indexMessages(roomId: string, messages: ChatMessage[]): void {
    let roomIndex = this.messageIndex.get(roomId);
    if (!roomIndex) {
      roomIndex = new Map();
      this.messageIndex.set(roomId, roomIndex);
    }

    messages.forEach((msg) => {
      roomIndex!.set(msg.id, msg);
    });
  }

  /**
   * Get memory usage for a room
   */
  private getMemoryUsage(roomId: string): number {
    const roomIndex = this.messageIndex.get(roomId);
    if (!roomIndex) {
      return 0;
    }

    // Estimate memory usage (rough calculation)
    let totalSize = 0;
    roomIndex.forEach((msg) => {
      totalSize += JSON.stringify(msg).length * 2; // 2 bytes per character
    });

    return totalSize;
  }

  /**
   * Get device specifications
   */
  private async getDeviceSpecs(): Promise<DeviceSpecs> {
    // This would be implemented with actual device API calls
    // For now, return mock data
    return {
      totalMemory: 4096,
      availableMemory: 2048,
      cpuSpeed: 2.4,
      isLowEndDevice: false,
    };
  }

  /**
   * Simulate message loading (for testing)
   */
  private async simulateLoad(
    roomId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ messages: ChatMessage[]; cursor: string | null; hasMore: boolean }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const messages: ChatMessage[] = [];
    const startIndex = cursor ? parseInt(cursor, 10) : 0;

    for (let i = 0; i < limit; i++) {
      const index = startIndex + i;
      messages.push({
        id: `msg-${roomId}-${index}`,
        roomId,
        senderId: `user-${index % 5}`,
        senderName: `User ${index % 5}`,
        content: `Message ${index} in room ${roomId}`,
        timestamp: new Date(Date.now() - index * 60000),
        type: "text",
        status: "sent",
        reactions: [],
        metadata: {},
      });
    }

    return {
      messages,
      cursor: `${startIndex + limit}`,
      hasMore: startIndex + limit < 500, // Simulate 500 total messages
    };
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metric: PaginationMetrics): void {
    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    performanceMonitor.recordMetric("messagePagination", metric);
  }

  /**
   * Get pagination metrics for analysis
   */
  getMetrics(): PaginationMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear all pagination state for a room
   */
  clearRoomState(roomId: string): void {
    this.paginationStates.delete(roomId);
    this.messageIndex.delete(roomId);
    this.loadingPromises.delete(roomId);
    this.retryCount.delete(roomId);
  }

  /**
   * Clear all pagination state
   */
  clearAllState(): void {
    this.paginationStates.clear();
    this.messageIndex.clear();
    this.loadingPromises.clear();
    this.retryCount.clear();
    this.metrics = [];
  }
}

// Export singleton instance
export const messagePaginationManager = new MessagePaginationManager();
