import { Message } from "../types";

const EDIT_TIME_LIMIT_MINUTES = 15;

/**
 * Check if a message can be edited by the current user
 */
export function canEditMessage(message: Message, currentUserId: string): boolean {
  // Must be the sender
  if (message.senderId !== currentUserId) {
    return false;
  }

  // Only text messages can be edited
  if (message.messageType !== "text") {
    return false;
  }

  // Check time limit
  const messageAge = Date.now() - new Date(message.timestamp).getTime();
  const timeLimitMs = EDIT_TIME_LIMIT_MINUTES * 60 * 1000;

  return messageAge <= timeLimitMs;
}

/**
 * Format the edited timestamp for display
 */
export function formatEditedTimestamp(editedAt: Date): string {
  const now = new Date();
  const diff = now.getTime() - editedAt.getTime();

  // Less than a minute
  if (diff < 60 * 1000) {
    return "just now";
  }

  // Less than an hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  // Less than a day
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  // Less than a week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // Default to date
  return editedAt.toLocaleDateString();
}

/**
 * Format forwarded message attribution
 */
export function formatForwardedAttribution(forwardedFromSender: string, forwardedFromRoom?: string): string {
  if (forwardedFromRoom) {
    return `Forwarded from ${forwardedFromSender} in ${forwardedFromRoom}`;
  }
  return `Forwarded from ${forwardedFromSender}`;
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: "Message cannot be empty" };
  }

  if (content.length > 5000) {
    return { isValid: false, error: "Message is too long (max 5000 characters)" };
  }

  // Check for excessive newlines
  const newlineCount = (content.match(/\n/g) || []).length;
  if (newlineCount > 50) {
    return { isValid: false, error: "Too many line breaks" };
  }

  // Check for spam patterns (basic check)
  const repeatedChars = /(.)\1{50,}/;
  if (repeatedChars.test(content)) {
    return { isValid: false, error: "Message contains spam patterns" };
  }

  return { isValid: true };
}

/**
 * Generate formatted content for forwarded messages
 */
export function generateForwardedContent(originalMessage: Message, comment?: string): string {
  let content = "";

  if (comment && comment.trim()) {
    content += `${comment.trim()}\n\n`;
  }

  content += `--- Forwarded message ---\n`;
  content += `From: ${originalMessage.senderName}\n`;
  content += `Date: ${new Date(originalMessage.timestamp).toLocaleString()}\n\n`;

  if (originalMessage.messageType === "text") {
    content += originalMessage.content;
  } else {
    content += `[${originalMessage.messageType.toUpperCase()} MESSAGE]`;
    if (originalMessage.content) {
      content += `\n${originalMessage.content}`;
    }
  }

  return content;
}

/**
 * Extract searchable keywords from a message
 */
export function getMessageSearchKeywords(message: Message): string[] {
  const keywords: string[] = [];

  // Extract from content
  if (message.content) {
    const words = message.content
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);
    keywords.push(...words);
  }

  // Extract from sender name
  if (message.senderName) {
    keywords.push(message.senderName.toLowerCase());
  }

  // Extract from transcription (for voice messages)
  if (message.transcription) {
    const transcriptionWords = message.transcription
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);
    keywords.push(...transcriptionWords);
  }

  // Remove duplicates
  return [...new Set(keywords)];
}

/**
 * Highlight search terms in message content
 */
export function highlightSearchTerms(content: string, searchQuery: string): string {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return content;
  }

  // Escape special regex characters
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create regex for case-insensitive search
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  // Wrap matched terms in highlight tags
  return content.replace(regex, "<mark>$1</mark>");
}

/**
 * Check if a message matches search criteria
 */
export function messageMatchesSearch(message: Message, searchQuery: string): boolean {
  const query = searchQuery.toLowerCase();

  // Search in content
  if (message.content && message.content.toLowerCase().includes(query)) {
    return true;
  }

  // Search in sender name
  if (message.senderName && message.senderName.toLowerCase().includes(query)) {
    return true;
  }

  // Search in transcription
  if (message.transcription && message.transcription.toLowerCase().includes(query)) {
    return true;
  }

  return false;
}

/**
 * Get time remaining for editing a message
 */
export function getEditTimeRemaining(message: Message): {
  canEdit: boolean;
  minutesRemaining: number;
  secondsRemaining: number;
} {
  const messageAge = Date.now() - new Date(message.timestamp).getTime();
  const timeLimitMs = EDIT_TIME_LIMIT_MINUTES * 60 * 1000;
  const timeRemaining = timeLimitMs - messageAge;

  if (timeRemaining <= 0) {
    return { canEdit: false, minutesRemaining: 0, secondsRemaining: 0 };
  }

  const minutesRemaining = Math.floor(timeRemaining / (60 * 1000));
  const secondsRemaining = Math.floor((timeRemaining % (60 * 1000)) / 1000);

  return { canEdit: true, minutesRemaining, secondsRemaining };
}

/**
 * Sanitize message content for display
 */
export function sanitizeMessageContent(content: string): string {
  // Remove any HTML tags
  const withoutHtml = content.replace(/<[^>]*>/g, "");

  // Convert URLs to clickable links (basic implementation)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const withLinks = withoutHtml.replace(urlRegex, "[LINK]");

  // Trim excessive whitespace
  const trimmed = withLinks.replace(/\s+/g, " ").trim();

  return trimmed;
}

/**
 * Format message for clipboard copy
 */
export function formatMessageForCopy(message: Message): string {
  let formatted = `[${new Date(message.timestamp).toLocaleString()}] ${message.senderName}: `;

  if (message.messageType === "text") {
    formatted += message.content;
  } else {
    formatted += `[${message.messageType.toUpperCase()} MESSAGE]`;
    if (message.content) {
      formatted += ` - ${message.content}`;
    }
  }

  if (message.isEdited) {
    formatted += " (edited)";
  }

  if (message.forwardedFromSender) {
    formatted += ` (forwarded from ${message.forwardedFromSender})`;
  }

  return formatted;
}

/**
 * Group messages by date for display
 */
export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  messages.forEach((message) => {
    const messageDate = new Date(message.timestamp);
    messageDate.setHours(0, 0, 0, 0);

    let dateKey: string;
    if (messageDate.getTime() === today.getTime()) {
      dateKey = "Today";
    } else if (messageDate.getTime() === yesterday.getTime()) {
      dateKey = "Yesterday";
    } else {
      dateKey = messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });

  return groups;
}
