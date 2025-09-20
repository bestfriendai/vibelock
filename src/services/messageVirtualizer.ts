import { ChatMessage } from '../types';
import { calculateDisplayDimensions } from '../utils/mediaUtils';
import { performanceMonitor } from '../utils/performance';

interface VirtualizedMessage {
  id: string;
  height: number;
  offset: number;
  isVisible: boolean;
  isPlaceholder: boolean;
  content?: ChatMessage;
  placeholderType?: 'text' | 'media' | 'loading';
}

interface ViewportInfo {
  scrollOffset: number;
  viewportHeight: number;
  containerHeight: number;
}

interface VirtualizationOptions {
  bufferSize?: number;
  enableLazyLoading?: boolean;
  enableProgressiveImages?: boolean;
  maxTextLength?: number;
}

interface MessageDimensions {
  width: number;
  height: number;
}

interface SearchIndex {
  messageId: string;
  searchableText: string;
  timestamp: number;
}

export class MessageVirtualizer {
  private virtualizedMessages: Map<string, VirtualizedMessage> = new Map();
  private messageHeights: Map<string, number> = new Map();
  private viewport: ViewportInfo = { scrollOffset: 0, viewportHeight: 0, containerHeight: 0 };
  private options: VirtualizationOptions;
  private searchIndex: Map<string, SearchIndex> = new Map();
  private imageCache: Map<string, { lowRes?: string; fullRes?: string }> = new Map();
  private performanceMetrics: { renders: number; memSaved: number } = { renders: 0, memSaved: 0 };

  constructor(options: VirtualizationOptions = {}) {
    this.options = {
      bufferSize: 10,
      enableLazyLoading: true,
      enableProgressiveImages: true,
      maxTextLength: 500,
      ...options
    };
  }

  /**
   * Virtualize messages based on viewport
   */
  virtualizeMessages(
    messages: ChatMessage[],
    viewportHeight: number,
    scrollOffset: number
  ): VirtualizedMessage[] {
    const startTime = performance.now();

    // Update viewport
    this.viewport = {
      scrollOffset,
      viewportHeight,
      containerHeight: this.calculateTotalHeight(messages)
    };

    // Calculate visible range
    const { startIndex, endIndex } = this.getVisibleRange(scrollOffset, viewportHeight, messages);

    // Reset and repopulate the internal map
    this.virtualizedMessages.clear();

    // Create virtualized messages
    const virtualized: VirtualizedMessage[] = [];
    let currentOffset = 0;

    messages.forEach((message, index) => {
      const height = this.getMessageHeight(message);
      const isInRange = index >= startIndex && index <= endIndex;

      const virtualMessage: VirtualizedMessage = {
        id: message.id,
        height,
        offset: currentOffset,
        isVisible: isInRange,
        isPlaceholder: !isInRange && this.options.enableLazyLoading!,
      };

      if (isInRange) {
        // Full content for visible messages
        virtualMessage.content = this.processVisibleMessage(message);
      } else if (this.options.enableLazyLoading) {
        // Placeholder for non-visible messages
        virtualMessage.placeholderType = this.getPlaceholderType(message);
      }

      // Populate the internal map with each VirtualizedMessage
      this.virtualizedMessages.set(message.id, virtualMessage);

      virtualized.push(virtualMessage);
      currentOffset += height;
    });

    // Update performance metrics
    this.performanceMetrics.renders++;
    const memSaved = this.calculateMemorySaved(messages, virtualized);
    this.performanceMetrics.memSaved += memSaved;

    performanceMonitor.recordMetric('messageVirtualization', {
      totalMessages: messages.length,
      visibleMessages: endIndex - startIndex + 1,
      renderTime: performance.now() - startTime,
      memorySaved: memSaved
    });

    return virtualized;
  }

  /**
   * Get visible message range
   */
  getVisibleRange(
    scrollOffset: number,
    viewportHeight: number,
    messages: ChatMessage[]
  ): { startIndex: number; endIndex: number } {
    const bufferSize = this.options.bufferSize || 10;
    let startIndex = 0;
    let endIndex = messages.length - 1;
    let currentOffset = 0;

    // Find start index
    for (let i = 0; i < messages.length; i++) {
      const height = this.getMessageHeight(messages[i]);

      if (currentOffset + height >= scrollOffset - (bufferSize * 80)) {
        startIndex = Math.max(0, i);
        break;
      }

      currentOffset += height;
    }

    // Find end index
    currentOffset = 0;
    for (let i = 0; i < messages.length; i++) {
      const height = this.getMessageHeight(messages[i]);

      if (currentOffset >= scrollOffset + viewportHeight + (bufferSize * 80)) {
        endIndex = Math.min(messages.length - 1, i);
        break;
      }

      currentOffset += height;
    }

    return { startIndex, endIndex };
  }

  /**
   * Preload adjacent messages
   */
  preloadAdjacentMessages(
    visibleRange: { startIndex: number; endIndex: number },
    preloadCount: number = 5
  ): void {
    const preloadStart = Math.max(0, visibleRange.startIndex - preloadCount);
    const preloadEnd = visibleRange.endIndex + preloadCount;

    // Mark messages for preloading
    this.virtualizedMessages.forEach((virtualMessage, id) => {
      const index = Array.from(this.virtualizedMessages.keys()).indexOf(id);

      if (index >= preloadStart && index <= preloadEnd && virtualMessage.isPlaceholder) {
        // Schedule lazy loading
        this.scheduleLazyLoad(id);
      }
    });
  }

  /**
   * Clean up invisible messages
   */
  cleanupInvisibleMessages(visibleRange: { startIndex: number; endIndex: number }): number {
    let cleanedCount = 0;
    const bufferSize = (this.options.bufferSize || 10) * 2;

    this.virtualizedMessages.forEach((virtualMessage, id) => {
      const index = Array.from(this.virtualizedMessages.keys()).indexOf(id);

      if (index < visibleRange.startIndex - bufferSize || index > visibleRange.endIndex + bufferSize) {
        if (!virtualMessage.isPlaceholder) {
          // Convert to placeholder
          virtualMessage.isPlaceholder = true;
          virtualMessage.content = undefined;
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      performanceMonitor.recordMetric('messageCleanup', {
        cleaned: cleanedCount,
        remaining: this.virtualizedMessages.size - cleanedCount
      });
    }

    return cleanedCount;
  }

  /**
   * Update viewport
   */
  updateViewport(scrollOffset: number, viewportHeight: number): void {
    this.viewport.scrollOffset = scrollOffset;
    this.viewport.viewportHeight = viewportHeight;
  }

  /**
   * Get message height estimate
   */
  private getMessageHeight(message: ChatMessage): number {
    // Check cache first
    const cached = this.messageHeights.get(message.id);
    if (cached) return cached;

    let height = 80; // Base height with padding

    switch (message.type) {
      case 'image':
      case 'video':
        if (message.media?.dimensions) {
          const display = calculateDisplayDimensions(
            message.media.dimensions.width,
            message.media.dimensions.height,
            300,
            400
          );
          height = display.height + 20;
        } else {
          height = 220; // Default media height
        }
        break;

      case 'voice':
        height = 60;
        break;

      case 'document':
        height = 80;
        break;

      case 'text':
      default:
        if (message.content) {
          // Estimate based on text length
          const lines = Math.ceil(message.content.length / 40);
          height = Math.min(lines * 20 + 60, 300);
        }
        break;
    }

    // Add extra height for reactions
    if (message.reactions && message.reactions.length > 0) {
      height += 30;
    }

    // Add height for reply preview
    if (message.replyTo) {
      height += 40;
    }

    // Cache the height
    this.messageHeights.set(message.id, height);
    return height;
  }

  /**
   * Process visible message
   */
  private processVisibleMessage(message: ChatMessage): ChatMessage {
    // For visible messages, we can still optimize
    const processed = { ...message };

    // Progressive image loading
    if (this.options.enableProgressiveImages && (message.type === 'image' || message.type === 'video')) {
      processed.media = this.getProgressiveMedia(message);
    }

    // Text truncation for very long messages
    if (message.type === 'text' && message.content && message.content.length > (this.options.maxTextLength || 500)) {
      processed.content = this.truncateText(message.content);
      processed.metadata = {
        ...processed.metadata,
        isTruncated: true,
        fullLength: message.content.length
      };
    }

    // Update search index
    this.updateSearchIndex(message);

    return processed;
  }

  /**
   * Get progressive media
   */
  private getProgressiveMedia(message: ChatMessage): any {
    const cached = this.imageCache.get(message.id);

    if (cached && cached.fullRes) {
      return { ...message.media, url: cached.fullRes };
    }

    if (cached && cached.lowRes) {
      // Load full res in background
      this.loadFullResImage(message);
      return { ...message.media, url: cached.lowRes, isLowRes: true };
    }

    // Start loading low res
    this.loadLowResImage(message);
    return { ...message.media, isLoading: true };
  }

  /**
   * Truncate text content
   */
  private truncateText(text: string): string {
    const maxLength = this.options.maxTextLength || 500;

    if (text.length <= maxLength) {
      return text;
    }

    // Find last complete word before limit
    let truncateAt = maxLength;
    while (truncateAt > 0 && text[truncateAt] !== ' ') {
      truncateAt--;
    }

    return text.substring(0, truncateAt) + '...';
  }

  /**
   * Get placeholder type
   */
  private getPlaceholderType(message: ChatMessage): 'text' | 'media' | 'loading' {
    if (message.type === 'image' || message.type === 'video') {
      return 'media';
    }
    return 'text';
  }

  /**
   * Calculate total height
   */
  private calculateTotalHeight(messages: ChatMessage[]): number {
    return messages.reduce((total, message) => total + this.getMessageHeight(message), 0);
  }

  /**
   * Calculate memory saved
   */
  private calculateMemorySaved(
    originalMessages: ChatMessage[],
    virtualizedMessages: VirtualizedMessage[]
  ): number {
    const originalSize = JSON.stringify(originalMessages).length * 2; // Rough estimate in bytes
    const virtualizedSize = virtualizedMessages.reduce((total, vm) => {
      if (vm.content) {
        return total + JSON.stringify(vm.content).length * 2;
      }
      return total + 100; // Placeholder size estimate
    }, 0);

    return Math.max(0, originalSize - virtualizedSize);
  }

  /**
   * Update search index
   */
  private updateSearchIndex(message: ChatMessage): void {
    if (message.type === 'text' && message.content) {
      this.searchIndex.set(message.id, {
        messageId: message.id,
        searchableText: message.content.toLowerCase(),
        timestamp: message.timestamp instanceof Date ? message.timestamp.getTime() : message.timestamp
      });
    }
  }

  /**
   * Search virtualized messages
   */
  searchMessages(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const results: string[] = [];

    this.searchIndex.forEach((index) => {
      if (index.searchableText.includes(lowerQuery)) {
        results.push(index.messageId);
      }
    });

    return results;
  }

  /**
   * Schedule lazy load
   */
  private scheduleLazyLoad(messageId: string): void {
    // Simulate lazy loading with a timeout
    setTimeout(() => {
      const virtualMessage = this.virtualizedMessages.get(messageId);
      if (virtualMessage && virtualMessage.isPlaceholder) {
        // Load content (would fetch from store in real implementation)
        virtualMessage.isPlaceholder = false;
      }
    }, 100);
  }

  /**
   * Load low resolution image
   */
  private loadLowResImage(message: ChatMessage): void {
    // Simulate loading low res image
    setTimeout(() => {
      this.imageCache.set(message.id, {
        lowRes: message.media?.url + '?quality=low'
      });
    }, 50);
  }

  /**
   * Load full resolution image
   */
  private loadFullResImage(message: ChatMessage): void {
    // Simulate loading full res image
    setTimeout(() => {
      const cached = this.imageCache.get(message.id) || {};
      this.imageCache.set(message.id, {
        ...cached,
        fullRes: message.media?.url
      });
    }, 500);
  }

  /**
   * Get scroll position for message
   */
  getMessageScrollPosition(messageId: string): number | null {
    const virtualMessage = this.virtualizedMessages.get(messageId);
    return virtualMessage ? virtualMessage.offset : null;
  }

  /**
   * Restore scroll position
   */
  restoreScrollPosition(
    previousMessages: ChatMessage[],
    newMessages: ChatMessage[],
    previousScrollOffset: number
  ): number {
    if (previousMessages.length === 0 || newMessages.length === 0) {
      return previousScrollOffset;
    }

    // Find a stable reference message
    const referenceMessage = previousMessages[Math.floor(previousMessages.length / 2)];
    const referenceIndex = newMessages.findIndex(m => m.id === referenceMessage.id);

    if (referenceIndex === -1) {
      return previousScrollOffset;
    }

    // Calculate offset difference
    let previousOffset = 0;
    let newOffset = 0;

    for (let i = 0; i < previousMessages.length; i++) {
      if (previousMessages[i].id === referenceMessage.id) break;
      previousOffset += this.getMessageHeight(previousMessages[i]);
    }

    for (let i = 0; i < referenceIndex; i++) {
      newOffset += this.getMessageHeight(newMessages[i]);
    }

    const offsetDifference = newOffset - previousOffset;
    return Math.max(0, previousScrollOffset + offsetDifference);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): { renders: number; memSaved: number; cacheHitRate: number } {
    const cacheHits = Array.from(this.messageHeights.values()).length;
    const totalRequests = this.performanceMetrics.renders * 50; // Estimate

    return {
      ...this.performanceMetrics,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0
    };
  }

  /**
   * Clear virtualization state
   */
  clear(): void {
    this.virtualizedMessages.clear();
    this.messageHeights.clear();
    this.searchIndex.clear();
    this.imageCache.clear();
    this.performanceMetrics = { renders: 0, memSaved: 0 };
  }

  /**
   * Prefetch message heights
   */
  prefetchHeights(messages: ChatMessage[]): void {
    messages.forEach(message => {
      if (!this.messageHeights.has(message.id)) {
        this.getMessageHeight(message);
      }
    });
  }

  /**
   * Optimize for device
   */
  optimizeForDevice(deviceSpecs: { memory?: number; cpu?: number }): void {
    if (deviceSpecs.memory && deviceSpecs.memory < 2048) {
      // Low memory device
      this.options.bufferSize = 5;
      this.options.maxTextLength = 300;
    } else if (deviceSpecs.memory && deviceSpecs.memory > 4096) {
      // High memory device
      this.options.bufferSize = 20;
      this.options.maxTextLength = 1000;
    }
  }
}

// Export singleton instance
export const messageVirtualizer = new MessageVirtualizer();