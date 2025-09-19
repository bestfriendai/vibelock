/**
 * Chat utility functions for message processing and formatting
 */

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
const maxCacheSize = 10; // Keep last 10 room groupings

export function getCachedOptimizedMessageList(
  roomId: string,
  messages: any[],
  messagesHash?: string,
): MessageWithGrouping[] {
  // Create a hash of the messages for cache invalidation
  const hash = messagesHash || `${messages.length}_${messages[0]?.id || ""}_${messages[messages.length - 1]?.id || ""}`;
  const cacheKey = `${roomId}_${hash}`;

  // Check cache first
  if (groupingCache.has(cacheKey)) {
    return groupingCache.get(cacheKey)!;
  }

  // Calculate new grouping
  const optimizedList = createOptimizedMessageList(messages);

  // Update cache with LRU eviction
  if (groupingCache.size >= maxCacheSize) {
    const firstKey = groupingCache.keys().next().value;
    if (firstKey) {
      groupingCache.delete(firstKey);
    }
  }
  groupingCache.set(cacheKey, optimizedList);

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
