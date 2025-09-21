/**
 * Consolidated Real-time Chat Service
 * Single source of truth for all real-time chat functionality
 * Replaces multiple overlapping services with one reliable implementation
 */

import { supabase } from "../config/supabase";
import { ChatMessage, ChatMember, MessageEvent, TypingUser } from "../types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { AppError, ErrorType } from "../utils/errorHandling";
import { MessageDeduplicator } from "../utils/messageDeduplication";

interface SubscriptionCallbacks {
  onMessage: (event: MessageEvent) => void;
  onPresence?: (members: ChatMember[]) => void;
  onTyping?: (typingUsers: TypingUser[]) => void;
  onError?: (error: AppError) => void;
}

interface RoomSubscription {
  channel: RealtimeChannel;
  callbacks: SubscriptionCallbacks;
  isActive: boolean;
  lastActivity: number;
}

class ConsolidatedRealtimeService {
  private subscriptions: Map<string, RoomSubscription> = new Map();
  private messageCache: Map<string, ChatMessage[]> = new Map();
  private optimisticMessages: Map<string, ChatMessage> = new Map();
  private deduplicators: Map<string, MessageDeduplicator> = new Map();
  private typingUsers: Map<string, Map<string, TypingUser>> = new Map(); // roomId -> userId -> TypingUser
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // roomId_userId -> timeout
  private typingDebounceTimeouts: Map<string, NodeJS.Timeout> = new Map(); // roomId_userId -> timeout
  private connectionStatus: "connected" | "connecting" | "disconnected" | "error" = "disconnected";
  private connectionError: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000; // Start with 1 second
  private isInitialized = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private connectionCallbacks: ((status: string, error?: string) => void)[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initializing Consolidated Real-time Service");
    this.updateConnectionStatus("connecting");

    try {
      // Verify authentication with detailed logging
      console.log("🔐 Checking authentication status...");
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("❌ Authentication error:", error);
        throw new AppError(`Authentication error: ${error.message}`, ErrorType.AUTH);
      }

      if (!user) {
        console.error("❌ No authenticated user found");
        throw new AppError("No authenticated user found - please sign in", ErrorType.AUTH);
      }

      console.log(`✅ Authentication verified for user: ${user.id.slice(-8)}`);

      // Check if Supabase realtime is available
      if (!supabase.realtime) {
        console.error("❌ Supabase realtime not available");
        throw new AppError("Real-time service not available", ErrorType.NETWORK);
      }

      // Log realtime configuration for debugging
      console.log("📡 Supabase realtime configuration:", {
        isConnected: supabase.realtime.isConnected(),
        channels: supabase.realtime.channels?.length || 0,
        accessToken: !!supabase.realtime.accessToken,
      });

      // Check realtime connection status (but don't fail if not connected yet)
      const isRealtimeConnected = supabase.realtime.isConnected();
      console.log(`📡 Supabase realtime connection status: ${isRealtimeConnected ? "connected" : "disconnected"}`);

      if (!isRealtimeConnected) {
        console.log("📡 Realtime will connect automatically when needed");
      }

      this.updateConnectionStatus("connected");
      this.isInitialized = true;
      this.reconnectAttempts = 0; // Reset on successful connection
      this.startHeartbeat();
      console.log("✅ Consolidated Real-time Service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize real-time service:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize";
      this.updateConnectionStatus("error", errorMessage);
      throw error;
    }
  }

  private updateConnectionStatus(status: "connected" | "connecting" | "disconnected" | "error", error?: string): void {
    const previousStatus = this.connectionStatus;
    this.connectionStatus = status;
    this.connectionError = error || null;

    if (previousStatus !== status) {
      console.log(`🔄 Connection status changed: ${previousStatus} → ${status}${error ? ` (${error})` : ""}`);

      // Notify all registered callbacks
      this.connectionCallbacks.forEach((callback) => {
        try {
          callback(status, error);
        } catch (e) {
          console.warn("Error in connection status callback:", e);
        }
      });
    }
  }

  // Subscribe to connection status changes
  onConnectionStatusChange(callback: (status: string, error?: string) => void): () => void {
    this.connectionCallbacks.push(callback);

    // Immediately call with current status
    callback(this.connectionStatus, this.connectionError || undefined);

    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      this.lastHeartbeat = Date.now();

      // Check overall connection health
      await this.performConnectionHealthCheck();

      // Check if any subscriptions are stale
      for (const [roomId, subscription] of this.subscriptions.entries()) {
        const timeSinceActivity = Date.now() - subscription.lastActivity;
        if (timeSinceActivity > 60000) {
          // 1 minute without activity
          console.warn(`⚠️ Room ${roomId} subscription appears stale, checking health`);
          this.checkSubscriptionHealth(roomId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async performConnectionHealthCheck(): Promise<void> {
    try {
      // Check if Supabase realtime is still connected
      if (supabase.realtime && !supabase.realtime.isConnected()) {
        console.warn("🚨 Supabase realtime connection lost");
        this.updateConnectionStatus("error", "Realtime connection lost");
        await this.attemptReconnection();
        return;
      }

      // Check authentication status
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.warn("🚨 Authentication lost during health check");
        this.updateConnectionStatus("error", "Authentication lost");
        await this.attemptReconnection();
        return;
      }

      // Check if we have active subscriptions but connection status is error
      if (this.connectionStatus === "error" && this.subscriptions.size > 0) {
        console.log("🔄 Attempting to recover from error state");
        await this.attemptReconnection();
      }
    } catch (error) {
      console.warn("⚠️ Health check failed:", error);
      this.updateConnectionStatus("error", "Health check failed");
      await this.attemptReconnection();
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached");
      this.updateConnectionStatus("error", "Connection lost. Please check your internet connection.");
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.updateConnectionStatus(
      "connecting",
      `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Re-initialize the service
        this.isInitialized = false;
        await this.initialize();

        // Rejoin all active rooms
        const roomIds = Array.from(this.subscriptions.keys());
        for (const roomId of roomIds) {
          await this.rejoinRoom(roomId);
        }

        console.log("✅ Reconnection successful");
        this.reconnectAttempts = 0; // Reset on success
      } catch (error) {
        console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        // Will try again on next heartbeat if not at max attempts
      }
    }, delay);
  }

  private async checkSubscriptionHealth(roomId: string): Promise<void> {
    const subscription = this.subscriptions.get(roomId);
    if (!subscription) return;

    try {
      // Try to send a presence update to test the connection
      await subscription.channel.track({
        userId: "health_check",
        online_at: new Date().toISOString(),
      });
      subscription.lastActivity = Date.now();
    } catch (error) {
      console.error(`❌ Health check failed for room ${roomId}:`, error);
      // Attempt to rejoin the room
      await this.rejoinRoom(roomId);
    }
  }

  async joinRoom(roomId: string, userId: string, userName: string, callbacks: SubscriptionCallbacks): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Clean up existing subscription if any
    if (this.subscriptions.has(roomId)) {
      await this.leaveRoom(roomId);
    }

    console.log(`🚪 Joining room ${roomId} as ${userName}`);

    // Retry logic for subscription failures
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Join attempt ${attempt}/${maxRetries} for room ${roomId}`);
        await this.attemptJoinRoom(roomId, userId, userName, callbacks);
        console.log(`✅ Successfully joined room ${roomId} on attempt ${attempt}`);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Join attempt ${attempt}/${maxRetries} failed for room ${roomId}:`, error);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error(`❌ Failed to join room ${roomId} after ${maxRetries} attempts`);
    const appError =
      lastError instanceof AppError
        ? lastError
        : new AppError("Failed to join room after multiple attempts", ErrorType.NETWORK);
    callbacks.onError?.(appError);
    throw appError;
  }

  private async attemptJoinRoom(
    roomId: string,
    userId: string,
    userName: string,
    callbacks: SubscriptionCallbacks,
  ): Promise<void> {
    try {
      // Check if realtime is available (but don't fail if not connected yet)
      if (supabase.realtime && !supabase.realtime.isConnected()) {
        console.log("📡 Realtime not connected, will attempt to connect during subscription...");
        // Don't throw error here - let the subscription attempt handle the connection
      }

      // Initialize deduplicator for this room
      if (!this.deduplicators.has(roomId)) {
        this.deduplicators.set(
          roomId,
          new MessageDeduplicator({
            maxCacheSize: 500,
            ttl: 1800000, // 30 minutes
          }),
        );
      }

      // Create single channel for all room functionality
      const channel = supabase
        .channel(`room_${roomId}`, {
          config: {
            presence: { key: `user_${userId}` },
            broadcast: { self: false },
          },
        })
        // Listen to new messages
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleNewMessage(roomId, payload, callbacks),
        )
        // Listen to message updates
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleMessageUpdate(roomId, payload, callbacks),
        )
        // Listen to presence changes
        .on("presence", { event: "sync" }, () => {
          this.handlePresenceSync(roomId, channel, callbacks);
        })
        // Listen to typing indicators
        .on("broadcast", { event: "typing" }, (payload) => {
          this.handleTypingBroadcast(roomId, payload, callbacks);
        });

      // Subscribe to the channel with enhanced status tracking and longer timeout
      const subscriptionResult = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error(`⏰ Subscription timeout for room ${roomId} after 30 seconds`);
          reject(
            new AppError("Connection is taking too long. Please check your internet and try again.", ErrorType.NETWORK),
          );
        }, 30000); // Increased to 30 second timeout

        const handleSubscriptionStatus = (status: string) => {
          console.log(`📡 Room ${roomId} subscription status: ${status}`);

          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);

            // Track presence
            try {
              channel.track({
                userId,
                userName,
                online_at: new Date().toISOString(),
              });
            } catch (presenceError) {
              console.warn(`⚠️ Failed to track presence for room ${roomId}:`, presenceError);
              // Don't fail the subscription for presence errors
            }

            // Update subscription activity
            const subscription = this.subscriptions.get(roomId);
            if (subscription) {
              subscription.lastActivity = Date.now();
            }

            resolve(status);
          } else if (status === "CHANNEL_ERROR") {
            clearTimeout(timeout);
            console.error(`❌ Channel error for room ${roomId}`);
            this.updateConnectionStatus("error", `Room ${roomId} subscription failed`);
            reject(new AppError("Unable to connect to chat room. Please try again.", ErrorType.NETWORK));
          } else if (status === "TIMED_OUT") {
            clearTimeout(timeout);
            console.error(`⏰ Subscription timeout for room ${roomId}`);
            this.updateConnectionStatus("error", `Room ${roomId} subscription timed out`);
            reject(
              new AppError(
                "Connection is taking too long. Please check your internet and try again.",
                ErrorType.NETWORK,
              ),
            );
          } else if (status === "CLOSED") {
            clearTimeout(timeout);
            console.error(`🚪 Channel closed for room ${roomId}`);
            reject(new AppError("Connection was closed. Please try again.", ErrorType.NETWORK));
          }
        };

        try {
          // Attempt subscription
          channel.subscribe(handleSubscriptionStatus);
        } catch (subscribeError) {
          clearTimeout(timeout);
          console.error(`❌ Failed to initiate subscription for room ${roomId}:`, subscribeError);
          reject(new AppError("Failed to initiate subscription", ErrorType.NETWORK));
        }
      });

      if (subscriptionResult !== "SUBSCRIBED") {
        throw new AppError("Failed to subscribe to room", ErrorType.NETWORK);
      }

      // Store subscription
      this.subscriptions.set(roomId, {
        channel,
        callbacks,
        isActive: true,
        lastActivity: Date.now(),
      });

      console.log(`✅ Successfully joined room ${roomId}`);
    } catch (error) {
      console.error(`❌ Failed to join room ${roomId}:`, error);
      const appError = error instanceof AppError ? error : new AppError("Failed to join room", ErrorType.NETWORK);
      callbacks.onError?.(appError);
      throw appError;
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    const subscription = this.subscriptions.get(roomId);
    if (!subscription) return;

    console.log(`🚪 Leaving room ${roomId}`);

    try {
      // Untrack presence
      await subscription.channel.untrack();

      // Unsubscribe from channel
      await subscription.channel.unsubscribe();

      // Clean up typing indicators for this room
      const roomTypingUsers = this.typingUsers.get(roomId);
      if (roomTypingUsers) {
        // Clear all typing timeouts for this room
        for (const userId of roomTypingUsers.keys()) {
          const timeoutKey = `${roomId}_${userId}_cleanup`;
          const existingTimeout = this.typingTimeouts.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.typingTimeouts.delete(timeoutKey);
          }

          // Clear debounce timeouts
          const debounceKey = `${roomId}_${userId}`;
          const debounceTimeout = this.typingDebounceTimeouts.get(debounceKey);
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            this.typingDebounceTimeouts.delete(debounceKey);
          }
        }
        this.typingUsers.delete(roomId);
      }

      // Clean up other room data
      this.subscriptions.delete(roomId);
      this.messageCache.delete(roomId);
      this.deduplicators.delete(roomId);

      console.log(`✅ Successfully left room ${roomId}`);
    } catch (error) {
      console.error(`❌ Failed to leave room ${roomId}:`, error);
    }
  }

  async loadInitialMessages(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    console.log(`📨 Loading initial messages for room ${roomId}`);

    try {
      const { data, error } = await supabase
        .from("chat_messages_firebase")
        .select("*")
        .eq("chat_room_id", roomId)
        .eq("is_deleted", false)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Convert to ChatMessage format and sort oldest to newest
      const messages: ChatMessage[] = (data || [])
        .map(this.mapDatabaseMessageToChatMessage)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Cache messages
      this.messageCache.set(roomId, messages);

      // Notify callback with initial messages
      const subscription = this.subscriptions.get(roomId);
      if (subscription) {
        subscription.callbacks.onMessage({
          type: "initial",
          items: messages,
        });
      }

      console.log(`📨 Loaded ${messages.length} initial messages for room ${roomId}`);
      return messages;
    } catch (error) {
      console.error(`❌ Failed to load messages for room ${roomId}:`, error);
      throw new AppError("Failed to load messages", ErrorType.NETWORK);
    }
  }

  async loadOlderMessages(
    roomId: string,
    beforeTimestamp: string,
    limit: number = 20,
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    console.log(`📨 Loading older messages for room ${roomId} before ${beforeTimestamp}`);

    try {
      const { data, error } = await supabase
        .from("chat_messages_firebase")
        .select("*")
        .eq("chat_room_id", roomId)
        .eq("is_deleted", false)
        .lt("timestamp", beforeTimestamp)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Convert to ChatMessage format and sort oldest to newest for prepending
      const messages: ChatMessage[] = (data || [])
        .map(this.mapDatabaseMessageToChatMessage)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Update cache by prepending older messages
      const cachedMessages = this.messageCache.get(roomId) || [];
      const updatedMessages = [...messages, ...cachedMessages];
      this.messageCache.set(roomId, updatedMessages);

      // Notify callback with older messages
      const subscription = this.subscriptions.get(roomId);
      if (subscription && messages.length > 0) {
        subscription.callbacks.onMessage({
          type: "replace", // Use replace to update the entire message list
          items: updatedMessages,
        });
      }

      const hasMore = messages.length === limit;
      console.log(`📨 Loaded ${messages.length} older messages for room ${roomId}, hasMore: ${hasMore}`);

      return { messages, hasMore };
    } catch (error) {
      console.error(`❌ Failed to load older messages for room ${roomId}:`, error);
      console.error("Error details:", {
        roomId,
        beforeTimestamp,
        limit,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
      });
      throw new AppError("Failed to load older messages", ErrorType.NETWORK);
    }
  }

  async sendMessage(
    roomId: string,
    content: string,
    senderId: string,
    senderName: string,
    messageType: string = "text",
    replyTo?: string,
  ): Promise<void> {
    console.log(`📤 Sending message to room ${roomId}`);

    // Create optimistic message
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chatRoomId: roomId,
      senderId,
      senderName,
      content,
      timestamp: new Date(),
      isRead: false,
      reactions: [],
      isOptimistic: true,
      messageType: messageType as any,
      replyTo,
    };

    // Store optimistic message
    const optimisticKey = `${roomId}_${tempId}`;
    this.optimisticMessages.set(optimisticKey, optimisticMessage);

    // Add to cache immediately for instant UI update
    const cachedMessages = this.messageCache.get(roomId) || [];
    const updatedMessages = [...cachedMessages, optimisticMessage];
    this.messageCache.set(roomId, updatedMessages);

    // Notify callback immediately
    const subscription = this.subscriptions.get(roomId);
    if (subscription) {
      subscription.callbacks.onMessage({
        type: "new",
        items: [optimisticMessage],
      });
    }

    try {
      const messageData = {
        chat_room_id: roomId,
        sender_id: senderId,
        sender_name: senderName,
        content,
        message_type: messageType,
        reply_to: replyTo,
        timestamp: new Date().toISOString(),
        is_read: false,
        status: "sent",
      };

      const { error } = await supabase.from("chat_messages_firebase").insert(messageData);

      if (error) throw error;

      console.log(`✅ Message sent successfully to room ${roomId}`);
    } catch (error) {
      console.error(`❌ Failed to send message:`, error);

      // Remove failed optimistic message
      this.optimisticMessages.delete(optimisticKey);
      const currentMessages = this.messageCache.get(roomId) || [];
      const filteredMessages = currentMessages.filter((m) => m.id !== tempId);
      this.messageCache.set(roomId, filteredMessages);

      // Notify about removal
      if (subscription) {
        subscription.callbacks.onMessage({
          type: "delete",
          items: [optimisticMessage],
        });
      }

      throw new AppError("Failed to send message", ErrorType.NETWORK);
    }
  }

  sendTypingIndicator(roomId: string, userId: string, userName: string, isTyping: boolean): void {
    const subscription = this.subscriptions.get(roomId);
    if (!subscription) return;

    const debounceKey = `${roomId}_${userId}`;
    const existingTimeout = this.typingDebounceTimeouts.get(debounceKey);

    // Clear existing debounce timeout
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingDebounceTimeouts.delete(debounceKey);
    }

    if (isTyping) {
      // Debounce typing start events to prevent spam
      const timeout = setTimeout(() => {
        subscription.channel.send({
          type: "broadcast",
          event: "typing",
          payload: { userId, userName, isTyping: true, timestamp: Date.now() },
        });

        // Auto-clear typing indicator after 3 seconds
        const typingTimeoutKey = `${roomId}_${userId}`;
        const existingTypingTimeout = this.typingTimeouts.get(typingTimeoutKey);
        if (existingTypingTimeout) {
          clearTimeout(existingTypingTimeout);
        }

        const typingTimeout = setTimeout(() => {
          this.sendTypingIndicator(roomId, userId, userName, false);
        }, 3000);
        this.typingTimeouts.set(typingTimeoutKey, typingTimeout);

        this.typingDebounceTimeouts.delete(debounceKey);
      }, 300); // 300ms debounce for typing start

      this.typingDebounceTimeouts.set(debounceKey, timeout);
    } else {
      // Send stop typing immediately
      subscription.channel.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, userName, isTyping: false, timestamp: Date.now() },
      });

      // Clear any pending typing timeout
      const typingTimeoutKey = `${roomId}_${userId}`;
      const existingTypingTimeout = this.typingTimeouts.get(typingTimeoutKey);
      if (existingTypingTimeout) {
        clearTimeout(existingTypingTimeout);
        this.typingTimeouts.delete(typingTimeoutKey);
      }
    }
  }

  private handleNewMessage(roomId: string, payload: any, callbacks: SubscriptionCallbacks): void {
    try {
      const message = this.mapDatabaseMessageToChatMessage(payload.new);
      const deduplicator = this.deduplicators.get(roomId);

      // Check for duplicates
      if (deduplicator && deduplicator.isDuplicate(message)) {
        console.log(`🔄 Duplicate message ignored: ${message.id}`);
        return;
      }

      // Check if this replaces an optimistic message
      const optimisticKey = this.findOptimisticMessage(roomId, message);
      if (optimisticKey) {
        this.replaceOptimisticMessage(roomId, optimisticKey, message);
        return;
      }

      // Add to deduplicator
      if (deduplicator) {
        deduplicator.addMessage(message);
      }

      // Update cache
      const cachedMessages = this.messageCache.get(roomId) || [];
      const updatedMessages = [...cachedMessages, message];
      this.messageCache.set(roomId, updatedMessages);

      // Update subscription activity
      const subscription = this.subscriptions.get(roomId);
      if (subscription) {
        subscription.lastActivity = Date.now();
      }

      // Notify callback
      callbacks.onMessage({
        type: "new",
        items: [message],
      });
    } catch (error) {
      console.error("❌ Failed to handle new message:", error);
      callbacks.onError?.(new AppError("Failed to process new message", ErrorType.UNKNOWN));
    }
  }

  private handleMessageUpdate(roomId: string, payload: any, callbacks: SubscriptionCallbacks): void {
    try {
      const updatedMessage = this.mapDatabaseMessageToChatMessage(payload.new);
      const deduplicator = this.deduplicators.get(roomId);

      // Add to deduplicator if not already present
      if (deduplicator && !deduplicator.isDuplicate(updatedMessage)) {
        deduplicator.addMessage(updatedMessage);
      }

      // Update cache
      const cachedMessages = this.messageCache.get(roomId) || [];
      const messageIndex = cachedMessages.findIndex((m) => m.id === updatedMessage.id);
      if (messageIndex >= 0) {
        cachedMessages[messageIndex] = updatedMessage;
        this.messageCache.set(roomId, cachedMessages);
      }

      // Update subscription activity
      const subscription = this.subscriptions.get(roomId);
      if (subscription) {
        subscription.lastActivity = Date.now();
      }

      // Notify callback
      callbacks.onMessage({
        type: "update",
        items: [updatedMessage],
      });
    } catch (error) {
      console.error("❌ Failed to handle message update:", error);
    }
  }

  private handlePresenceSync(roomId: string, channel: RealtimeChannel, callbacks: SubscriptionCallbacks): void {
    const presenceState = channel.presenceState();
    const members: ChatMember[] = [];

    Object.values(presenceState).forEach((presence: any) => {
      presence.forEach((user: any) => {
        members.push({
          id: `${roomId}_${user.userId}`,
          chatRoomId: roomId,
          userId: user.userId,
          userName: user.userName,
          role: "member",
          joinedAt: user.online_at,
          isOnline: true,
          lastSeen: new Date(),
        });
      });
    });

    callbacks.onPresence?.(members);
  }

  private handleTypingBroadcast(roomId: string, payload: any, callbacks: SubscriptionCallbacks): void {
    const { userId, userName, isTyping, timestamp } = payload.payload;

    // Get or create typing users map for this room
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Map());
    }
    const roomTypingUsers = this.typingUsers.get(roomId)!;

    if (isTyping) {
      // Add user to typing list
      const typingUser: TypingUser = {
        userId,
        userName,
        chatRoomId: roomId,
        timestamp: new Date(timestamp),
      };
      roomTypingUsers.set(userId, typingUser);

      // Auto-remove typing indicator after 5 seconds (in case stop event is missed)
      const timeoutKey = `${roomId}_${userId}_cleanup`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const cleanupTimeout = setTimeout(() => {
        roomTypingUsers.delete(userId);
        this.typingTimeouts.delete(timeoutKey);

        // Notify with updated typing users list
        const currentTypingUsers = Array.from(roomTypingUsers.values());
        callbacks.onTyping?.(currentTypingUsers);
      }, 5000);
      this.typingTimeouts.set(timeoutKey, cleanupTimeout);
    } else {
      // Remove user from typing list
      roomTypingUsers.delete(userId);

      // Clear cleanup timeout
      const timeoutKey = `${roomId}_${userId}_cleanup`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }
    }

    // Notify with current typing users list
    const currentTypingUsers = Array.from(roomTypingUsers.values());
    callbacks.onTyping?.(currentTypingUsers);
  }

  private mapDatabaseMessageToChatMessage(dbMessage: any): ChatMessage {
    return {
      id: dbMessage.id,
      chatRoomId: dbMessage.chat_room_id,
      senderId: dbMessage.sender_id,
      senderName: dbMessage.sender_name,
      content: dbMessage.content || "",
      messageType: dbMessage.message_type || "text",
      timestamp: dbMessage.timestamp,
      isRead: dbMessage.is_read || false,
      status: dbMessage.status || "sent",
      replyTo: dbMessage.reply_to,
      reactions: dbMessage.reactions || [],
    };
  }

  private findOptimisticMessage(roomId: string, realMessage: ChatMessage): string | null {
    for (const [key, optimisticMessage] of this.optimisticMessages.entries()) {
      if (
        key.startsWith(`${roomId}_`) &&
        optimisticMessage.senderId === realMessage.senderId &&
        optimisticMessage.content === realMessage.content &&
        Math.abs(
          (optimisticMessage.timestamp instanceof Date
            ? optimisticMessage.timestamp.getTime()
            : new Date(optimisticMessage.timestamp).getTime()) -
            (realMessage.timestamp instanceof Date
              ? realMessage.timestamp.getTime()
              : new Date(realMessage.timestamp).getTime()),
        ) < 10000
      ) {
        return key;
      }
    }
    return null;
  }

  trackOptimisticMessage(roomId: string, optimisticMessage: ChatMessage): void {
    const optimisticKey = `${roomId}_${optimisticMessage.id}`;
    this.optimisticMessages.set(optimisticKey, optimisticMessage);

    // Add to cache as optimistic
    const cachedMessages = this.messageCache.get(roomId) || [];
    const existingIndex = cachedMessages.findIndex((m) => m.id === optimisticMessage.id);

    if (existingIndex === -1) {
      // Add if not already in cache
      cachedMessages.push(optimisticMessage);
      this.messageCache.set(roomId, cachedMessages);
    }
  }

  private replaceOptimisticMessage(roomId: string, optimisticKey: string, realMessage: ChatMessage): void {
    // Remove optimistic message
    this.optimisticMessages.delete(optimisticKey);

    // Update cache by replacing the optimistic message with the real one
    const cachedMessages = this.messageCache.get(roomId) || [];
    const tempId = optimisticKey.split("_")[1]; // Extract temp ID from key
    const messageIndex = cachedMessages.findIndex((m) => m.id === tempId);

    if (messageIndex >= 0) {
      cachedMessages[messageIndex] = realMessage;
      this.messageCache.set(roomId, cachedMessages);

      // Notify callback about the replacement
      const subscription = this.subscriptions.get(roomId);
      if (subscription) {
        subscription.callbacks.onMessage({
          type: "replace",
          items: [realMessage],
          tempId: tempId,
        });
      }
    }
  }

  private async rejoinRoom(roomId: string): Promise<void> {
    const subscription = this.subscriptions.get(roomId);
    if (!subscription) return;

    console.log(`🔄 Rejoining room ${roomId}`);

    try {
      // Store callback for rejoin
      const callbacks = subscription.callbacks;

      // Leave and rejoin
      await this.leaveRoom(roomId);

      // Get user info for rejoin
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Note: We need userId and userName, but they're not stored in subscription
        // This is a limitation - we should store them or get them from the callback
        console.warn("⚠️ Rejoin requires userId and userName - using fallback");
        await this.joinRoom(roomId, user.id, user.email || "Unknown", callbacks);
      }
    } catch (error) {
      console.error(`❌ Failed to rejoin room ${roomId}:`, error);
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up consolidated real-time service");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clear all typing timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    // Clear all typing debounce timeouts
    for (const timeout of this.typingDebounceTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingDebounceTimeouts.clear();

    const roomIds = Array.from(this.subscriptions.keys());
    await Promise.all(roomIds.map((roomId) => this.leaveRoom(roomId)));

    this.messageCache.clear();
    this.optimisticMessages.clear();
    this.deduplicators.clear();
    this.typingUsers.clear();
    this.connectionCallbacks.length = 0; // Clear callbacks
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.updateConnectionStatus("disconnected");
  }

  // Getters
  getConnectionStatus() {
    return this.connectionStatus;
  }

  getConnectionHealth(): {
    status: string;
    error: string | null;
    lastHeartbeat: number;
    activeRooms: number;
    totalMessages: number;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    isReconnecting: boolean;
    roomDetails: {
      roomId: string;
      lastActivity: number;
      timeSinceActivity: number;
    }[];
  } {
    const totalMessages = Array.from(this.messageCache.values()).reduce(
      (total, messages) => total + messages.length,
      0,
    );

    const roomDetails = Array.from(this.subscriptions.entries()).map(([roomId, subscription]) => ({
      roomId,
      lastActivity: subscription.lastActivity,
      timeSinceActivity: Date.now() - subscription.lastActivity,
    }));

    return {
      status: this.connectionStatus,
      error: this.connectionError,
      lastHeartbeat: this.lastHeartbeat,
      activeRooms: this.subscriptions.size,
      totalMessages,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isReconnecting: this.reconnectTimeout !== null,
      roomDetails,
    };
  }

  isRoomActive(roomId: string): boolean {
    return this.subscriptions.has(roomId) && this.subscriptions.get(roomId)!.isActive;
  }

  getCachedMessages(roomId: string): ChatMessage[] {
    return this.messageCache.get(roomId) || [];
  }

  getTypingUsers(roomId: string): TypingUser[] {
    const roomTypingUsers = this.typingUsers.get(roomId);
    return roomTypingUsers ? Array.from(roomTypingUsers.values()) : [];
  }

  // Force reconnection for a specific room
  async forceReconnectRoom(roomId: string): Promise<void> {
    const subscription = this.subscriptions.get(roomId);
    if (subscription) {
      console.log(`🔄 Force reconnecting room ${roomId}`);
      await this.rejoinRoom(roomId);
    }
  }

  // Force full reconnection (useful for manual retry)
  async forceReconnect(): Promise<void> {
    console.log("🔄 Force reconnecting all services");
    this.reconnectAttempts = 0; // Reset attempts for manual reconnection
    await this.attemptReconnection();
  }

  // Check if service is healthy
  isHealthy(): boolean {
    return this.connectionStatus === "connected" && this.isInitialized && Date.now() - this.lastHeartbeat < 60000; // Heartbeat within last minute
  }

  // Clear typing indicators for a specific user (useful when user leaves)
  clearUserTyping(roomId: string, userId: string): void {
    const roomTypingUsers = this.typingUsers.get(roomId);
    if (roomTypingUsers) {
      roomTypingUsers.delete(userId);

      // Clear any associated timeouts
      const timeoutKey = `${roomId}_${userId}_cleanup`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }

      // Notify callback with updated list
      const subscription = this.subscriptions.get(roomId);
      if (subscription) {
        const currentTypingUsers = Array.from(roomTypingUsers.values());
        subscription.callbacks.onTyping?.(currentTypingUsers);
      }
    }
  }

  // Stop typing for a specific room (used in app state management)
  stopTyping(roomId: string): void {
    const roomTypingUsers = this.typingUsers.get(roomId);
    if (roomTypingUsers) {
      // Clear all typing users for this room
      for (const userId of roomTypingUsers.keys()) {
        // Clear any associated timeouts
        const timeoutKey = `${roomId}_${userId}_cleanup`;
        const existingTimeout = this.typingTimeouts.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          this.typingTimeouts.delete(timeoutKey);
        }

        // Clear debounce timeouts
        const debounceKey = `${roomId}_${userId}`;
        const debounceTimeout = this.typingDebounceTimeouts.get(debounceKey);
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
          this.typingDebounceTimeouts.delete(debounceKey);
        }
      }

      // Clear the entire room's typing users
      roomTypingUsers.clear();

      // Notify callback with empty list
      const subscription = this.subscriptions.get(roomId);
      if (subscription) {
        subscription.callbacks.onTyping?.([]);
      }
    }
  }

  // Get active room IDs
  getActiveRoomIds(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // Pause all subscriptions (for background)
  private isPaused = false;
  private pausedRooms = new Set<string>();
  private pausedCallbacks = new Map<string, SubscriptionCallbacks>();

  async pauseAll(): Promise<void> {
    console.log("[ConsolidatedRealtimeService] Pausing all subscriptions");
    this.isPaused = true;

    // Store active room IDs and their callbacks
    for (const [roomId, subscription] of this.subscriptions.entries()) {
      this.pausedRooms.add(roomId);
      this.pausedCallbacks.set(roomId, subscription.callbacks);

      // Stop typing for all rooms
      this.stopTyping(roomId);

      // Unsubscribe the channel
      try {
        await subscription.channel.unsubscribe();
        console.log(`[ConsolidatedRealtimeService] Paused subscription for room ${roomId}`);
      } catch (error) {
        console.error(`[ConsolidatedRealtimeService] Error pausing room ${roomId}:`, error);
      }
    }

    // Clear subscriptions map (but keep pausedRooms for resuming)
    this.subscriptions.clear();
  }

  // Resume all subscriptions (for foreground)
  async resumeAll(userId: string, userName: string): Promise<void> {
    console.log("[ConsolidatedRealtimeService] Resuming all subscriptions");
    this.isPaused = false;

    // Re-join each paused room
    for (const roomId of this.pausedRooms) {
      try {
        const callbacks = this.pausedCallbacks.get(roomId);
        if (callbacks) {
          await this.joinRoom(roomId, userId, userName, callbacks);
          console.log(`[ConsolidatedRealtimeService] Resumed subscription for room ${roomId}`);
        }
      } catch (error) {
        console.error(`[ConsolidatedRealtimeService] Error resuming room ${roomId}:`, error);
      }
    }

    // Clear paused state
    this.pausedRooms.clear();
    this.pausedCallbacks.clear();
  }
}

// Export singleton instance
export const consolidatedRealtimeService = new ConsolidatedRealtimeService();
export default consolidatedRealtimeService;
