import { Message } from "../types";

interface DeduplicationOptions {
  maxCacheSize?: number;
  fingerprintFields?: (keyof Message)[];
  ttl?: number;
}

const DEFAULT_OPTIONS: Required<DeduplicationOptions> = {
  maxCacheSize: 1000,
  fingerprintFields: ["id", "senderId", "chatRoomId", "content", "timestamp"],
  ttl: 3600000, // 1 hour
};

export class MessageDeduplicator {
  private fingerprints = new Map<string, { message: Message; timestamp: number }>();
  private messageIds = new Set<string>();
  private options: Required<DeduplicationOptions>;

  constructor(options: DeduplicationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private createFingerprint(message: Message): string {
    const parts: string[] = [];

    for (const field of this.options.fingerprintFields) {
      const value = message[field];
      if (value !== undefined && value !== null) {
        parts.push(`${field}:${String(value)}`);
      }
    }

    return parts.join("|");
  }

  private cleanupOldEntries() {
    const now = Date.now();
    const cutoff = now - this.options.ttl;

    for (const [fingerprint, entry] of this.fingerprints.entries()) {
      if (entry.timestamp < cutoff) {
        this.fingerprints.delete(fingerprint);
        if (entry.message.id) {
          this.messageIds.delete(entry.message.id);
        }
      }
    }

    if (this.fingerprints.size > this.options.maxCacheSize) {
      const sortedEntries = Array.from(this.fingerprints.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = sortedEntries.slice(0, this.fingerprints.size - this.options.maxCacheSize);
      for (const [fingerprint, entry] of toRemove) {
        this.fingerprints.delete(fingerprint);
        if (entry.message.id) {
          this.messageIds.delete(entry.message.id);
        }
      }
    }
  }

  isDuplicate(message: Message): boolean {
    if (message.id && this.messageIds.has(message.id)) {
      return true;
    }

    const fingerprint = this.createFingerprint(message);
    const existing = this.fingerprints.get(fingerprint);

    if (existing) {
      const messageTime = message.timestamp || (message as any).createdAt;
      const existingTime = existing.message.timestamp || (existing.message as any).createdAt;
      const timeDiff = Math.abs(new Date(messageTime).getTime() - new Date(existingTime).getTime());

      if (timeDiff < 1000) {
        return true;
      }
    }

    return false;
  }

  addMessage(message: Message): boolean {
    if (this.isDuplicate(message)) {
      return false;
    }

    const fingerprint = this.createFingerprint(message);
    this.fingerprints.set(fingerprint, {
      message,
      timestamp: Date.now(),
    });

    if (message.id) {
      this.messageIds.add(message.id);
    }

    this.cleanupOldEntries();
    return true;
  }

  deduplicateMessages(messages: Message[]): Message[] {
    const uniqueMessages: Message[] = [];

    for (const message of messages) {
      if (this.addMessage(message)) {
        uniqueMessages.push(message);
      }
    }

    return uniqueMessages;
  }

  clear() {
    this.fingerprints.clear();
    this.messageIds.clear();
  }

  removeMessage(messageId: string) {
    this.messageIds.delete(messageId);

    for (const [fingerprint, entry] of this.fingerprints.entries()) {
      if (entry.message.id === messageId) {
        this.fingerprints.delete(fingerprint);
        break;
      }
    }
  }

  getSize(): number {
    return this.fingerprints.size;
  }
}

export function createMessageDeduplicator(options?: DeduplicationOptions): MessageDeduplicator {
  return new MessageDeduplicator(options);
}
