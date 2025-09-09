/**
 * Date and time utility functions
 */

/**
 * Safely convert various timestamp representations to a Date object
 * Handles: Date objects, ISO strings, Unix timestamps (seconds/milliseconds), Firestore Timestamps
 * This is the centralized function for all timestamp normalization in the app
 */
export function toDateSafe(value: any): Date {
  try {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
    if (typeof value === "number") {
      // Treat values < 1e12 as seconds (Firestore), otherwise milliseconds
      return new Date(value < 1e12 ? value * 1000 : value);
    }
    if (typeof value === "string") {
      // Handle ISO strings and other string formats
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) {
        console.warn(`Invalid date string: ${value}`);
        return new Date();
      }
      return parsed;
    }
    console.warn(`Unknown date format: ${typeof value}`, value);
    return new Date();
  } catch (error) {
    console.error(`Error parsing date: ${value}`, error);
    return new Date();
  }
}

/**
 * Format a date/time for display in chat messages
 * Returns time in format like "2:30 PM" or "Yesterday 2:30 PM"
 */
export function formatTime(date: string | Date): string {
  const messageDate = toDateSafe(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

  // Calculate difference in days
  const diffTime = today.getTime() - messageDay.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Format time
  const timeString = messageDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) {
    // Today - just show time
    return timeString;
  } else if (diffDays === 1) {
    // Yesterday
    return `Yesterday ${timeString}`;
  } else if (diffDays < 7) {
    // This week - show day name
    const dayName = messageDate.toLocaleDateString("en-US", { weekday: "long" });
    return `${dayName} ${timeString}`;
  } else {
    // Older - show date
    const dateString = messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${dateString} ${timeString}`;
  }
}

/**
 * Format a date for display in reviews
 * Returns format like "2 hours ago", "Yesterday", "Jan 15"
 */
export function formatRelativeTime(date: string | Date): string {
  const targetDate = toDateSafe(date);
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}y ago`;
  }
}

/**
 * Format a full date and time for detailed display
 */
export function formatFullDateTime(date: string | Date): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;

  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: string | Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Format duration in milliseconds to readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else {
    return `0:${seconds.toString().padStart(2, "0")}`;
  }
}

/**
 * Get time ago string for notifications
 */
export function getTimeAgo(date: string | Date): string {
  const targetDate = toDateSafe(date);
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else {
    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}
