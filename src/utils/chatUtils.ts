/**
 * Chat utility functions for message processing and formatting
 */

export interface MessageGroup {
  senderId: string;
  messages: any[];
  timestamp: Date;
}

/**
 * Group consecutive messages from the same sender
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
