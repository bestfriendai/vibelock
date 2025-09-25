import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import supabase from "../config/supabase";
import { ChatMessage, ConnectionStatus, TypingUser } from "../types";
import { Database } from "../types/database.types";
import "react-native-url-polyfill/auto";

// Supabase Realtime message types
export interface RealtimeMessage {
  type: "postgres_changes";
  event: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  new?: Database["public"]["Tables"]["chat_messages_firebase"]["Row"];
  old?: Database["public"]["Tables"]["chat_messages_firebase"]["Row"];
}

export interface BroadcastPayload {
  type: "typing" | "user_joined" | "user_left" | "presence_sync";
  user_id: string;
  user_name?: string;
  chat_room_id: string;
  is_typing?: boolean;
  timestamp: string;
}

export interface WebSocketServiceCallbacks {
  onMessage: (message: ChatMessage) => void;
  onTyping: (typingUser: TypingUser) => void;
  onUserJoin: (userId: string, userName: string, chatRoomId: string) => void;
  onUserLeave: (userId: string, chatRoomId: string) => void;
  onOnlineStatusChange: (onlineUsers: string[]) => void;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  onError: (error: string) => void;
}

class SupabaseRealtimeService {
  private messagesChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private typingChannel: RealtimeChannel | null = null;
  private callbacks: WebSocketServiceCallbacks | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentChatRoomId: string | null = null;
  private connectionStatus: ConnectionStatus = "disconnected";
  private typingTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Track pending messages for optimistic updates
  private pendingMessages = new Map<string, ChatMessage>();

  // Connection retry logic with exponential backoff
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;

  // Enhanced error tracking
  private connectionErrors: { timestamp: number; error: string; attempts: number }[] = [];
  private lastConnectionError: string | null = null;

  constructor() {
    this.initializeSupabaseListeners();
  }

  /**
   * Initialize Supabase realtime connection listeners with enhanced error handling
   */
  private initializeSupabaseListeners() {
    if (this.isInitialized) {
      return;
    }

    // Enhanced error handling for Supabase Realtime v2.57.4
    // Listen for overall connection status changes
    // Setup heartbeat to monitor connection health
    this.setupHeartbeat();

    // Handle global realtime connection errors
    if (supabase.realtime) {
      // Monitor realtime connection state
      const originalConnect = supabase.realtime.connect.bind(supabase.realtime);
      supabase.realtime.connect = () => {
        this.trackConnectionAttempt();
        return originalConnect();
      };
    }

    this.isInitialized = true;
  }

  /**
   * Connect to Supabase realtime with enhanced authentication and error handling
   */
  async connect(userId: string, callbacks: WebSocketServiceCallbacks, userName?: string) {
    if (this.connectionStatus === "connecting" || this.connectionStatus === "connected") {
      return;
    }

    // Clear any existing reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.currentUserId = userId;
    this.currentUserName = userName || `User_${userId.slice(0, 8)}`;
    this.callbacks = callbacks;
    this.connectionStatus = "connecting";
    this.callbacks.onConnectionStatusChange("connecting");

    try {
      // Enhanced authentication check with retry logic
      await this.ensureAuthenticated();

      // Verify network connectivity before attempting connection
      await this.verifyNetworkConnectivity();

      // Connect to Supabase realtime with timeout
      await Promise.race([this.setupRealtimeChannels(), this.createTimeoutPromise(15000, "Connection timeout")]);

      this.updateConnectionStatus("connected");
      this.clearConnectionErrors();
    } catch (error: any) {
      console.error("Failed to connect to Supabase Realtime:", error);
      this.trackConnectionError(error.message || "Failed to connect to realtime");
      this.updateConnectionStatus("error", error.message || "Failed to connect to realtime");

      // Attempt to reconnect with enhanced logic
      this.attemptReconnection();
    }
  }

  /**
   * Disconnect from all Supabase realtime channels with enhanced cleanup
   */
  async disconnect() {
    // Clear all timeouts and intervals
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Unsubscribe from all channels with proper error handling
    try {
      const channelCleanupPromises = [];

      if (this.messagesChannel) {
        channelCleanupPromises.push(
          supabase.removeChannel(this.messagesChannel).catch((err) => {
            console.error(err);
          }),
        );
        this.messagesChannel = null;
      }

      if (this.presenceChannel) {
        channelCleanupPromises.push(
          supabase.removeChannel(this.presenceChannel).catch((err) => {
            console.error(err);
          }),
        );
        this.presenceChannel = null;
      }

      if (this.typingChannel) {
        channelCleanupPromises.push(
          supabase.removeChannel(this.typingChannel).catch((err) => {
            console.error(err);
          }),
        );
        this.typingChannel = null;
      }

      // Wait for all channel cleanup with timeout
      await Promise.race([
        Promise.all(channelCleanupPromises),
        this.createTimeoutPromise(5000, "Channel cleanup timeout"),
      ]);
    } catch (error) {}

    // Reset state
    this.connectionStatus = "disconnected";
    this.currentUserId = null;
    this.currentUserName = null;
    this.currentChatRoomId = null;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = 0;
    this.pendingMessages.clear();
    this.clearConnectionErrors();

    this.callbacks?.onConnectionStatusChange("disconnected");
    this.callbacks = null;
  }

  /**
   * Join a specific chat room with realtime subscriptions
   */
  async joinRoom(chatRoomId: string) {
    if (!this.currentUserId || !this.callbacks) {
      throw new Error("Must be connected before joining a room");
    }

    // Leave previous room if any
    if (this.currentChatRoomId && this.currentChatRoomId !== chatRoomId) {
      await this.leaveRoom(this.currentChatRoomId);
    }

    this.currentChatRoomId = chatRoomId;

    try {
      // Setup room-specific channels
      await this.setupRoomChannels(chatRoomId);

      // Broadcast user join
      if (this.presenceChannel) {
        await this.presenceChannel.track({
          user_id: this.currentUserId,
          user_name: this.currentUserName,
          online_at: new Date().toISOString(),
        });
      }

      // Notify callbacks
      this.callbacks.onUserJoin(this.currentUserId, this.currentUserName!, chatRoomId);
    } catch (error: any) {
      console.error(" Failed to join room:", error);
      this.callbacks.onError(`Failed to join room: ${error.message}`);
    }
  }

  /**
   * Leave current chat room
   */
  async leaveRoom(chatRoomId: string) {
    if (!this.currentUserId || !this.callbacks) {
      return;
    }

    try {
      // Untrack presence
      if (this.presenceChannel) {
        await this.presenceChannel.untrack();
      }

      // Notify callbacks
      this.callbacks.onUserLeave(this.currentUserId, chatRoomId);

      // Reset current room if leaving the active room
      if (this.currentChatRoomId === chatRoomId) {
        this.currentChatRoomId = null;
      }
    } catch (error: any) {
      console.error(" Failed to leave room:", error);
      this.callbacks.onError(`Failed to leave room: ${error.message}`);
    }
  }

  /**
   * Send a chat message with optimistic updates
   */
  async sendChatMessage(message: Omit<ChatMessage, "id" | "timestamp">) {
    if (!this.currentUserId || !this.currentChatRoomId) {
      throw new Error("Must be connected and in a room to send messages");
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Create optimistic message
    const optimisticMessage: ChatMessage = {
      ...message,
      id: tempId,
      senderId: this.currentUserId,
      senderName: this.currentUserName!,
      chatRoomId: this.currentChatRoomId,
      timestamp,
      status: "pending",
      isOwn: true,
    };

    // Store pending message
    this.pendingMessages.set(tempId, optimisticMessage);

    // Immediately notify UI with optimistic update
    this.callbacks?.onMessage(optimisticMessage);

    try {
      // Insert message into database
      const { data, error } = await supabase
        .from("chat_messages_firebase")
        .insert({
          chat_room_id: this.currentChatRoomId,
          sender_id: this.currentUserId,
          sender_name: this.currentUserName!,
          content: message.content,
          message_type: message.messageType || "text",
          timestamp: timestamp.toISOString(),
          sender_avatar: message.senderAvatar,
          reply_to: message.replyTo,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Remove from pending and update status
      this.pendingMessages.delete(tempId);

      // Update optimistic message with real data
      if (data) {
        const realMessage: ChatMessage = {
          ...optimisticMessage,
          id: data.id,
          status: "sent",
          timestamp: new Date(data.timestamp || timestamp),
        };

        this.callbacks?.onMessage(realMessage);
      }
    } catch (error: any) {
      console.error(" Failed to send message:", error);

      // Update optimistic message with error status
      const failedMessage: ChatMessage = {
        ...optimisticMessage,
        status: "failed",
      };

      this.pendingMessages.delete(tempId);
      this.callbacks?.onMessage(failedMessage);
      this.callbacks?.onError(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(chatRoomId: string, isTyping: boolean) {
    if (!this.currentUserId || !this.typingChannel || chatRoomId !== this.currentChatRoomId) {
      return;
    }

    try {
      const payload: BroadcastPayload = {
        type: "typing",
        user_id: this.currentUserId,
        user_name: this.currentUserName!,
        chat_room_id: chatRoomId,
        is_typing: isTyping,
        timestamp: new Date().toISOString(),
      };

      await this.typingChannel.send({
        type: "broadcast",
        event: "typing",
        payload,
      });

      // Auto-clear typing indicator after 3 seconds
      if (isTyping) {
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }

        this.typingTimeout = setTimeout(() => {
          this.sendTypingIndicator(chatRoomId, false);
        }, 3000);
      }
    } catch (error: any) {
      console.error(" Failed to send typing indicator:", error);
    }
  }

  /**
   * Enhanced setup for main realtime channels with Expo SDK 54 compatibility
   */
  private async setupRealtimeChannels() {
    try {
      // Ensure realtime client is properly initialized
      if (!supabase.realtime) {
        throw new Error("Supabase realtime client not initialized");
      }

      // Global messages channel for database changes with enhanced error handling
      const channelName = `chat_messages_global_${Date.now()}`;
      this.messagesChannel = supabase.channel(channelName, {
        config: {
          // Enable presence tracking for this channel
          presence: {
            key: this.currentUserId || undefined,
          },
        },
      });

      // Enhanced subscription with comprehensive status handling
      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        let hasResolved = false;
        const timeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error("Channel subscription timeout"));
          }
        }, 15000);

        this.messagesChannel!.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages_firebase",
          },
          (payload) => this.handleMessageChange(payload),
        ).subscribe((status) => {
          switch (status) {
            case "SUBSCRIBED":
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                this.updateConnectionStatus("connected");
                resolve();
              }
              break;

            case "CHANNEL_ERROR":
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                console.error(" Messages channel subscription error");
                this.updateConnectionStatus("error", "Failed to subscribe to messages channel");
                reject(new Error("Messages channel subscription failed"));
              } else {
                // Handle runtime errors
                console.error(" Messages channel runtime error");
                this.handleChannelError("messages");
              }
              break;

            case "CLOSED":
              if (this.connectionStatus === "connected") {
                this.updateConnectionStatus("disconnected");
                this.attemptReconnection();
              }
              break;

            case "TIMED_OUT":
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                reject(new Error("Channel subscription timed out"));
              } else {
                this.handleChannelError("messages");
              }
              break;

            default:
          }
        });
      });

      await subscriptionPromise;
    } catch (error: any) {
      console.error(" Failed to setup realtime channels:", error);

      // Cleanup on failure
      if (this.messagesChannel) {
        try {
          await supabase.removeChannel(this.messagesChannel);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
        this.messagesChannel = null;
      }

      throw new Error(`Channel setup failed: ${error.message}`);
    }
  }

  /**
   * Enhanced setup for room-specific channels with improved error handling
   */
  private async setupRoomChannels(chatRoomId: string) {
    try {
      // Room presence channel with enhanced configuration
      const presenceChannelName = `room_presence_${chatRoomId}_${Date.now()}`;
      this.presenceChannel = supabase.channel(presenceChannelName, {
        config: {
          presence: {
            key: this.currentUserId!,
          },
        },
      });

      // Room typing channel with enhanced configuration
      const typingChannelName = `room_typing_${chatRoomId}_${Date.now()}`;
      this.typingChannel = supabase.channel(typingChannelName);

      // Setup presence channel with promise-based subscription
      const presencePromise = new Promise<void>((resolve, reject) => {
        let hasResolved = false;
        const timeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error("Presence channel subscription timeout"));
          }
        }, 10000);

        this.presenceChannel!.on("presence", { event: "sync" }, () => {
          this.handlePresenceSync();
        })
          .on("presence", { event: "join" }, ({ key, newPresences }) => {
            this.handlePresenceJoin(key, newPresences);
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
            this.handlePresenceLeave(key, leftPresences);
          })
          .subscribe((status) => {
            switch (status) {
              case "SUBSCRIBED":
                if (!hasResolved) {
                  hasResolved = true;
                  clearTimeout(timeout);
                  resolve();
                }
                break;
              case "CHANNEL_ERROR":
                if (!hasResolved) {
                  hasResolved = true;
                  clearTimeout(timeout);
                  reject(new Error("Presence channel subscription failed"));
                } else {
                  this.handleChannelError("presence");
                }
                break;
              case "CLOSED":
                break;
              case "TIMED_OUT":
                if (!hasResolved) {
                  hasResolved = true;
                  clearTimeout(timeout);
                  reject(new Error("Presence channel subscription timed out"));
                } else {
                  this.handleChannelError("presence");
                }
                break;
            }
          });
      });

      // Setup typing channel with promise-based subscription
      const typingPromise = new Promise<void>((resolve, reject) => {
        let hasResolved = false;
        const timeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error("Typing channel subscription timeout"));
          }
        }, 10000);

        this.typingChannel!.on("broadcast", { event: "typing" }, (payload) => {
          this.handleTypingEvent(payload.payload as BroadcastPayload);
        }).subscribe((status) => {
          switch (status) {
            case "SUBSCRIBED":
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                resolve();
              }
              break;
            case "CHANNEL_ERROR":
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                reject(new Error("Typing channel subscription failed"));
              } else {
                this.handleChannelError("typing");
              }
              break;
            case "CLOSED":
              break;
            case "TIMED_OUT":
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                reject(new Error("Typing channel subscription timed out"));
              } else {
                this.handleChannelError("typing");
              }
              break;
          }
        });
      });

      // Wait for both channels to be ready
      await Promise.all([presencePromise, typingPromise]);
    } catch (error: any) {
      console.error(" Failed to setup room channels:", error);

      // Cleanup on failure
      if (this.presenceChannel) {
        try {
          await supabase.removeChannel(this.presenceChannel);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
        this.presenceChannel = null;
      }

      if (this.typingChannel) {
        try {
          await supabase.removeChannel(this.typingChannel);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
        this.typingChannel = null;
      }

      throw new Error(`Room channels setup failed: ${error.message}`);
    }
  }

  /**
   * Handle database message changes
   */
  private handleMessageChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (!this.callbacks) return;

    switch (eventType) {
      case "INSERT":
        if (newRecord && newRecord.chat_room_id === this.currentChatRoomId) {
          // Skip if this is our own pending message
          const isPending = Array.from(this.pendingMessages.values()).some(
            (msg) =>
              msg.senderId === newRecord.sender_id &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(newRecord.timestamp).getTime()) < 5000,
          );

          if (!isPending || newRecord.sender_id !== this.currentUserId) {
            const message: ChatMessage = this.convertDatabaseRowToMessage(newRecord);
            this.callbacks.onMessage(message);
          }
        }
        break;

      case "UPDATE":
        if (newRecord && newRecord.chat_room_id === this.currentChatRoomId) {
          const message: ChatMessage = this.convertDatabaseRowToMessage(newRecord);
          this.callbacks.onMessage(message);
        }
        break;

      case "DELETE":
        if (oldRecord) {
          // Handle message deletion if needed
        }
        break;
    }
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync() {
    if (!this.presenceChannel || !this.callbacks) return;

    const state = this.presenceChannel.presenceState();
    const onlineUsers = Object.keys(state).filter((key) => key !== this.currentUserId);

    this.callbacks.onOnlineStatusChange(onlineUsers);
  }

  /**
   * Handle user joining presence
   */
  private handlePresenceJoin(key: string, newPresences: any[]) {
    if (!this.callbacks || key === this.currentUserId) return;

    const presence = newPresences[0];
    if (presence && this.currentChatRoomId) {
      this.callbacks.onUserJoin(
        presence.user_id,
        presence.user_name || `User_${presence.user_id.slice(0, 8)}`,
        this.currentChatRoomId,
      );
    }
  }

  /**
   * Handle user leaving presence
   */
  private handlePresenceLeave(key: string, leftPresences: any[]) {
    if (!this.callbacks || key === this.currentUserId) return;

    if (this.currentChatRoomId) {
      this.callbacks.onUserLeave(key, this.currentChatRoomId);
    }
  }

  /**
   * Handle typing events
   */
  private handleTypingEvent(payload: BroadcastPayload) {
    if (!this.callbacks || payload.user_id === this.currentUserId) return;

    if (payload.type === "typing" && payload.chat_room_id === this.currentChatRoomId) {
      const typingUser: TypingUser = {
        userId: payload.user_id,
        userName: payload.user_name || `User_${payload.user_id.slice(0, 8)}`,
        chatRoomId: payload.chat_room_id,
        timestamp: new Date(payload.timestamp),
      };

      // Only notify if user is typing, let the UI handle clearing
      if (payload.is_typing) {
        this.callbacks.onTyping(typingUser);
      }
    }
  }

  /**
   * Handle manual connection state changes
   */
  private updateConnectionStatus(status: ConnectionStatus, error?: string) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.callbacks?.onConnectionStatusChange(status);

      if (status === "connected") {
        this.reconnectAttempts = 0;
      } else if (status === "error" && error) {
        this.callbacks?.onError(error);
      }
    }
  }

  /**
   * Enhanced reconnection with exponential backoff and circuit breaker pattern
   */
  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(" Max reconnection attempts reached");
      this.updateConnectionStatus("error", "Connection lost. Please check your internet connection and try again.");

      // Log final connection attempt summary
      this.logConnectionSummary();
      return;
    }

    this.reconnectAttempts++;
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const delay = Math.min(baseDelay + jitter, 30000);

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      if (this.currentUserId && this.callbacks) {
        try {
          // Check if we should continue attempting reconnection
          const recentErrors = this.getRecentConnectionErrors();
          if (recentErrors.length > 3) {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
          }

          await this.connect(this.currentUserId, this.callbacks, this.currentUserName || undefined);

          // Rejoin current room if any
          if (this.currentChatRoomId) {
            await this.joinRoom(this.currentChatRoomId);
          }
        } catch (error) {
          console.error(" Reconnection failed:", error);
          // The connect method will call attemptReconnection again
        }
      }
    }, delay);
  }

  /**
   * Convert database row to ChatMessage
   */
  private convertDatabaseRowToMessage(row: Database["public"]["Tables"]["chat_messages_firebase"]["Row"]): ChatMessage {
    return {
      id: row.id,
      chatRoomId: row.chat_room_id!,
      senderId: row.sender_id!,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar || undefined,
      content: row.content,
      messageType: (row.message_type as any) || "text",
      timestamp: new Date(row.timestamp!),
      isRead: row.is_read || false,
      status: "delivered",
      isOwn: row.sender_id === this.currentUserId,
      replyTo: row.reply_to || undefined,
      reactions: row.reactions ? (row.reactions as any) : undefined,
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === "connected";
  }

  /**
   * Get pending messages count
   */
  getPendingMessagesCount(): number {
    return this.pendingMessages.size;
  }

  /**
   * Retry failed message by ID
   */
  async retryMessage(tempId: string) {
    const pendingMessage = this.pendingMessages.get(tempId);
    if (pendingMessage) {
      this.pendingMessages.delete(tempId);

      // Extract only the fields needed for sendChatMessage (excluding id and timestamp)
      const messageToRetry: Omit<ChatMessage, "id" | "timestamp"> = {
        chatRoomId: pendingMessage.chatRoomId,
        senderId: pendingMessage.senderId,
        senderName: pendingMessage.senderName,
        content: pendingMessage.content,
        messageType: pendingMessage.messageType,
        isRead: pendingMessage.isRead,
        senderAvatar: pendingMessage.senderAvatar,
        replyTo: pendingMessage.replyTo,
        status: pendingMessage.status,
        isOwn: pendingMessage.isOwn,
        reactions: pendingMessage.reactions,
      };

      await this.sendChatMessage(messageToRetry);
    }
  }

  /**
   * Enhanced authentication check with retry logic
   */
  private async ensureAuthenticated(): Promise<void> {
    const maxAttempts = 3;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError && authError.message !== "Auth session missing!") {
          throw new Error(`Authentication error: ${authError.message}`);
        }

        if (!user) {
          // Try to refresh the session
          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError || !session?.user) {
            throw new Error("User must be authenticated to connect to realtime");
          }
        }

        return; // Success
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }

        console.error(`Auth attempt ${attempts} failed:`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  /**
   * Verify network connectivity before attempting connection
   */
  private async verifyNetworkConnectivity(): Promise<void> {
    try {
      // Simple connectivity check using Supabase's REST API
      const { error } = await supabase.from("users").select("count").limit(1);

      if (error && error.code !== "PGRST116") {
        // Ignore RLS errors, they indicate connectivity
        throw new Error(`Network connectivity check failed: ${error.message}`);
      }
    } catch (error: any) {
      if (error.message?.includes("fetch")) {
        throw new Error("No internet connection. Please check your network and try again.");
      }
      // Other errors might still indicate connectivity, so we'll proceed
    }
  }

  /**
   * Create a timeout promise for connection operations
   */
  private createTimeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Setup heartbeat to monitor connection health
   */
  private setupHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.lastHeartbeat = Date.now();

      // Check if any channels are in an error state
      if (this.connectionStatus === "connected") {
        this.performHealthCheck();
      }
    }, 30000); // Heartbeat every 30 seconds
  }

  /**
   * Perform connection health check
   */
  private performHealthCheck(): void {
    try {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;

      // If too much time has passed since last heartbeat, consider connection unhealthy
      if (timeSinceLastHeartbeat > 60000) {
        this.updateConnectionStatus("error", "Connection health check failed");
        this.attemptReconnection();
        return;
      }

      // Check if realtime is still connected
      if (supabase.realtime && !supabase.realtime.isConnected()) {
        this.updateConnectionStatus("error", "Realtime connection lost");
        this.attemptReconnection();
        return;
      }

      // Check channel states
      const channels = [this.messagesChannel, this.presenceChannel, this.typingChannel].filter(Boolean);
      const unhealthyChannels = channels.filter((channel) => channel && (channel as any).state === "CHANNEL_ERROR");

      if (unhealthyChannels.length > 0) {
        this.updateConnectionStatus("error", "Some channels are in error state");
        this.attemptReconnection();
      }
    } catch (error) {}
  }

  /**
   * Track connection attempt for metrics
   */
  private trackConnectionAttempt(): void {
    // Track connection attempt metrics
  }

  /**
   * Track connection error with timestamp
   */
  private trackConnectionError(error: string): void {
    const errorEntry = {
      timestamp: Date.now(),
      error,
      attempts: this.reconnectAttempts,
    };

    this.connectionErrors.push(errorEntry);
    this.lastConnectionError = error;

    // Keep only recent errors (last 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    this.connectionErrors = this.connectionErrors.filter((e) => e.timestamp > tenMinutesAgo);
  }

  /**
   * Get recent connection errors for analysis
   */
  private getRecentConnectionErrors(): { timestamp: number; error: string; attempts: number }[] {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.connectionErrors.filter((e) => e.timestamp > fiveMinutesAgo);
  }

  /**
   * Clear connection errors
   */
  private clearConnectionErrors(): void {
    this.connectionErrors = [];
    this.lastConnectionError = null;
    this.reconnectDelay = 1000; // Reset delay
  }

  /**
   * Log connection attempt summary for debugging
   */
  private logConnectionSummary(): void {
    // Log connection summary for debugging
  }

  /**
   * Handle individual channel errors
   */
  private handleChannelError(channelType: "messages" | "presence" | "typing"): void {
    console.error(`${channelType} channel error detected`);

    // Track the error
    this.trackConnectionError(`${channelType} channel error`);

    // If we're in a critical state (multiple channel errors), trigger reconnection
    const recentErrors = this.getRecentConnectionErrors();
    const channelErrors = recentErrors.filter((e) => e.error.includes("channel"));

    if (channelErrors.length >= 2) {
      this.updateConnectionStatus("error", "Multiple channel failures");
      this.attemptReconnection();
    } else {
      // Try to recover just this channel
      this.recoverChannel(channelType);
    }
  }

  /**
   * Attempt to recover a specific channel
   */
  private async recoverChannel(channelType: "messages" | "presence" | "typing"): Promise<void> {
    try {
      switch (channelType) {
        case "messages":
          if (this.messagesChannel) {
            await supabase.removeChannel(this.messagesChannel);
            this.messagesChannel = null;
          }
          await this.setupRealtimeChannels();
          break;

        case "presence":
        case "typing":
          if (this.currentChatRoomId) {
            // Remove the specific channel
            const channel = channelType === "presence" ? this.presenceChannel : this.typingChannel;
            if (channel) {
              await supabase.removeChannel(channel);
              if (channelType === "presence") {
                this.presenceChannel = null;
              } else {
                this.typingChannel = null;
              }
            }
            // Recreate room channels
            await this.setupRoomChannels(this.currentChatRoomId);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to recover ${channelType} channel:`, error);
      // If recovery fails, trigger full reconnection
      this.updateConnectionStatus("error", `${channelType} channel recovery failed`);
      this.attemptReconnection();
    }
  }

  /**
   * Get connection diagnostics for debugging
   */
  getConnectionDiagnostics(): {
    status: ConnectionStatus;
    attempts: number;
    lastError: string | null;
    recentErrors: number;
    isRealtimeConnected: boolean;
    lastHeartbeat: number;
    pendingMessages: number;
    channelStates: {
      messages: string | null;
      presence: string | null;
      typing: string | null;
    };
  } {
    return {
      status: this.connectionStatus,
      attempts: this.reconnectAttempts,
      lastError: this.lastConnectionError,
      recentErrors: this.getRecentConnectionErrors().length,
      isRealtimeConnected: supabase.realtime?.isConnected() ?? false,
      lastHeartbeat: this.lastHeartbeat,
      pendingMessages: this.pendingMessages.size,
      channelStates: {
        messages: this.messagesChannel ? (this.messagesChannel as any).state || "unknown" : null,
        presence: this.presenceChannel ? (this.presenceChannel as any).state || "unknown" : null,
        typing: this.typingChannel ? (this.typingChannel as any).state || "unknown" : null,
      },
    };
  }
}

// Export singleton instance with backward compatibility
export const webSocketService = new SupabaseRealtimeService();

// Also export the class itself for advanced usage
export { SupabaseRealtimeService as WebSocketService };
