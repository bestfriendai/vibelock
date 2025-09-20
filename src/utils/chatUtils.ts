/**
 * Chat utility functions for message processing and formatting
 * Enhanced with optimizations for large message datasets
 */

import { performanceMonitor } from './performance';
import { memoryManager } from '../services/memoryManager';
import { messageVirtualizer } from '../services/messageVirtualizer';

export interface MessageGroup {
  senderId: string;
  messages: any[];
  timestamp: Date;
}

/**
 * Enhanced message grouping with position metadata for optimized rendering
 */
export interface MessageWithGrouping {
  message: any;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  groupId: string;
  timeSincePrevious: number;
  timeToNext: number;
}

/**
 * Group consecutive messages from the same sender with enhanced metadata
 */
export function groupMessages(messages: any[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message) => {
    if (
      !currentGroup ||
      currentGroup.senderId !== message.senderId ||
      // Start new group if more than 5 minutes apart
      new Date(message.timestamp).getTime() - currentGroup.timestamp.getTime() > 300000
    ) {
      currentGroup = {
        senderId: message.senderId,
        messages: [message],
        timestamp: new Date(message.timestamp),
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(message);
      currentGroup.timestamp = new Date(message.timestamp);
    }
  });

  return groups;
}

/**
 * Create optimized message list with grouping metadata for efficient rendering
 */
export function createOptimizedMessageList(messages: any[]): MessageWithGrouping[] {
  if (!messages || messages.length === 0) return [];

  const result: MessageWithGrouping[] = [];
  const groupingThreshold = 5 * 60 * 1000; // 5 minutes

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const previousMessage = i > 0 ? messages[i - 1] : null;
    const nextMessage = i < messages.length - 1 ? messages[i + 1] : null;

    const thisTime = new Date(message.timestamp).getTime();
    const prevTime = previousMessage ? new Date(previousMessage.timestamp).getTime() : 0;
    const nextTime = nextMessage ? new Date(nextMessage.timestamp).getTime() : 0;

    const timeSincePrevious = prevTime ? thisTime - prevTime : 0;
    const timeToNext = nextTime ? nextTime - thisTime : 0;

    const sameSenderAsPrev = previousMessage && previousMessage.senderId === message.senderId;
    const sameSenderAsNext = nextMessage && nextMessage.senderId === message.senderId;

    const closeToPrev = sameSenderAsPrev && timeSincePrevious <= groupingThreshold;
    const closeToNext = sameSenderAsNext && timeToNext <= groupingThreshold;

    const isFirstInGroup = !closeToPrev;
    const isLastInGroup = !closeToNext;

    // Create a stable group ID for memoization
    const groupId = `${message.senderId}_${Math.floor(thisTime / groupingThreshold)}`;

    result.push({
      message,
      isFirstInGroup,
      isLastInGroup,
      groupId,
      timeSincePrevious,
      timeToNext,
    });
  }

  return result;
}

/**
 * Memoized grouping cache to prevent recalculation
 */
const groupingCache = new Map<string, MessageWithGrouping[]>();
const maxCacheSize = 5; // Reduced to 5 for better memory efficiency with large datasets
const cacheAccessTime = new Map<string, number>();

export function getCachedOptimizedMessageList(
  roomId: string,
  messages: any[],
  messagesHash?: string,
): MessageWithGrouping[] {
  const startTime = performance.now();

  // For large datasets, use more aggressive caching
  const isLargeDataset = messages.length > 100;
  const effectiveCacheSize = isLargeDataset ? 3 : maxCacheSize;

  // Create a hash of the messages for cache invalidation
  const hash = messagesHash || `${messages.length}_${messages[0]?.id || ""}_${messages[messages.length - 1]?.id || ""}`;
  const cacheKey = `${roomId}_${hash}`;

  // Check cache first
  if (groupingCache.has(cacheKey)) {
    cacheAccessTime.set(cacheKey, Date.now());
    memoryManager.updateCacheAccess('messageGrouping');
    return groupingCache.get(cacheKey)!;
  }

  // Calculate new grouping
  const optimizedList = createOptimizedMessageList(messages);

  // Smart LRU eviction based on usage patterns
  if (groupingCache.size >= effectiveCacheSize) {
    // Find least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    groupingCache.forEach((_, key) => {
      const accessTime = cacheAccessTime.get(key) || 0;
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      groupingCache.delete(oldestKey);
      cacheAccessTime.delete(oldestKey);
    }
  }

  groupingCache.set(cacheKey, optimizedList);
  cacheAccessTime.set(cacheKey, Date.now());

  // Register cache size with memory manager
  const cacheSize = JSON.stringify(optimizedList).length * 2;
  memoryManager.registerCache('messageGrouping', cacheSize);

  const endTime = performance.now();
  if (messages.length > 100) {
    performanceMonitor.recordMetric('largeMessageGrouping', {
      messageCount: messages.length,
      processingTime: endTime - startTime,
      cacheHit: false
    });
  }

  return optimizedList;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;

  return `${size} ${sizes[i]}`;
}

/**
 * Sanitize message content
 */
export function sanitizeMessage(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .slice(0, 1000); // Max 1000 characters
}

/**
 * Check if message contains mentions
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match[1]) {
      mentions.push(match[1]);
    }
  }

  return mentions;
}

/**
 * Generate optimistic message ID
 */
export function generateOptimisticId(): string {
  return `optimistic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create virtualized message list for large datasets
 */
export function createVirtualizedMessageList(
  messages: any[],
  viewportInfo: { scrollOffset: number; viewportHeight: number }
): any[] {
  return messageVirtualizer.virtualizeMessages(
    messages,
    viewportInfo.viewportHeight,
    viewportInfo.scrollOffset
  );
}

/**
 * Get message height estimate for virtualization
 */
export function getMessageHeightEstimate(message: any): number {
  let height = 80; // Base height

  if (message.type === 'text' && message.content) {
    const lines = Math.ceil(message.content.length / 40);
    height = Math.min(lines * 20 + 60, 300);
  } else if (message.type === 'image' || message.type === 'video') {
    height = 220; // Default media height
  } else if (message.type === 'voice') {
    height = 60;
  } else if (message.type === 'document') {
    height = 80;
  }

  // Add extra for reactions and replies
  if (message.reactions?.length > 0) height += 30;
  if (message.replyTo) height += 40;

  return height;
}

/**
 * Check if message should be cleaned up
 */
export function shouldCleanupMessage(
  message: any,
  currentTime: number,
  retentionPolicy: { maxAge?: number; keepImportant?: boolean } = {}
): boolean {
  const messageTime = message.timestamp instanceof Date
    ? message.timestamp.getTime()
    : new Date(message.timestamp).getTime();

  const age = currentTime - messageTime;
  const maxAge = retentionPolicy.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days default

  // Keep important messages (with reactions, replies)
  if (retentionPolicy.keepImportant) {
    if (message.reactions?.length > 0) return false;
    if (message.replyTo || message.repliedBy?.length > 0) return false;
  }

  return age > maxAge;
}

/**
 * Optimize messages for large dataset
 */
export function optimizeForLargeDataset(
  messages: any[],
  threshold: number = 100
): any[] {
  if (messages.length <= threshold) {
    return messages;
  }

  const currentTime = Date.now();
  const optimized = messages.map((message, index) => {
    // Skip optimization for recent messages (last 50)
    if (index >= messages.length - 50) {
      return message;
    }

    // Older messages get optimized
    const optimizedMessage = { ...message };
    const messageAge = currentTime - new Date(message.timestamp).getTime();
    const daysOld = messageAge / (24 * 60 * 60 * 1000);

    // Summarize very long text for old messages
    if (message.type === 'text' && message.content?.length > 500) {
      if (daysOld > 7) {
        optimizedMessage.content = message.content.substring(0, 200) + '...';
        optimizedMessage.metadata = {
          ...optimizedMessage.metadata,
          isSummarized: true,
          originalLength: message.content.length
        };
      }
    }

    // Remove heavy media metadata for very old messages
    if (daysOld > 30 && (message.type === 'image' || message.type === 'video')) {
      optimizedMessage.media = {
        url: message.media?.url,
        type: message.media?.type,
        // Remove detailed metadata
      };
    }

    return optimizedMessage;
  });

  performanceMonitor.recordMetric('messageOptimization', {
    originalCount: messages.length,
    optimizedCount: optimized.length,
    memorySaved: JSON.stringify(messages).length - JSON.stringify(optimized).length
  });

  return optimized;
}

/**
 * Clear message grouping cache
 */
export function clearGroupingCache(roomId?: string): void {
  if (roomId) {
    // Clear specific room cache
    const keysToDelete: string[] = [];
    groupingCache.forEach((_, key) => {
      if (key.startsWith(roomId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      groupingCache.delete(key);
      cacheAccessTime.delete(key);
    });
  } else {
    // Clear all cache
    groupingCache.clear();
    cacheAccessTime.clear();
  }
}

/**
 * Check if two timestamps should show a date separator
 */
export function shouldShowDateSeparator(currentMessage: Date, previousMessage?: Date): boolean {
  if (!previousMessage) return true;

  const current = new Date(currentMessage);
  const previous = new Date(previousMessage);

  // Show separator if messages are on different days
  return (
    current.getFullYear() !== previous.getFullYear() ||
    current.getMonth() !== previous.getMonth() ||
    current.getDate() !== previous.getDate()
  );
}
