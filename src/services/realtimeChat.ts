// Enhanced Supabase Real-time Chat Service (2025) - Complete Rewrite
import { supabase } from "../config/supabase";
import { ChatMessage, ChatMember } from "../types";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { AppError, ErrorType } from "../utils/errorHandling";

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface MessageCallback {
  (messages: ChatMessage[], isInitialLoad?: boolean): void;
}

interface PresenceCallback {
  (members: ChatMember[]): void;
}

interface TypingCallback {
  (typingUsers: TypingUser[]): void;
}

class EnhancedRealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, MessageCallback> = new Map();
  private presenceCallbacks: Map<string, PresenceCallback> = new Map();
  private typingCallbacks: Map<string, TypingCallback> = new Map();

  // Connection management
  private connectionStatus: "connected" | "connecting" | "disconnected" = "disconnected";
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 5;
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Message deduplication
  private messageCache: Map<string, Set<string>> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Performance optimization
  private batchedUpdates: Map<string, ChatMessage[]> = new Map();
  private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async initialize() {
    console.log("🚀 Initializing Enhanced Supabase Real-time Chat Service");
    this.connectionStatus = "connecting";

    try {
      // Connection status will be managed per channel
      this.connectionStatus = "connected";
      console.log("✅ Enhanced Realtime Chat Service initialized");
    } catch (error) {
      console.error("Failed to initialize real-time service:", error);
      throw new AppError("Failed to initialize chat service", ErrorType.NETWORK);
    }
  }

  async joinRoom(roomId: string, userId: string, userName: string): Promise<RealtimeChannel> {
    try {
      console.log(`🚪 Joining chat room: ${roomId} as ${userName}`);

      // Clean up existing channel if any
      await this.leaveRoom(roomId);

      // Initialize message cache for this room
      if (!this.messageCache.has(roomId)) {
        this.messageCache.set(roomId, new Set());
      }

      // Create enhanced channel with all features
      const channel = supabase
        .channel(`enhanced_room_${roomId}`, {
          config: {
            presence: {
              key: `user_${userId}`,
            },
            broadcast: {
              self: false, // Don't receive own broadcasts
            },
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
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log(`👋 User joined: ${key}`, newPresences);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log(`👋 User left: ${key}`, leftPresences);
        })
        // Listen to typing indicators
        .on("broadcast", { event: "typing" }, (payload) => {
          this.handleTypingBroadcast(roomId, payload);
        })
        // Handle subscription status
        .subscribe(async (status, error) => {
          if (status === "SUBSCRIBED") {
            console.log(`✅ Successfully subscribed to room ${roomId}`);

            // Track user presence
            await channel.track({
              user_id: userId,
              user_name: userName,
              online_at: new Date().toISOString(),
              status: "online",
            });

            // Load initial messages
            await this.loadInitialMessages(roomId);

            this.retryAttempts.delete(roomId);
          } else if (status === "CHANNEL_ERROR") {
            console.error(`❌ Channel error for room ${roomId}:`, error);
            this.handleChannelError(roomId, error);
          } else if (status === "TIMED_OUT") {
            console.error(`⏰ Channel timeout for room ${roomId}`);
            this.handleChannelTimeout(roomId);
          }
        });

      this.channels.set(roomId, channel);
      return channel;
    } catch (error: any) {
      console.error(`Failed to join room ${roomId}:`, error);
      throw new AppError(
        `Failed to join chat room: ${error?.message || "Unknown error"}`,
        ErrorType.NETWORK,
      );
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
        console.error(`❌ Error loading messages for room ${roomId}:`, error);
        throw error;
      }

      if (messages && messages.length > 0) {
        const formattedMessages = messages
          .reverse() // Reverse for chronological order in UI
          .map(this.formatMessage);

        // Update cache
        const cache = this.messageCache.get(roomId) || new Set();
        formattedMessages.forEach((msg) => cache.add(msg.id));
        this.messageCache.set(roomId, cache);

        // Notify callback with initial messages (this replaces all messages)
        const callback = this.messageCallbacks.get(roomId);
        if (callback) {
          // For initial load, we need to replace all messages
          callback(formattedMessages, true); // true indicates this is initial load
        }
      }
    } catch (error) {
      console.error(`Failed to load messages for room ${roomId}:`, error);
      throw new AppError("Failed to load chat messages", ErrorType.SERVER);
    }
  }

  // Load older messages for pagination
  async loadOlderMessages(
    roomId: string,
    beforeTimestamp: string,
    limit: number = 30,
  ): Promise<ChatMessage[]> {
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

      return messages ? messages.reverse().map(this.formatMessage) : [];
    } catch (error) {
      console.error(`Failed to load older messages for room ${roomId}:`, error);
      return [];
    }
  }

  // Enhanced message handling with deduplication
  private handleNewMessage(roomId: string, payload: any): void {
    try {
      if (!payload.new) return;

      const messageId = payload.new.id;
      const cache = this.messageCache.get(roomId) || new Set();

      // Prevent duplicate messages
      if (cache.has(messageId)) {
        console.log(`🔄 Duplicate message ignored: ${messageId}`);
        return;
      }

      cache.add(messageId);
      this.messageCache.set(roomId, cache);

      const newMessage = this.formatMessage(payload.new);

      // Batch updates for better performance
      this.batchMessageUpdate(roomId, newMessage);
    } catch (error) {
      console.error("Error handling new message:", error);
    }
  }

  // Batch message updates to prevent UI thrashing
  private batchMessageUpdate(roomId: string, message: ChatMessage): void {
    if (!this.batchedUpdates.has(roomId)) {
      this.batchedUpdates.set(roomId, []);
    }

    this.batchedUpdates.get(roomId)!.push(message);

    // Clear existing timeout
    const existingTimeout = this.updateTimeouts.get(roomId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for batch processing
    const timeout = setTimeout(() => {
      const messages = this.batchedUpdates.get(roomId) || [];
      if (messages.length > 0) {
        const callback = this.messageCallbacks.get(roomId);
        if (callback) {
          callback(messages, false); // false indicates these are new messages, not initial load
        }
        this.batchedUpdates.set(roomId, []);
      }
      this.updateTimeouts.delete(roomId);
    }, 100); // 100ms batch window

    this.updateTimeouts.set(roomId, timeout);
  }

  // Handle message updates (edits, reactions)
  private handleMessageUpdate(roomId: string, payload: any): void {
    try {
      if (!payload.new) return;

      const updatedMessage = this.formatMessage(payload.new);

      // Notify about message update
      const callback = this.messageCallbacks.get(roomId);
      if (callback) {
        callback([updatedMessage], false); // false indicates this is an update, not initial load
      }
    } catch (error) {
      console.error("Error handling message update:", error);
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
      console.error("Error handling presence sync:", error);
    }
  }

  // Typing indicator handling
  private handleTypingBroadcast(roomId: string, payload: any): void {
    try {
      const { userId, userName, isTyping, timestamp } = payload.payload;

      if (!userId || !userName) return;

      const callback = this.typingCallbacks.get(roomId);
      if (!callback) return;

      if (isTyping) {
        // Add to typing users
        const typingUser: TypingUser = { userId, userName, timestamp };
        callback([typingUser]);

        // Auto-remove after 3 seconds
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
        // Remove from typing users
        callback([{ userId, userName, timestamp: 0 }]);
      }
    } catch (error) {
      console.error("Error handling typing broadcast:", error);
    }
  }

  // Send typing indicator
  async setTyping(
    roomId: string,
    userId: string,
    userName: string,
    isTyping: boolean,
  ): Promise<void> {
    try {
      const channel = this.channels.get(roomId);
      if (!channel) return;

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
    } catch (error) {
      console.error("Failed to send typing indicator:", error);
    }
  }

  // Send message with enhanced error handling
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
      console.log(`📤 Sending message to room ${roomId}`);

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

      const { error } = await supabase.from("chat_messages_firebase").insert(messageData);

      if (error) {
        console.error("❌ Error sending message:", error);
        throw error;
      }

      // Update room's last activity
      await supabase
        .from("chat_rooms_firebase")
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq("id", roomId);

      console.log("✅ Message sent successfully");
    } catch (error: any) {
      console.error("💥 Failed to send message:", error);
      throw new AppError(
        `Failed to send message: ${error?.message || "Unknown error"}`,
        ErrorType.NETWORK,
      );
    }
  }

  async sendReaction(
    roomId: string,
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<void> {
    try {
      // First, get the current reactions for the message
      const { data: message, error: fetchError } = await supabase
        .from("chat_messages_firebase")
        .select("reactions")
        .eq("id", messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions = message?.reactions || [];

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
      console.error("Failed to send reaction:", error);
      throw new AppError(
        `Failed to send reaction: ${error?.message || "Unknown error"}`,
        ErrorType.NETWORK,
      );
    }
  }

  // Subscribe to callbacks
  subscribeToMessages(roomId: string, callback: MessageCallback): void {
    this.messageCallbacks.set(roomId, callback);
  }

  subscribeToPresence(roomId: string, callback: PresenceCallback): void {
    this.presenceCallbacks.set(roomId, callback);
  }

  subscribeToTyping(roomId: string, callback: TypingCallback): void {
    this.typingCallbacks.set(roomId, callback);
  }

  // Enhanced error handling
  private handleChannelError(roomId: string, error: any): void {
    const attempts = this.retryAttempts.get(roomId) || 0;
    if (attempts < this.maxRetries) {
      this.retryAttempts.set(roomId, attempts + 1);
      const delay = Math.pow(2, attempts) * 1000; // Exponential backoff

      console.log(`🔄 Retrying connection to room ${roomId} in ${delay}ms (attempt ${attempts + 1})`);

      const timeout = setTimeout(() => {
        this.reconnectToRoom(roomId);
      }, delay);

      this.reconnectTimeouts.set(roomId, timeout);
    } else {
      console.error(`❌ Max retries exceeded for room ${roomId}`);
      throw new AppError("Failed to connect to chat room", ErrorType.NETWORK);
    }
  }

  private handleChannelTimeout(roomId: string): void {
    console.log(`⏰ Channel timeout for room ${roomId}, attempting reconnection`);
    this.handleChannelError(roomId, new Error("Channel timeout"));
  }

  private async reconnectToRoom(roomId: string): Promise<void> {
    try {
      const channel = this.channels.get(roomId);
      if (channel) {
        await channel.unsubscribe();
        this.channels.delete(roomId);
      }

      console.log(`🔄 Reconnecting to room ${roomId}`);
    } catch (error) {
      console.error(`Failed to reconnect to room ${roomId}:`, error);
    }
  }

  private retryFailedConnections(): void {
    // Retry any failed connections when the main connection is restored
    this.retryAttempts.forEach((attempts, roomId) => {
      if (attempts > 0) {
        console.log(`🔄 Retrying failed connection to room ${roomId}`);
        this.reconnectToRoom(roomId);
      }
    });
  }

  private scheduleReconnection(): void {
    // Schedule a global reconnection attempt
    setTimeout(() => {
      if (this.connectionStatus === "disconnected") {
        console.log("🔄 Attempting to reconnect to Supabase Realtime");
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

      // Cleanup callbacks and caches
      this.messageCallbacks.delete(roomId);
      this.presenceCallbacks.delete(roomId);
      this.typingCallbacks.delete(roomId);
      this.messageCache.delete(roomId);
      this.batchedUpdates.delete(roomId);

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

      console.log(`👋 Left room ${roomId}`);
    } catch (error) {
      console.error(`Failed to leave room ${roomId}:`, error);
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
      this.batchedUpdates.clear();
      this.retryAttempts.clear();

      // Clear all timeouts
      this.updateTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.updateTimeouts.clear();

      this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.reconnectTimeouts.clear();

      this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.typingTimeouts.clear();

      this.connectionStatus = "disconnected";
      console.log("🧹 Real-time chat service cleaned up");
    } catch (error) {
      console.error("Failed to cleanup real-time service:", error);
    }
  }

  // Utility method to format messages
  private formatMessage(rawMessage: any): ChatMessage {
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
      reactions: rawMessage.reactions || [],
      audioUri: rawMessage.audio_uri,
      audioDuration: rawMessage.audio_duration,
    };
  }

  // Get connection status
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  // Get active channels count
  getActiveChannelsCount(): number {
    return this.channels.size;
  }
}

// Export singleton instance
export const enhancedRealtimeChatService = new EnhancedRealtimeChatService();
export default enhancedRealtimeChatService;