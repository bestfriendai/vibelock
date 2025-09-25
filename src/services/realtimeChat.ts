// Enhanced Supabase Real-time Chat Service (2025) - Complete Rewrite with v2.57.4 Compatibility
import supabase from "../config/supabase";
import { ChatMessage, ChatMember, MessageEvent } from "../types";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { AppError, ErrorType } from "../utils/errorHandling";
import { realtimeSubscriptionManager } from "./realtimeSubscriptionManager";
import {
  validateSubscriptionState,
  checkQuotaLimits,
  trackPerformanceMetrics,
  checkConnectionHealth,
  classifyError,
} from "../utils/realtimeUtils";

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface PresenceCallback {
  (members: ChatMember[]): void;
}

interface TypingCallback {
  (typingUsers: TypingUser[]): void;
}

interface MessageCacheEntry {
  message: ChatMessage;
  timestamp: number;
  isOptimistic: boolean;
  fingerprint: string;
  state: "optimistic" | "sent" | "confirmed";
}

interface SubscriptionState {
  status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED" | "CONNECTING";
  lastStateChange: number;
  retryCount: number;
}

class EnhancedRealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, (event: MessageEvent) => void> = new Map();
  private presenceCallbacks: Map<string, PresenceCallback> = new Map();
  private typingCallbacks: Map<string, TypingCallback> = new Map();

  // Enhanced connection management with v2.57.4 compatibility
  private connectionStatus: "connected" | "connecting" | "disconnected" = "disconnected";
  private isInitialized: boolean = false;
  private subscriptionStates: Map<string, SubscriptionState> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 5;
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private quotaMonitoring = {
    enabled: true,
    messageCount: 0,
    lastReset: Date.now(),
    warningThreshold: 1800000, // 90% of 2M free tier
    criticalThreshold: 1950000, // 97.5% of 2M free tier
  };

  // Enhanced message deduplication
  private messageCache: Map<string, Map<string, MessageCacheEntry>> = new Map();
  private optimisticMessages: Map<string, Map<string, ChatMessage>> = new Map();
  private messageFingerprints: Map<string, Set<string>> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private typingDebounceTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Performance optimization with simple batching
  private batchedUpdates: Map<string, ChatMessage[]> = new Map();
  private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxCacheSize = 500; // Maximum messages to cache per room
  private batchWindowMs = 300; // Batch window for message updates
  private subscriptionFilters: Map<string, Set<string>> = new Map();

  async initialize() {
    // Detect actual transport method used by Supabase
    const transportMethod = this.detectTransportMethod();
    // Log warning if Web Workers are detected in React Native
    if (typeof Worker !== "undefined") {
    }

    this.connectionStatus = "connecting";

    try {
      // Test Supabase connection health
      const { data: healthCheck, error: healthError } = await supabase
        .from("chat_rooms_firebase")
        .select("count")
        .limit(1);

      if (healthError) {
        console.error("🚨 Supabase health check failed:", healthError);
        throw new AppError(`Database connection failed: ${healthError.message}`, ErrorType.NETWORK);
      }

      // Test realtime connection
      const realtimeStatus = supabase.realtime?.isConnected?.() ?? false;
      // Connection status will be managed per channel
      this.connectionStatus = "connected";
      this.isInitialized = true;
    } catch (error) {
      console.error("🚨 Failed to initialize real-time service:", error);
      console.error("🚨 Error details:", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        type: typeof error,
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3) : undefined,
      });
      this.connectionStatus = "disconnected";
      throw new AppError("Failed to initialize chat service", ErrorType.NETWORK);
    }
  }

  async joinRoom(roomId: string, userId: string, userName: string): Promise<RealtimeChannel> {
    try {
      // Log transport method
      console.log("Transport method detected");

      // Clean up existing channel if any
      await this.leaveRoom(roomId);

      // Validate subscription state before joining
      const subscriptionKey = `enhanced_room_${roomId}`;
      if (!validateSubscriptionState(subscriptionKey, new Map())) {
        throw new AppError("Invalid subscription state for room", ErrorType.VALIDATION, "INVALID_SUBSCRIPTION_STATE");
      }

      // Check quota limits before creating subscription
      const quotaStatus = checkQuotaLimits(this.quotaMonitoring);
      if (!quotaStatus.allowed) {
        throw new AppError(`Quota limit exceeded: ${quotaStatus.reason}`, ErrorType.SERVER, "QUOTA_EXCEEDED");
      }

      // Initialize enhanced message caches for this room
      if (!this.messageCache.has(roomId)) {
        this.messageCache.set(roomId, new Map());
      }
      if (!this.optimisticMessages.has(roomId)) {
        this.optimisticMessages.set(roomId, new Map());
      }
      if (!this.messageFingerprints.has(roomId)) {
        this.messageFingerprints.set(roomId, new Set());
      }
      // Priority queues removed - using simple batching instead
      if (!this.subscriptionFilters.has(roomId)) {
        this.subscriptionFilters.set(roomId, new Set(["INSERT", "UPDATE"]));
      }

      // Initialize subscription state tracking
      this.subscriptionStates.set(roomId, {
        status: "CONNECTING",
        lastStateChange: Date.now(),
        retryCount: 0,
      });

      // Create enhanced channel with React Native specific configuration
      const channelConfig: any = {
        config: {
          presence: {
            key: `user_${userId}`,
          },
          broadcast: {
            self: false, // Don't receive own broadcasts
          },
        },
      };

      // Force WebSocket transport if available in channel options
      if ((supabase as any).realtime?.transport === "websocket") {
      }

      const channel = supabase
        .channel(`enhanced_room_${roomId}`, channelConfig)
        // Listen to new messages
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleNewMessage(roomId, payload),
        )
        // Listen to message updates (edits, deletions)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleMessageUpdate(roomId, payload),
        )
        // Listen to presence changes (online/offline)
        .on("presence", { event: "sync" }, () => {
          this.handlePresenceSync(roomId, channel);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {})
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {})
        // Listen to typing indicators
        .on("broadcast", { event: "typing" }, (payload) => {
          this.handleTypingBroadcast(roomId, payload);
        })
        // Enhanced subscription status handling with v2.57.4 state management
        .subscribe(async (status, error) => {
          // Check for Web Workers related errors
          if (error && this.isWebWorkersError(error)) {
            console.error("🚨 Web Workers error detected:", error);
            // Attempt recovery with fallback
            await this.handleWebWorkersFailure(roomId, userId, userName);
            return;
          }

          const subscriptionState = this.subscriptionStates.get(roomId);
          if (subscriptionState) {
            subscriptionState.status = status as any;
            subscriptionState.lastStateChange = Date.now();
          } else {
          }

          // Validate state transition (but don't fail on invalid transitions)
          if (!this.isValidStateTransition(roomId, status)) {
            // Don't treat state transition issues as fatal errors
            // Just log and continue - the subscription might still work
          }

          if (status === "SUBSCRIBED") {
            // Update quota usage
            this.quotaMonitoring.messageCount++;

            // Track user presence
            await channel.track({
              user_id: userId,
              user_name: userName,
              online_at: new Date().toISOString(),
              status: "online",
            });

            // Start health monitoring
            this.startHealthMonitoring(roomId, channel);

            // Load initial messages
            await this.loadInitialMessages(roomId);

            // Track performance metrics
            const cacheEntry: MessageCacheEntry = {
              message: {} as ChatMessage,
              timestamp: Date.now(),
              isOptimistic: false,
              fingerprint: `subscription_${roomId}`,
              state: "confirmed",
            };
            trackPerformanceMetrics(cacheEntry, "subscription_established");

            this.retryAttempts.delete(roomId);
          } else if (status === "CHANNEL_ERROR") {
            const classifiedError = classifyError(error);
            this.handleSubscriptionError(roomId, classifiedError);
          } else if (status === "TIMED_OUT") {
            this.handleSubscriptionTimeout(roomId);
          } else if (status === "CLOSED") {
            this.handleChannelClosed(roomId);
          }
        });

      this.channels.set(roomId, channel);
      return channel;
    } catch (error: any) {
      throw new AppError(`Failed to join chat room: ${error?.message || "Unknown error"}`, ErrorType.NETWORK);
    }
  }

  // Enhanced message loading with pagination
  async loadInitialMessages(roomId: string, limit: number = 50): Promise<void> {
    try {
      const { data: messages, error } = await supabase
        .from("chat_messages_firebase")
        .select(
          `
          id,
          chat_room_id,
          sender_id,
          sender_name,
          sender_avatar,
          content,
          message_type,
          timestamp,
          is_read,
          is_deleted,
          reply_to,
          reactions
        `,
        )
        .eq("chat_room_id", roomId)
        .eq("is_deleted", false)
        .order("timestamp", { ascending: false }) // Latest first for pagination
        .limit(limit);

      if (error) {
        throw error;
      }

      if (messages && messages.length > 0) {
        // Convert to app-preferred order: oldest -> newest for bottom-anchored lists
        const formattedMessages = messages.map((msg) => this.formatMessage(msg)).reverse();

        // Update enhanced cache with metadata
        const cache = this.messageCache.get(roomId) || new Map();
        const fingerprints = this.messageFingerprints.get(roomId) || new Set();

        formattedMessages.forEach((msg) => {
          const fingerprint = this.generateMessageFingerprint(msg);
          cache.set(msg.id, {
            message: msg,
            timestamp: Date.now(),
            isOptimistic: false,
            fingerprint,
            state: "confirmed",
          });
          fingerprints.add(fingerprint);
        });

        this.messageCache.set(roomId, cache);
        this.messageFingerprints.set(roomId, fingerprints);
        this.cleanupOldMessages(roomId);

        // Notify callback with initial messages (this replaces all messages)
        const callback = this.messageCallbacks.get(roomId);
        if (callback) {
          // For initial load, we need to replace all messages
          callback({ type: "initial", items: formattedMessages });
        } else {
        }
      }
    } catch (error) {
      throw new AppError("Failed to load chat messages", ErrorType.SERVER);
    }
  }

  // Load older messages for pagination
  async loadOlderMessages(roomId: string, beforeTimestamp: string, limit: number = 30): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from("chat_messages_firebase")
        .select("*")
        .eq("chat_room_id", roomId)
        .eq("is_deleted", false)
        .lt("timestamp", beforeTimestamp)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Return in ascending order (oldest -> newest) so caller can prepend
      return messages ? messages.map((msg) => this.formatMessage(msg)).reverse() : [];
    } catch (error) {
      return [];
    }
  }

  // Enhanced message handling with advanced deduplication and optimistic replacement
  private handleNewMessage(roomId: string, payload: any): void {
    try {
      if (!payload.new) return;

      const messageId = payload.new.id;
      const cache = this.messageCache.get(roomId) || new Map();
      const fingerprints = this.messageFingerprints.get(roomId) || new Set();
      const optimisticMessages = this.optimisticMessages.get(roomId) || new Map();

      // Check if message already exists by ID
      if (cache.has(messageId)) {
        return;
      }

      const newMessage = this.formatMessage(payload.new);
      const fingerprint = this.generateMessageFingerprint(newMessage);

      // Check for duplicate by fingerprint
      if (fingerprints.has(fingerprint)) {
        return;
      }

      // Check if this is a real message replacing an optimistic one
      let tempId: string | undefined;
      for (const [optimisticId, optimisticMsg] of optimisticMessages.entries()) {
        const optimisticFingerprint = this.generateMessageFingerprint(optimisticMsg);
        if (
          optimisticFingerprint === fingerprint ||
          (optimisticMsg.senderId === newMessage.senderId &&
            optimisticMsg.content === newMessage.content &&
            Math.abs(
              (optimisticMsg.timestamp instanceof Date
                ? optimisticMsg.timestamp.getTime()
                : new Date(optimisticMsg.timestamp).getTime()) -
                (newMessage.timestamp instanceof Date
                  ? newMessage.timestamp.getTime()
                  : new Date(newMessage.timestamp).getTime()),
            ) < 5000)
        ) {
          // Found matching optimistic message
          tempId = optimisticId;
          break;
        }
      }

      if (tempId) {
        // Replace optimistic message with real one
        this.replaceOptimisticMessage(roomId, tempId, newMessage);
      }

      // Add to cache with enhanced metadata
      cache.set(messageId, {
        message: newMessage,
        timestamp: Date.now(),
        isOptimistic: false,
        fingerprint,
        state: "confirmed",
      });

      // Update quota monitoring
      this.quotaMonitoring.messageCount++;
      fingerprints.add(fingerprint);

      this.messageCache.set(roomId, cache);
      this.messageFingerprints.set(roomId, fingerprints);

      // Simple batch updates
      if (!tempId) {
        this.batchMessageUpdate(roomId, newMessage);
      }

      // Cleanup old messages periodically
      if (cache.size > this.maxCacheSize) {
        this.cleanupOldMessages(roomId);
      }
    } catch (error) {
      console.error(`[RealtimeChat] Error handling new message for room ${roomId}:`, error);
    }
  }

  /**
   * Simple batch message updates
   */
  private batchMessageUpdate(roomId: string, message: ChatMessage): void {
    // Get or create batch for room
    let batch = this.batchedUpdates.get(roomId);
    if (!batch) {
      batch = [];
      this.batchedUpdates.set(roomId, batch);
    }

    batch.push(message);

    // Clear existing timeout
    const existingTimeout = this.updateTimeouts.get(roomId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for batch processing
    const timeout = setTimeout(() => {
      this.processBatch(roomId);
      this.updateTimeouts.delete(roomId);
    }, this.batchWindowMs);

    this.updateTimeouts.set(roomId, timeout);

    // Process immediately if batch is large
    if (batch.length >= 10) {
      clearTimeout(timeout);
      this.processBatch(roomId);
      this.updateTimeouts.delete(roomId);
    }
  }

  /**
   * Process batch of messages
   */
  private processBatch(roomId: string): void {
    const batch = this.batchedUpdates.get(roomId);
    if (!batch || batch.length === 0) return;

    const callback = this.messageCallbacks.get(roomId);
    if (callback) {
      callback({ type: "new", items: [...batch] });
    }

    // Clear processed batch
    this.batchedUpdates.set(roomId, []);
  }

  // Handle message updates (edits, reactions)
  private handleMessageUpdate(roomId: string, payload: any): void {
    try {
      if (!payload.new) return;

      const updatedMessage = this.formatMessage(payload.new);

      // Notify about message update
      const callback = this.messageCallbacks.get(roomId);
      if (callback) {
        callback({ type: "update", items: [updatedMessage] });
      }
    } catch (error) {
      console.error(`[RealtimeChat] Error handling message update for room ${roomId}:`, error);
    }
  }

  // Enhanced presence handling
  private handlePresenceSync(roomId: string, channel: RealtimeChannel): void {
    try {
      const presenceState: RealtimePresenceState = channel.presenceState();
      const members: ChatMember[] = [];

      Object.entries(presenceState).forEach(([, presences]) => {
        const presence = presences[0] as any; // Get latest presence
        if (presence) {
          members.push({
            id: presence.user_id || "unknown",
            chatRoomId: roomId,
            userId: presence.user_id || "unknown",
            userName: presence.user_name || "Anonymous",
            isOnline: true,
            lastSeen: new Date(presence.online_at || new Date()),
            joinedAt: new Date(presence.online_at || new Date()),
            role: "member",
          });
        }
      });

      const callback = this.presenceCallbacks.get(roomId);
      if (callback) {
        callback(members);
      }
    } catch (error) {
      console.error(`[RealtimeChat] Error handling presence sync for room ${roomId}:`, error);
    }
  }

  // Enhanced typing indicator handling with better state management
  private handleTypingBroadcast(roomId: string, payload: any): void {
    try {
      const { userId, userName, isTyping, timestamp } = payload.payload;

      if (!userId || !userName) return;

      const callback = this.typingCallbacks.get(roomId);
      if (!callback) return;

      if (isTyping) {
        // Add to typing users with improved state management
        const typingUser: TypingUser = { userId, userName, timestamp };

        // Throttle typing updates to prevent UI thrashing
        this.throttleTypingUpdate(roomId, () => {
          callback([typingUser]);
        });

        // Auto-remove after 3 seconds with cleanup
        const timeoutKey = `${roomId}_${userId}`;
        const existingTimeout = this.typingTimeouts.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
          callback([{ userId, userName, timestamp: 0 }]); // timestamp: 0 means stop typing
          this.typingTimeouts.delete(timeoutKey);
        }, 3000);

        this.typingTimeouts.set(timeoutKey, timeout);
      } else {
        // Remove from typing users with proper cleanup
        callback([{ userId, userName, timestamp: 0 }]);
        const timeoutKey = `${roomId}_${userId}`;
        const existingTimeout = this.typingTimeouts.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          this.typingTimeouts.delete(timeoutKey);
        }
      }
    } catch (error) {
      console.error(`[RealtimeChat] Error handling typing broadcast for room ${roomId}:`, error);
    }
  }

  // Send typing indicator with debouncing
  async setTyping(roomId: string, userId: string, userName: string, isTyping: boolean): Promise<void> {
    try {
      const channel = this.channels.get(roomId);
      if (!channel) return;

      // Debounce typing events to prevent spam
      const debounceKey = `${roomId}_${userId}_typing`;
      const existingTimeout = this.typingDebounceTimeouts.get(debounceKey);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (isTyping) {
        // Debounce typing start events
        const timeout = setTimeout(async () => {
          await channel.send({
            type: "broadcast",
            event: "typing",
            payload: {
              userId,
              userName,
              isTyping,
              timestamp: Date.now(),
            },
          });
          this.typingDebounceTimeouts.delete(debounceKey);
        }, 500); // 500ms debounce

        this.typingDebounceTimeouts.set(debounceKey, timeout);
      } else {
        // Send stop typing immediately
        await channel.send({
          type: "broadcast",
          event: "typing",
          payload: {
            userId,
            userName,
            isTyping,
            timestamp: Date.now(),
          },
        });
        this.typingDebounceTimeouts.delete(debounceKey);
      }
    } catch (error) {
      console.error(`[RealtimeChat] Error setting typing indicator for room ${roomId}:`, error);
    }
  }

  // Send message with enhanced error handling
  /**
   * Enhanced message sending with quota monitoring and retry logic
   */
  async sendMessage(
    roomId: string,
    content: string,
    senderId: string,
    senderName: string,
    messageType: string = "text",
    replyTo?: string,
    audioUri?: string,
    audioDuration?: number,
  ): Promise<void> {
    try {
      // Check quota before sending
      const quotaStatus = checkQuotaLimits(this.quotaMonitoring);
      if (!quotaStatus.allowed) {
        throw new AppError(`Cannot send message: ${quotaStatus.reason}`, ErrorType.SERVER, "QUOTA_EXCEEDED");
      }

      // Check subscription health - verify both state and active channel
      const subscriptionState = this.subscriptionStates.get(roomId);
      const activeChannel = this.channels.get(roomId);

      // If we have an active channel, allow sending regardless of state tracking
      // This handles cases where state tracking is out of sync with actual channel status
      if (activeChannel) {
      } else if (subscriptionState) {
        // If no active channel but we have state, check if it's in a valid state
        const allowedStates = ["SUBSCRIBED", "CONNECTING"];
        if (!allowedStates.includes(subscriptionState.status)) {
          throw new AppError(
            `Cannot send message: not connected to room (status: ${subscriptionState.status})`,
            ErrorType.NETWORK,
            "NOT_CONNECTED",
          );
        }
      } else {
        // No channel and no state - definitely not connected
        throw new AppError("Cannot send message: not connected to room", ErrorType.NETWORK, "NOT_CONNECTED");
      }

      const messageData: any = {
        chat_room_id: roomId,
        sender_id: senderId,
        sender_name: senderName,
        content: content.trim(),
        message_type: messageType,
        timestamp: new Date().toISOString(),
        is_read: false,
        is_deleted: false,
        reply_to: replyTo || null,
      };

      if (messageType === "voice") {
        messageData.audio_uri = audioUri;
        messageData.audio_duration = audioDuration;
      }

      const startTime = Date.now();
      const { error } = await supabase.from("chat_messages_firebase").insert(messageData);
      const sendLatency = Date.now() - startTime;

      if (error) {
        const classifiedError = classifyError(error);

        // Track error in subscription state
        if (subscriptionState) {
          subscriptionState.retryCount++;
        }

        throw classifiedError;
      }

      // Update quota and performance metrics
      this.quotaMonitoring.messageCount++;

      // Track performance metrics
      const cacheEntry: MessageCacheEntry = {
        message: {} as ChatMessage,
        timestamp: Date.now(),
        isOptimistic: false,
        fingerprint: `send_${Date.now()}`,
        state: "sent",
      };
      trackPerformanceMetrics(cacheEntry, "message_sent", { latency: sendLatency });

      // Update room's last activity
      await supabase
        .from("chat_rooms_firebase")
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq("id", roomId);
    } catch (error: any) {
      const classifiedError =
        error instanceof AppError
          ? error
          : new AppError(`Failed to send message: ${error?.message || "Unknown error"}`, ErrorType.NETWORK);
      throw classifiedError;
    }
  }

  async sendReaction(roomId: string, messageId: string, userId: string, reaction: string): Promise<void> {
    try {
      // First, get the current reactions for the message
      const { data: message, error: fetchError } = await supabase
        .from("chat_messages_firebase")
        .select("reactions")
        .eq("id", messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions = Array.isArray(message?.reactions) ? message.reactions : [];

      // Check if user has already reacted with this emoji
      const existingReactionIndex = currentReactions.findIndex(
        (r: any) => r.user_id === userId && r.emoji === reaction,
      );

      if (existingReactionIndex > -1) {
        // User is removing their reaction
        currentReactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction
        currentReactions.push({ user_id: userId, emoji: reaction });
      }

      // Update the message with the new reactions
      const { error: updateError } = await supabase
        .from("chat_messages_firebase")
        .update({ reactions: currentReactions })
        .eq("id", messageId);

      if (updateError) throw updateError;
    } catch (error: any) {
      throw new AppError(`Failed to send reaction: ${error?.message || "Unknown error"}`, ErrorType.NETWORK);
    }
  }

  // Subscribe to callbacks
  subscribeToMessages(roomId: string, callback: (event: MessageEvent) => void): void {
    this.messageCallbacks.set(roomId, callback);
  }

  subscribeToPresence(roomId: string, callback: PresenceCallback): void {
    this.presenceCallbacks.set(roomId, callback);
  }

  subscribeToTyping(roomId: string, callback: TypingCallback): void {
    this.typingCallbacks.set(roomId, callback);
  }

  /**
   * Enhanced subscription error handling with classification
   */
  private handleSubscriptionError(roomId: string, error: AppError): void {
    const subscriptionState = this.subscriptionStates.get(roomId);
    if (subscriptionState) {
      subscriptionState.retryCount++;
    }

    // Log error for monitoring
    // Handle based on error type
    if (error.retryable && this.shouldRetryConnection(roomId)) {
      this.scheduleRetry(roomId, error);
    } else {
      console.error(`[RealtimeChat] Non-retryable error or max retries exceeded for ${roomId}`);
      this.handlePermanentFailure(roomId, error);
    }
  }

  /**
   * Handle subscription timeout with enhanced recovery
   */
  private handleSubscriptionTimeout(roomId: string): void {
    const timeoutError = new AppError("Subscription timeout", ErrorType.NETWORK, "SUBSCRIPTION_TIMEOUT", 408, true);
    this.handleSubscriptionError(roomId, timeoutError);
  }

  /**
   * Handle channel closed event
   */
  private handleChannelClosed(roomId: string): void {
    const subscriptionState = this.subscriptionStates.get(roomId);
    if (subscriptionState) {
      subscriptionState.status = "CLOSED";
      subscriptionState.lastStateChange = Date.now();
    }

    // Stop health monitoring
    this.stopHealthMonitoring(roomId);

    // Attempt reconnection if appropriate
    if (this.shouldRetryConnection(roomId)) {
      const closedError = new AppError("Channel closed unexpectedly", ErrorType.NETWORK, "CHANNEL_CLOSED", 503, true);
      this.scheduleRetry(roomId, closedError);
    }
  }

  /**
   * Determine if connection should be retried
   */
  private shouldRetryConnection(roomId: string): boolean {
    const attempts = this.retryAttempts.get(roomId) || 0;
    const subscriptionState = this.subscriptionStates.get(roomId);

    // Don't retry if max attempts reached
    if (attempts >= this.maxRetries) {
      return false;
    }

    // Don't retry if quota is exceeded
    if (this.quotaMonitoring.messageCount > this.quotaMonitoring.criticalThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(roomId: string, error: AppError): void {
    const attempts = this.retryAttempts.get(roomId) || 0;
    this.retryAttempts.set(roomId, attempts + 1);

    const delay = Math.min(Math.pow(2, attempts) * 1000, 30000); // Cap at 30 seconds

    const timeout = setTimeout(() => {
      this.attemptReconnection(roomId);
    }, delay);

    this.reconnectTimeouts.set(roomId, timeout);
  }

  /**
   * Handle permanent failure
   */
  private handlePermanentFailure(roomId: string, error: AppError): void {
    console.error(`[RealtimeChat] Permanent failure for ${roomId}:`, error);

    // Update subscription state
    const subscriptionState = this.subscriptionStates.get(roomId);
    if (subscriptionState) {
      subscriptionState.status = "CHANNEL_ERROR";
      subscriptionState.lastStateChange = Date.now();
    }

    // Cleanup resources
    this.stopHealthMonitoring(roomId);
    this.retryAttempts.delete(roomId);

    // Notify callback about permanent failure
    const callback = this.messageCallbacks.get(roomId);
    if (callback) {
      callback({ type: "error", items: [], error });
    }
  }

  /**
   * Legacy error handler for backward compatibility
   */
  private handleChannelError(roomId: string, error: any): void {
    const classifiedError = classifyError(error);
    this.handleSubscriptionError(roomId, classifiedError);
  }

  private handleChannelTimeout(roomId: string): void {
    this.handleSubscriptionTimeout(roomId);
  }

  /**
   * Attempt reconnection with enhanced state management
   */
  private async attemptReconnection(roomId: string): Promise<void> {
    try {
      const channel = this.channels.get(roomId);
      if (channel) {
        await channel.unsubscribe();
        this.channels.delete(roomId);
      }

      // Reset subscription state
      const subscriptionState = this.subscriptionStates.get(roomId);
      if (subscriptionState) {
        subscriptionState.status = "CONNECTING";
        subscriptionState.lastStateChange = Date.now();
      }

      // Reconnection logic would trigger new joinRoom call from the UI layer
      // This just cleans up the old connection state
    } catch (error) {
      const classifiedError = classifyError(error);
      this.handleSubscriptionError(roomId, classifiedError);
    }
  }

  /**
   * Legacy reconnection method for backward compatibility
   */
  private async reconnectToRoom(roomId: string): Promise<void> {
    await this.attemptReconnection(roomId);
  }

  private retryFailedConnections(): void {
    // Retry any failed connections when the main connection is restored
    this.retryAttempts.forEach((attempts, roomId) => {
      if (attempts > 0) {
        this.reconnectToRoom(roomId);
      }
    });
  }

  private scheduleReconnection(): void {
    // Schedule a global reconnection attempt
    setTimeout(() => {
      if (this.connectionStatus === "disconnected") {
        this.initialize();
      }
    }, 5000);
  }

  // Leave room and cleanup
  async leaveRoom(roomId: string): Promise<void> {
    try {
      const channel = this.channels.get(roomId);
      if (channel) {
        await channel.unsubscribe();
        this.channels.delete(roomId);
      }

      // Cleanup callbacks and enhanced caches
      this.messageCallbacks.delete(roomId);
      this.presenceCallbacks.delete(roomId);
      this.typingCallbacks.delete(roomId);
      this.messageCache.delete(roomId);
      this.optimisticMessages.delete(roomId);
      this.messageFingerprints.delete(roomId);
      this.batchedUpdates.delete(roomId);
      this.subscriptionFilters.delete(roomId);
      this.subscriptionStates.delete(roomId);

      // Stop health monitoring
      this.stopHealthMonitoring(roomId);

      // Clear timeouts
      const updateTimeout = this.updateTimeouts.get(roomId);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
        this.updateTimeouts.delete(roomId);
      }

      const reconnectTimeout = this.reconnectTimeouts.get(roomId);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        this.reconnectTimeouts.delete(roomId);
      }
    } catch (error) {
      console.error(`[RealtimeChat] Error leaving room ${roomId}:`, error);
    }
  }

  // Pause all subscriptions (for background)
  async pauseAll(): Promise<void> {
    const roomIds = Array.from(this.channels.keys());

    for (const roomId of roomIds) {
      try {
        // Stop typing for all rooms
        // this.stopTyping(roomId); // TODO: Implement stopTyping method if needed

        // Unsubscribe channel but keep it in the map for resuming
        const channel = this.channels.get(roomId);
        if (channel) {
          await channel.unsubscribe();
        }
      } catch (error) {
        console.error(`[RealtimeChat] Error pausing room ${roomId}:`, error);
      }
    }
  }

  // Resume all subscriptions (for foreground)
  async resumeAll(userId: string, userName: string): Promise<void> {
    const roomIds = Array.from(this.channels.keys());

    for (const roomId of roomIds) {
      try {
        const channel = this.channels.get(roomId);
        if (channel) {
          // Re-subscribe to the channel
          await channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              // Track presence again
              channel.track({
                user_id: userId,
                user_name: userName,
                online_at: new Date().toISOString(),
                status: "online",
              });
            }
          });
        }
      } catch (error) {
        console.error(`[RealtimeChat] Error resuming room ${roomId}:`, error);
      }
    }
  }

  // Cleanup all connections
  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const [, channel] of this.channels) {
        await channel.unsubscribe();
      }

      // Clear all data structures
      this.channels.clear();
      this.messageCallbacks.clear();
      this.presenceCallbacks.clear();
      this.typingCallbacks.clear();
      this.messageCache.clear();
      this.optimisticMessages.clear();
      this.messageFingerprints.clear();
      this.batchedUpdates.clear();
      this.retryAttempts.clear();

      // Clear all timeouts
      this.updateTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.updateTimeouts.clear();

      this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.reconnectTimeouts.clear();

      this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.typingTimeouts.clear();

      this.typingDebounceTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.typingDebounceTimeouts.clear();

      // Clear health monitoring intervals
      this.healthCheckIntervals.forEach((interval) => clearInterval(interval));
      this.healthCheckIntervals.clear();

      // Clear enhanced data structures
      this.subscriptionFilters.clear();
      this.subscriptionStates.clear();

      this.connectionStatus = "disconnected";
    } catch (error) {
      console.error("[RealtimeChat] Error during cleanup:", error);
    }
  }

  // Utility method to format messages
  private formatMessage(rawMessage: any): ChatMessage {
    // Aggregate reactions from raw format to { emoji, count, users }[]
    const aggregatedReactions = this.aggregateReactions(rawMessage.reactions || []);

    return {
      id: rawMessage.id,
      chatRoomId: rawMessage.chat_room_id,
      senderId: rawMessage.sender_id,
      senderName: rawMessage.sender_name || "Anonymous",
      senderAvatar: rawMessage.sender_avatar,
      content: rawMessage.content,
      messageType: rawMessage.message_type || "text",
      timestamp: new Date(rawMessage.timestamp),
      isRead: rawMessage.is_read || false,
      replyTo: rawMessage.reply_to,
      reactions: aggregatedReactions,
      audioUri: rawMessage.audio_uri,
      audioDuration: rawMessage.audio_duration,
    };
  }

  // Aggregate raw reactions into the expected format
  private aggregateReactions(rawReactions: any[]): { emoji: string; count: number; users: string[] }[] {
    if (!rawReactions || !Array.isArray(rawReactions)) return [];

    const reactionMap = new Map<string, Set<string>>();

    // Group reactions by emoji
    rawReactions.forEach((reaction) => {
      const emoji = reaction.emoji || reaction;
      const userId = reaction.user_id || reaction.userId || "unknown";

      if (!reactionMap.has(emoji)) {
        reactionMap.set(emoji, new Set());
      }
      reactionMap.get(emoji)!.add(userId);
    });

    // Convert to aggregated format
    return Array.from(reactionMap.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.size,
      users: Array.from(users),
    }));
  }

  // Generate unique fingerprint for message deduplication
  private generateMessageFingerprint(message: ChatMessage): string {
    const timestamp =
      message.timestamp instanceof Date ? message.timestamp.getTime() : new Date(message.timestamp).getTime();
    return `${message.senderId}_${message.content}_${message.messageType}_${Math.floor(timestamp / 1000)}`;
  }

  // Replace optimistic message with real message
  private replaceOptimisticMessage(roomId: string, tempId: string, realMessage: ChatMessage): void {
    const optimisticMessages = this.optimisticMessages.get(roomId);
    if (optimisticMessages) {
      optimisticMessages.delete(tempId);
    }

    // Notify callback about the replacement with proper event type
    const callback = this.messageCallbacks.get(roomId);
    if (callback) {
      callback({ type: "replace", items: [realMessage], tempId });
    }
  }

  // Cleanup old messages to manage memory
  private cleanupOldMessages(roomId: string): void {
    const cache = this.messageCache.get(roomId);
    if (!cache || cache.size <= this.maxCacheSize) return;

    // Sort by timestamp and keep only recent messages
    const entries = Array.from(cache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, this.maxCacheSize);

    const newCache = new Map(entries);
    this.messageCache.set(roomId, newCache);

    // Cleanup fingerprints for removed messages
    const fingerprints = this.messageFingerprints.get(roomId);
    if (fingerprints) {
      const validFingerprints = new Set(entries.map(([, entry]) => entry.fingerprint));
      this.messageFingerprints.set(roomId, validFingerprints);
    }
  }

  // Throttle typing updates to prevent UI thrashing
  private throttleTypingUpdate(roomId: string, callback: () => void): void {
    const throttleKey = `${roomId}_typing_throttle`;
    const now = Date.now();
    const lastUpdate = (this as any)[throttleKey] || 0;

    if (now - lastUpdate > 100) {
      // Throttle to max 10 updates per second
      callback();
      (this as any)[throttleKey] = now;
    }
  }

  // Track optimistic message for future replacement
  trackOptimisticMessage(roomId: string, optimisticMessage: ChatMessage): void {
    const optimisticMessages = this.optimisticMessages.get(roomId) || new Map();
    optimisticMessages.set(optimisticMessage.id, optimisticMessage);
    this.optimisticMessages.set(roomId, optimisticMessages);

    // Add to cache as optimistic
    const cache = this.messageCache.get(roomId) || new Map();
    const fingerprint = this.generateMessageFingerprint(optimisticMessage);
    cache.set(optimisticMessage.id, {
      message: optimisticMessage,
      timestamp: Date.now(),
      isOptimistic: true,
      fingerprint,
      state: "optimistic",
    });
    this.messageCache.set(roomId, cache);
  }

  // Get connection status
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  /**
   * Health monitoring methods
   */
  private startHealthMonitoring(roomId: string, channel: RealtimeChannel): void {
    const healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await checkConnectionHealth(channel);
        const subscriptionState = this.subscriptionStates.get(roomId);

        if (subscriptionState) {
          subscriptionState.lastStateChange = Date.now();
        }

        if (!isHealthy) {
          if (subscriptionState) {
            subscriptionState.status = "CHANNEL_ERROR";
            subscriptionState.lastStateChange = Date.now();
          }

          // Attempt recovery
          this.handleSubscriptionError(
            roomId,
            new AppError("Health check failed", ErrorType.NETWORK, "HEALTH_CHECK_FAILED", 503, true),
          );
        }
      } catch (error) {
        console.error(`[RealtimeChat] Health check error for ${roomId}:`, error);
      }
    }, 60000); // Check every minute

    this.healthCheckIntervals.set(roomId, healthCheckInterval);
  }

  private stopHealthMonitoring(roomId: string): void {
    const interval = this.healthCheckIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(roomId);
    }
  }

  /**
   * Subscription state validation methods
   */
  private isValidStateTransition(roomId: string, newStatus: string): boolean {
    const subscriptionState = this.subscriptionStates.get(roomId);
    if (!subscriptionState) return true; // First state is always valid

    const currentStatus = subscriptionState.status;

    // Allow same-state transitions to handle reconnections and multiple subscription attempts
    if (currentStatus === newStatus) {
      return true;
    }

    const validTransitions = {
      CONNECTING: ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"],
      SUBSCRIBED: ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED", "CONNECTING"], // Allow reconnection
      CHANNEL_ERROR: ["CONNECTING", "SUBSCRIBED", "CLOSED"],
      TIMED_OUT: ["CONNECTING", "SUBSCRIBED", "CLOSED"],
      CLOSED: ["CONNECTING", "SUBSCRIBED"], // Allow direct resubscription
    };

    const isValid = validTransitions[currentStatus]?.includes(newStatus) || false;

    if (!isValid) {
    }

    return isValid;
  }

  // Priority system removed - all messages are processed equally

  /**
   * Enhanced subscription filtering
   */
  setSubscriptionFilters(roomId: string, events: string[]): void {
    this.subscriptionFilters.set(roomId, new Set(events));
  }

  private shouldProcessEvent(roomId: string, eventType: string): boolean {
    const filters = this.subscriptionFilters.get(roomId);
    if (!filters || filters.size === 0) return true;
    return filters.has(eventType);
  }

  /**
   * Enhanced analytics and monitoring
   */
  getSubscriptionAnalytics() {
    const analytics = {
      totalSubscriptions: this.channels.size,
      activeSubscriptions: 0,
      subscriptionsByStatus: {} as Record<string, number>,
      quotaUsage: {
        current: this.quotaMonitoring.messageCount,
        percentage: (this.quotaMonitoring.messageCount / 2000000) * 100,
        warningThreshold: this.quotaMonitoring.warningThreshold,
        criticalThreshold: this.quotaMonitoring.criticalThreshold,
      },
      averageHealthCheckCount: 0,
      totalRetryCount: 0,
      performanceMetrics: {
        averageBatchSize: 0,
        batchWindow: this.batchWindowMs,
      },
    };

    let totalHealthChecks = 0;
    let totalRetries = 0;

    // Analyze subscription states
    for (const [roomId, state] of this.subscriptionStates.entries()) {
      if (state.status === "SUBSCRIBED") {
        analytics.activeSubscriptions++;
      }

      analytics.subscriptionsByStatus[state.status] = (analytics.subscriptionsByStatus[state.status] || 0) + 1;

      totalRetries += state.retryCount;
    }

    // Calculate averages
    analytics.totalRetryCount = totalRetries;

    // Calculate average batch sizes
    let totalBatchSize = 0;
    let batchCount = 0;
    for (const batch of this.batchedUpdates.values()) {
      if (batch.length > 0) {
        totalBatchSize += batch.length;
        batchCount++;
      }
    }
    if (batchCount > 0) {
      analytics.performanceMetrics.averageBatchSize = totalBatchSize / batchCount;
    }

    return analytics;
  }

  /**
   * Enhanced connection status methods
   */
  getDetailedConnectionStatus() {
    return {
      globalStatus: this.connectionStatus,
      subscriptions: Array.from(this.subscriptionStates.entries()).map(([roomId, state]) => ({
        roomId,
        status: state.status,
        lastStateChange: state.lastStateChange,
        retryCount: state.retryCount,
        uptime: Date.now() - state.lastStateChange,
      })),
      quotaStatus: {
        current: this.quotaMonitoring.messageCount,
        limit: 2000000,
        percentage: (this.quotaMonitoring.messageCount / 2000000) * 100,
        warningReached: this.quotaMonitoring.messageCount > this.quotaMonitoring.warningThreshold,
        criticalReached: this.quotaMonitoring.messageCount > this.quotaMonitoring.criticalThreshold,
      },
    };
  }

  // Get active channels count
  getActiveChannelsCount(): number {
    return this.channels.size;
  }

  // Get active subscriptions count
  getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptionStates.values()).filter((state) => state.status === "SUBSCRIBED").length;
  }

  // Get active room IDs
  getActiveRoomIds(): string[] {
    return Array.from(this.channels.keys());
  }

  // Set subscription priority for message processing (deprecated - priority system removed)
  setSubscriptionPriority(roomId: string, priority: "high" | "normal" | "low"): void {}

  /**
   * Detect the transport method being used by Supabase realtime
   */
  private detectTransportMethod(): string {
    try {
      // Check if Supabase realtime client has transport info
      const realtimeClient = (supabase as any).realtime;
      if (realtimeClient?._transport) {
        return realtimeClient._transport;
      }
      if (realtimeClient?.transport) {
        return realtimeClient.transport;
      }

      // Check if Web Workers are available (shouldn't be in React Native)
      if (typeof Worker !== "undefined") {
        return "web-workers-detected";
      }

      // Check if WebSocket is available
      if (typeof WebSocket !== "undefined") {
        return "websocket-available";
      }

      return "unknown";
    } catch (error) {
      return "detection-failed";
    }
  }

  /**
   * Check if an error is related to Web Workers incompatibility
   */
  private isWebWorkersError(error: any): boolean {
    if (!error) return false;

    const errorString = JSON.stringify(error).toLowerCase();
    const errorMessage = error?.message?.toLowerCase() || "";
    const errorStack = error?.stack?.toLowerCase() || "";

    // Common Web Workers error patterns
    const webWorkerPatterns = [
      "worker",
      "postmessage",
      "importscripts",
      "shared worker",
      "service worker",
      "message channel",
      "message port",
    ];

    return webWorkerPatterns.some(
      (pattern) => errorString.includes(pattern) || errorMessage.includes(pattern) || errorStack.includes(pattern),
    );
  }

  /**
   * Handle Web Workers failure by attempting fallback connection
   */
  private async handleWebWorkersFailure(roomId: string, userId: string, userName: string): Promise<void> {
    try {
      // Clean up existing channel
      await this.leaveRoom(roomId);

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retry with explicit WebSocket configuration
      // Create a new channel with WebSocket-only configuration
      const fallbackChannel = supabase.channel(`fallback_room_${roomId}_${Date.now()}`, {
        config: {
          presence: { key: `user_${userId}` },
          broadcast: { self: false },
        },
      } as any);

      // Add all the same event listeners
      fallbackChannel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleNewMessage(roomId, payload),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleMessageUpdate(roomId, payload),
        )
        .on("presence", { event: "sync" }, () => {
          this.handlePresenceSync(roomId, fallbackChannel);
        })
        .on("broadcast", { event: "typing" }, (payload) => {
          this.handleTypingBroadcast(roomId, payload);
        });

      // Subscribe with error handling
      await fallbackChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.channels.set(roomId, fallbackChannel);

          // Track presence
          fallbackChannel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
            status: "online",
          });
        }
      });
    } catch (fallbackError) {
      console.error("🚨 Fallback connection also failed:", fallbackError);
      throw new AppError("Unable to establish realtime connection", ErrorType.NETWORK, "FALLBACK_FAILED");
    }
  }
}

// Export singleton instance
export const enhancedRealtimeChatService = new EnhancedRealtimeChatService();
export default enhancedRealtimeChatService;
