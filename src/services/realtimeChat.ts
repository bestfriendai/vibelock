// Modern Supabase Real-time Chat Service (2025)
import { supabase } from "../config/supabase";
import { ChatRoom, ChatMessage, ChatMember } from "../types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { AppError, ErrorType, parseSupabaseError } from "../utils/errorHandling";

class RealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: Map<string, (messages: ChatMessage[]) => void> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private roomCallbacks: Map<string, (rooms: ChatRoom[]) => void> = new Map();
  private presenceCallbacks: Map<string, (members: ChatMember[]) => void> = new Map();
  private typingCallbacks: Map<string, (typingUsers: any[]) => void> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private pendingJoins: Set<string> = new Set();

  // Initialize real-time chat system
  async initialize() {
    console.log("🚀 Initializing Supabase Real-time Chat Service");
    
    // Set up global room updates channel
    const roomsChannel = supabase
      .channel("chat_rooms_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms_firebase",
        },
        (payload) => {
          console.log("📢 Room update:", payload);
          this.handleRoomUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set("rooms", roomsChannel);
  }

  // Get chat rooms with proper error handling
  async getChatRooms(): Promise<ChatRoom[]> {
    try {
      const { data, error } = await supabase
        .from("chat_rooms_firebase")
        .select(`
          id,
          name,
          description,
          type,
          category,
          member_count,
          online_count,
          last_activity,
          is_active,
          location,
          created_at,
          updated_at
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching chat rooms:", error);
        throw error;
      }

      console.log("✅ Fetched chat rooms:", data?.length || 0);

      return (data || []).map((room) => ({
        id: room.id,
        name: room.name,
        description: room.description || "",
        type: room.type as any,
        category: room.category as any,
        memberCount: room.member_count || 0,
        onlineCount: room.online_count || 0,
        lastActivity: new Date(room.last_activity || room.created_at),
        isActive: room.is_active,
        location: room.location ? room.location : undefined,
        createdAt: new Date(room.created_at),
        updatedAt: new Date(room.updated_at || room.created_at),
      }));
    } catch (error: any) {
      console.error("💥 Failed to get chat rooms:", error);
      throw new Error(`Failed to load chat rooms: ${error.message}`);
    }
  }

  // Subscribe to room updates
  subscribeToRooms(callback: (rooms: ChatRoom[]) => void) {
    this.roomCallbacks.set("global", callback);
  }

  // Join a chat room with presence and message subscription
  async joinRoom(roomId: string, userId: string, userName: string) {
    console.log(`🚪 Joining room ${roomId} as ${userName}`);

    // Prevent race conditions - check if join is already in progress
    if (this.pendingJoins.has(roomId)) {
      console.log(`⚠️ Join already in progress for room ${roomId}`);
      // Wait for the pending join to complete
      while (this.pendingJoins.has(roomId)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.channels.get(roomId)!;
    }

    // Check if already connected to this room
    if (this.channels.has(roomId)) {
      console.log(`⚠️ Already connected to room ${roomId}`);
      return this.channels.get(roomId)!;
    }

    // Mark join as in progress
    this.pendingJoins.add(roomId);

    // Create abort controller for this operation
    const abortController = new AbortController();
    this.abortControllers.set(roomId, abortController);

    try {
      // Create room-specific channel with better error handling
      const channel = supabase
        .channel(`room_${roomId}`, {
          config: {
            presence: {
              key: userId,
            },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => {
            try {
              console.log("💬 New message:", payload);
              this.handleNewMessage(roomId, payload);
            } catch (error) {
              console.error("Error handling new message:", error);
              const appError = error instanceof AppError ? error : parseSupabaseError(error);
              // Don't throw here as it would break the subscription, just log
            }
          }
        )
        .on("presence", { event: "sync" }, () => {
          try {
            console.log("👥 Presence sync for room", roomId);
            this.handlePresenceSync(roomId);
          } catch (error) {
            console.error("Error handling presence sync:", error);
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            // Don't throw here as it would break the subscription, just log
          }
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          try {
            console.log("👋 User joined:", key, newPresences);
            this.handlePresenceJoin(roomId, key, newPresences);
          } catch (error) {
            console.error("Error handling presence join:", error);
          }
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          try {
            console.log("👋 User left:", key, leftPresences);
            this.handlePresenceLeave(roomId, key, leftPresences);
          } catch (error) {
            console.error("Error handling presence leave:", error);
          }
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          try {
            console.log("⌨️ Typing event:", payload);
            this.handleTypingEvent(roomId, payload);
          } catch (error) {
            console.error("Error handling typing event:", error);
          }
        })
        .subscribe(async (status, err) => {
          console.log(`📡 Room ${roomId} subscription status:`, status);

          if (err) {
            console.error(`❌ Subscription error for room ${roomId}:`, err);
            return;
          }

          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to room", roomId);

            try {
              // Track presence with retry
              let retries = 3;
              while (retries > 0) {
                try {
                  await channel.track({
                    user_id: userId,
                    user_name: userName,
                    online_at: new Date().toISOString(),
                  });
                  break;
                } catch (error) {
                  if (!this.abortControllers.get(roomId)?.signal.aborted) {
                    console.warn(`Presence tracking attempt ${4 - retries} failed:`, error);
                  }
                  retries--;
                  if (retries > 0 && !this.abortControllers.get(roomId)?.signal.aborted) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              }

              // Load initial messages with retry
              retries = 3;
              while (retries > 0) {
                try {
                  await this.loadRoomMessages(roomId);
                  break;
                } catch (error) {
                  if (!this.abortControllers.get(roomId)?.signal.aborted) {
                    console.warn(`Message loading attempt ${4 - retries} failed:`, error);
                  }
                  retries--;
                  if (retries > 0 && !this.abortControllers.get(roomId)?.signal.aborted) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                  }
                }
              }
            } catch (error) {
              console.error("Error in subscription setup:", error);
            }
          } else if (status === "CHANNEL_ERROR") {
            console.error(`❌ Channel error for room ${roomId}`);
            // Try to reconnect after a delay
            setTimeout(() => {
              console.log(`🔄 Attempting to reconnect to room ${roomId}`);
              this.joinRoom(roomId, userId, userName);
            }, 5000);
          } else if (status === "TIMED_OUT") {
            console.error(`⏰ Subscription timed out for room ${roomId}`);
            // Implement exponential backoff for reconnection
            const retryCount = this.retryAttempts.get(roomId) || 0;
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            this.retryAttempts.set(roomId, retryCount + 1);

            setTimeout(() => {
              console.log(`🔄 Attempting to reconnect to room ${roomId} (attempt ${retryCount + 1})`);
              this.joinRoom(roomId, userId, userName);
            }, delay);
          }
        });

      this.channels.set(roomId, channel);

      // Clear pending join and reset retry count on success
      this.pendingJoins.delete(roomId);
      this.retryAttempts.delete(roomId);

      return channel;
    } catch (error) {
      console.error("💥 Failed to join room:", error);

      // Clean up on failure
      this.pendingJoins.delete(roomId);
      this.abortControllers.delete(roomId);

      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw new AppError(
        `Failed to join room ${roomId}`,
        ErrorType.SERVER,
        "ROOM_JOIN_FAILED",
        undefined,
        true
      );
    }
  }

  // Leave a chat room
  async leaveRoom(roomId: string) {
    console.log(`🚪 Leaving room ${roomId}`);

    // Cancel any pending operations
    const abortController = this.abortControllers.get(roomId);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(roomId);
    }

    // Remove from pending joins if still pending
    this.pendingJoins.delete(roomId);

    const channel = this.channels.get(roomId);
    if (channel) {
      await channel.untrack();
      await channel.unsubscribe();
      this.channels.delete(roomId);
    }

    // Clean up all callbacks and state for this room
    this.messageCallbacks.delete(roomId);
    this.presenceCallbacks.delete(roomId);
    this.typingCallbacks.delete(roomId);
    this.retryAttempts.delete(roomId);

    // Clear any typing timeouts for this room
    const typingTimeout = this.typingTimeouts.get(roomId);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      this.typingTimeouts.delete(roomId);
    }
  }

  // Load messages for a room
  async loadRoomMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from("chat_messages_firebase")
        .select(`
          id,
          chat_room_id,
          sender_id,
          sender_name,
          sender_avatar,
          content,
          message_type,
          timestamp,
          is_read,
          reply_to
        `)
        .eq("chat_room_id", roomId)
        .order("timestamp", { ascending: true })
        .limit(50);

      if (error) {
        console.error("❌ Error loading messages:", error);
        throw error;
      }

      const messages = (data || []).map((msg) => ({
        id: msg.id,
        chatRoomId: msg.chat_room_id,
        senderId: msg.sender_id || "unknown",
        senderName: msg.sender_name || "User",
        senderAvatar: msg.sender_avatar,
        content: msg.content,
        messageType: (msg.message_type || "text") as any,
        timestamp: new Date(msg.timestamp),
        isRead: msg.is_read || false,
        replyTo: msg.reply_to,
      })) as ChatMessage[];

      console.log(`📨 Loaded ${messages.length} messages for room ${roomId}`);

      // Notify callback if exists
      const callback = this.messageCallbacks.get(roomId);
      if (callback) {
        callback(messages);
      }

      return messages;
    } catch (error: any) {
      console.error("💥 Failed to load messages:", error);
      throw new Error(`Failed to load messages: ${error.message}`);
    }
  }

  // Load members for a specific room
  async getRoomMembers(roomId: string): Promise<ChatMember[]> {
    try {
      console.log(`👥 Loading members for room ${roomId}...`);

      const { data, error } = await supabase
        .from("chat_room_members_firebase")
        .select(`
          id,
          chat_room_id,
          user_id,
          user_name,
          joined_at,
          role,
          is_online,
          last_seen
        `)
        .eq("chat_room_id", roomId)
        .order("joined_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading members:", error);
        throw error;
      }

      const members = (data || []).map((member) => ({
        id: member.id,
        chatRoomId: member.chat_room_id,
        userId: member.user_id,
        userName: member.user_name || "User",
        joinedAt: new Date(member.joined_at),
        role: member.role || "member",
        isOnline: member.is_online || false,
        lastSeen: member.last_seen ? new Date(member.last_seen) : new Date(),
      })) as ChatMember[];

      console.log(`👥 Loaded ${members.length} members for room ${roomId}`);
      return members;
    } catch (error: any) {
      console.error("💥 Failed to load members:", error);
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw appError;
    }
  }

  // Send a message
  async sendMessage(roomId: string, content: string, senderId: string, senderName: string): Promise<void> {
    try {
      console.log(`📤 Sending message to room ${roomId}:`, content);

      const { error } = await supabase
        .from("chat_messages_firebase")
        .insert({
          chat_room_id: roomId,
          sender_id: senderId,
          sender_name: senderName,
          content: content,
          message_type: "text",
          timestamp: new Date().toISOString(),
          is_read: false,
        });

      if (error) {
        console.error("❌ Error sending message:", error);
        throw error;
      }

      console.log("✅ Message sent successfully");
    } catch (error: any) {
      console.error("💥 Failed to send message:", error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Subscribe to messages for a room
  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    this.messageCallbacks.set(roomId, callback);

    // Load initial messages
    this.loadRoomMessages(roomId).then(callback).catch(console.error);
  }

  // Subscribe to new messages only (for immediate updates)
  subscribeToNewMessages(roomId: string, callback: (message: ChatMessage) => void) {
    const channel = this.channels.get(roomId);
    if (channel) {
      // Add a callback for individual new messages
      const existingCallback = this.messageCallbacks.get(roomId);
      this.messageCallbacks.set(roomId, (messages) => {
        if (existingCallback) existingCallback(messages);

        // Call the new message callback with the latest message
        if (messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          callback(latestMessage);
        }
      });
    }
  }

  // Subscribe to presence for a room
  subscribeToPresence(roomId: string, callback: (members: ChatMember[]) => void) {
    this.presenceCallbacks.set(roomId, callback);
  }

  // Subscribe to typing indicators for a room
  subscribeToTyping(roomId: string, callback: (typingUsers: any[]) => void) {
    this.typingCallbacks.set(roomId, callback);
  }

  // Send typing indicator
  async setTyping(roomId: string, userId: string, userName: string, isTyping: boolean) {
    const channel = this.channels.get(roomId);
    if (!channel) {
      console.warn(`No channel found for room ${roomId}`);
      return;
    }

    try {
      await channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId,
          userName,
          isTyping,
          timestamp: new Date().toISOString(),
        },
      });

      // Clear existing timeout for this user
      const timeoutKey = `${roomId}_${userId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // If user is typing, set a timeout to automatically stop typing after 3 seconds
      if (isTyping) {
        const timeout = setTimeout(() => {
          this.setTyping(roomId, userId, userName, false);
        }, 3000);
        this.typingTimeouts.set(timeoutKey, timeout);
      } else {
        this.typingTimeouts.delete(timeoutKey);
      }
    } catch (error) {
      console.error("Failed to send typing indicator:", error);
    }
  }

  // Handle new message from real-time subscription
  private handleNewMessage(roomId: string, payload: any) {
    const callback = this.messageCallbacks.get(roomId);
    if (callback && payload.new) {
      // Transform the new message to match our ChatMessage interface
      const newMessage = {
        id: payload.new.id,
        chatRoomId: payload.new.chat_room_id,
        senderId: payload.new.sender_id,
        senderName: payload.new.sender_name,
        senderAvatar: payload.new.sender_avatar,
        content: payload.new.content,
        messageType: payload.new.message_type,
        timestamp: new Date(payload.new.timestamp),
        isRead: payload.new.is_read,
        replyTo: payload.new.reply_to,
      };

      // Immediately reload messages to get the latest state
      this.loadRoomMessages(roomId).then((messages) => {
        callback(messages);
      }).catch(console.error);
    }
  }

  // Handle room updates
  private handleRoomUpdate(payload: any) {
    const callback = this.roomCallbacks.get("global");
    if (callback) {
      // Reload rooms to get the latest state
      this.getChatRooms().then(callback).catch(console.error);
    }
  }

  // Handle presence sync
  private handlePresenceSync(roomId: string) {
    try {
      const channel = this.channels.get(roomId);
      const callback = this.presenceCallbacks.get(roomId);

      if (channel && callback) {
        const presenceState = channel.presenceState();
        const members: ChatMember[] = Object.entries(presenceState).map(([key, presence]: [string, any]) => {
          const user = presence[0];
          return {
            id: key,
            chatRoomId: roomId,
            userId: user.user_id,
            userName: user.user_name,
            joinedAt: new Date(user.online_at),
            role: "member" as const,
            isOnline: true,
            lastSeen: new Date(),
          };
        });

        callback(members);
      }
    } catch (error) {
      console.error("Error in presence sync:", error);
    }
  }

  // Handle presence join
  private handlePresenceJoin(roomId: string, key: string, newPresences: any[]) {
    try {
      console.log(`👋 User ${key} joined room ${roomId}:`, newPresences);
      // Trigger presence sync to update the member list
      this.handlePresenceSync(roomId);
    } catch (error) {
      console.error("Error handling presence join:", error);
    }
  }

  // Handle presence leave
  private handlePresenceLeave(roomId: string, key: string, leftPresences: any[]) {
    try {
      console.log(`👋 User ${key} left room ${roomId}:`, leftPresences);
      // Trigger presence sync to update the member list
      this.handlePresenceSync(roomId);
    } catch (error) {
      console.error("Error handling presence leave:", error);
    }
  }

  // Handle typing events
  private handleTypingEvent(roomId: string, payload: any) {
    const callback = this.typingCallbacks.get(roomId);
    if (callback) {
      // Transform the payload to match the expected format
      const typingUser = {
        userId: payload.userId,
        userName: payload.userName,
        chatRoomId: roomId,
        isTyping: payload.isTyping,
        timestamp: new Date(payload.timestamp),
      };

      // Emit per-user delta instead of overriding all users
      // The callback should handle adding/removing individual users from the typing list
      if (payload.isTyping) {
        // User started typing - add to list
        callback([typingUser]);
      } else {
        // User stopped typing - emit empty array with user info to signal removal
        callback([{ ...typingUser, isTyping: false }]);
      }
    }
  }

  // Cleanup all subscriptions
  async cleanup() {
    console.log("🧹 Cleaning up real-time chat service");

    // Abort all pending operations
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();

    // Clear pending joins
    this.pendingJoins.clear();

    // Clear all typing timeouts
    this.typingTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.typingTimeouts.clear();

    // Unsubscribe from all channels
    for (const [, channel] of this.channels) {
      await channel.unsubscribe();
    }

    // Clear all maps
    this.channels.clear();
    this.messageCallbacks.clear();
    this.roomCallbacks.clear();
    this.presenceCallbacks.clear();
    this.typingCallbacks.clear();
    this.retryAttempts.clear();
  }
}

// Export singleton instance
export const realtimeChatService = new RealtimeChatService();
