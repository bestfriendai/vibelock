import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { ChatRoom, ChatMessage, ChatMember, TypingUser, ConnectionStatus, ChatState } from "../types";
import { enhancedRealtimeChatService } from "../services/realtimeChat";
import useAuthStore from "./authStore";
import { requireAuthentication, getUserDisplayName } from "../utils/authUtils";
import { AppError, parseSupabaseError, retryWithBackoff, ErrorType } from "../utils/errorHandling";
import { supabase } from "../config/supabase";
import { notificationService } from "../services/notificationService";
import { storageService } from "../services/storageService";
import NetInfo from "@react-native-community/netinfo";

// Constants for data limits
const MAX_PERSISTED_MESSAGES_PER_ROOM = 50;
const MAX_PERSISTED_MEMBERS_PER_ROOM = 100;

// Sanitize messages for persistence - remove sensitive content
const sanitizeMessagesForPersistence = (messages: { [roomId: string]: ChatMessage[] }): { [roomId: string]: ChatMessage[] } => {
  const sanitized: { [roomId: string]: ChatMessage[] } = {};

  Object.entries(messages).forEach(([roomId, roomMessages]) => {
    // Limit number of messages per room
    const limitedMessages = roomMessages.slice(0, MAX_PERSISTED_MESSAGES_PER_ROOM);

    sanitized[roomId] = limitedMessages.map(msg => ({
      ...msg,
      // Remove sensitive media URIs
      audioUri: undefined,
      imageUri: undefined,
      videoUri: undefined,
      // Keep only essential metadata
      content: msg.messageType === 'text' ? msg.content.substring(0, 100) : '[Media]',
      // Anonymize sender info
      senderName: msg.senderName ? msg.senderName.substring(0, 1) + '***' : 'Anonymous',
    }));
  });

  return sanitized;
};

// Sanitize members for persistence - remove detailed member information
const sanitizeMembersForPersistence = (members: { [roomId: string]: ChatMember[] }): { [roomId: string]: ChatMember[] } => {
  const sanitized: { [roomId: string]: ChatMember[] } = {};

  Object.entries(members).forEach(([roomId, roomMembers]) => {
    // Limit number of members per room
    const limitedMembers = roomMembers.slice(0, MAX_PERSISTED_MEMBERS_PER_ROOM);

    sanitized[roomId] = limitedMembers.map(member => ({
      ...member,
      // Remove sensitive member data - use userName field
      userName: member.userName ? member.userName.substring(0, 1) + '***' : 'Anonymous',
      userAvatar: undefined, // Remove avatar URLs
      // Keep only essential fields
      userId: member.userId,
      chatRoomId: member.chatRoomId,
      joinedAt: member.joinedAt,
      isOnline: false, // Don't persist online status
    }));
  });

  return sanitized;
};

interface ChatActions {
  // Connection management
  connect: (userId: string) => void;
  disconnect: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Chat rooms
  loadChatRooms: () => Promise<void>;
  setRoomCategoryFilter: (category: "all" | "men" | "women" | "lgbtq+") => void;
  joinChatRoom: (roomId: string) => Promise<void>;
  leaveChatRoom: (roomId: string) => void;
  setCurrentChatRoom: (room: ChatRoom | null) => void;

  // Messages
  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, replyTo?: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessageStatus: (
    roomId: string,
    messageId: string,
    status: "pending" | "sent" | "delivered" | "read" | "failed",
  ) => void;
  sendVoiceMessage: (roomId: string, audioUri: string, duration: number) => Promise<void>;
  sendMediaMessage: (roomId: string, mediaUri: string, mediaType: "image" | "video") => Promise<void>;
  markMessagesAsRead: (roomId: string) => void;
  reactToMessage: (roomId: string, messageId: string, reaction: string) => Promise<void>;
  toggleNotifications: (roomId: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;

  // Typing indicators
  setTyping: (roomId: string, isTyping: boolean) => void;
  addTypingUser: (typingUser: TypingUser) => void;
  removeTypingUser: (userId: string, roomId: string) => void;

  // Online status
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;

  // Cleanup
  cleanup: () => Promise<void>;

  // Members
  loadMembers: (roomId: string) => Promise<void>;
  addMember: (member: ChatMember) => void;
  removeMember: (userId: string, roomId: string) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;

  // Pagination
  loadOlderMessages: (roomId: string) => Promise<void>;
}

type ChatStore = ChatState & ChatActions;

// Mock data removed - using real Supabase data only

let netUnsubscribe: (() => void) | null = null;

const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state - Start with empty array to force loading from Supabase
      chatRooms: [],
      roomCategoryFilter: "all",
      currentChatRoom: null,
      messages: {},
      members: {},
      typingUsers: [],
      onlineUsers: [],
      connectionStatus: "disconnected",
      isLoading: false,
      error: null,

      // Connection management
      connect: async (userId: string) => {
        try {
          console.log("🚀 Connecting to enhanced real-time chat service...");
          set({ connectionStatus: "connecting" });

          // Set up network monitoring once
          if (!netUnsubscribe) {
            netUnsubscribe = NetInfo.addEventListener(async (state) => {
              const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
              set({ connectionStatus: online ? "connected" : "disconnected" });
              if (online && enhancedRealtimeChatService.getActiveChannelsCount() >= 0) {
                try {
                  await enhancedRealtimeChatService.initialize();
                  set({ connectionStatus: "connected" });
                } catch (e) {
                  console.warn("Reconnect initialize failed:", e);
                  set({ connectionStatus: "error" as ConnectionStatus });
                }
              }
            });
          }

          await enhancedRealtimeChatService.initialize();
          set({ connectionStatus: "connected" });
          console.log("✅ Connected to enhanced real-time chat service");
        } catch (error) {
          console.warn("❌ Failed to connect to chat service:", error);
          set({
            connectionStatus: "disconnected",
            error: "Failed to connect to chat service",
          });
        }
      },

      disconnect: async () => {
        try {
          await enhancedRealtimeChatService.cleanup();
          set({ connectionStatus: "disconnected" });
          console.log("👋 Disconnected from chat service");
        } catch (error) {
          console.warn("❌ Error during disconnect:", error);
        }
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      // Chat rooms
      loadChatRooms: async () => {
        try {
          set({ isLoading: true, error: null });

          console.log("🔄 Loading chat rooms...");

          // Load chat rooms directly from Supabase
          const { data: chatRooms, error } = await supabase
            .from("chat_rooms_firebase")
            .select(
              `
              id,
              name,
              description,
              type,
              category,
              member_count,
              online_count,
              unread_count,
              last_activity,
              is_active,
              location,
              created_at,
              updated_at
            `,
            )
            .eq("is_active", true)
            .order("last_activity", { ascending: false });

          if (error) throw error;

          const formattedRooms: ChatRoom[] = (chatRooms || []).map((room: any) => ({
            id: room.id,
            name: room.name,
            description: room.description,
            type: room.type,
            category: room.category,
            memberCount: room.member_count || 0,
            onlineCount: room.online_count || 0,
            unreadCount: room.unread_count || 0,
            lastActivity: new Date(room.last_activity),
            isActive: room.is_active,
            location: room.location,
            createdAt: new Date(room.created_at),
            updatedAt: new Date(room.updated_at),
          }));

          // Apply category filter if set
          const category = get().roomCategoryFilter || "all";
          const filteredRooms =
            category && category !== "all"
              ? formattedRooms.filter((r: ChatRoom) => (r.category || "all").toLowerCase() === category.toLowerCase())
              : formattedRooms;

          console.log(`✅ Loaded ${filteredRooms.length} chat rooms (filtered by: ${category})`);

          set({
            chatRooms: filteredRooms,
            isLoading: false,
          });
        } catch (error) {
          console.warn("💥 Failed to load chat rooms:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          set({
            chatRooms: [],
            error: appError.userMessage,
            isLoading: false,
          });

          throw appError;
        }
      },

      setRoomCategoryFilter: (category) => {
        set({ roomCategoryFilter: category });
      },

      joinChatRoom: async (roomId: string) => {
        try {
          console.log(`🚪 Joining chat room: ${roomId}`);

          const room = get().chatRooms.find((r) => r.id === roomId);
          if (!room) {
            throw new Error("Chat room not found");
          }

          set({ currentChatRoom: room });

          // Use unified authentication check
          const { user, supabaseUser } = await requireAuthentication("join chat room");
          // Join room with enhanced real-time service
          await enhancedRealtimeChatService.joinRoom(roomId, supabaseUser.id, getUserDisplayName(user));

          // Subscribe to messages with simplified deduplication (trust service)
          enhancedRealtimeChatService.subscribeToMessages(
            roomId,
            (newMessages: ChatMessage[], isInitialLoad = false) => {
              console.log(
                `🔍 Received ${newMessages.length} ${isInitialLoad ? "initial" : "new"} messages for room ${roomId}`,
              );

              set((state) => {
                let allMessages: ChatMessage[];

                if (isInitialLoad) {
                  // Service now returns ascending (oldest->newest)
                  allMessages = [...newMessages];
                } else {
                  // Merge new messages into existing (keep ascending order)
                  const existingMessages = state.messages[roomId] || [];
                  allMessages = [...existingMessages];

                  newMessages.forEach((newMsg: any) => {
                    if (newMsg.isReplacement) {
                      const optimisticPrefix = "optimistic_";
                      const optimisticIndex = allMessages.findIndex(
                        (msg) =>
                          msg.id.startsWith(optimisticPrefix) &&
                          msg.senderId === newMsg.senderId &&
                          msg.content === newMsg.content,
                      );

                      if (optimisticIndex !== -1) {
                        allMessages[optimisticIndex] = { ...newMsg, status: newMsg.isRead ? "read" : "sent" } as any;
                      } else {
                        const isDuplicate = allMessages.some((msg) => msg.id === newMsg.id);
                        if (!isDuplicate) {
                          allMessages.push({ ...newMsg, status: newMsg.isRead ? "read" : "sent" } as any);
                        }
                      }
                    } else {
                      const existingIndex = allMessages.findIndex((m) => m.id === newMsg.id);
                      if (existingIndex !== -1) {
                        allMessages[existingIndex] = { ...allMessages[existingIndex], ...newMsg } as any;
                      } else {
                        allMessages.push(newMsg);
                      }
                    }
                  });
                }

                // Keep ascending order for display (oldest->newest)
                if (isInitialLoad || newMessages.length > 0) {
                  allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                }

                return {
                  messages: {
                    ...state.messages,
                    [roomId]: allMessages,
                  },
                };
              });
            },
          );

          // Subscribe to presence for this room
          enhancedRealtimeChatService.subscribeToPresence(roomId, (members: ChatMember[]) => {
            set((state) => ({
              members: {
                ...state.members,
                [roomId]: members,
              },
            }));
          });

          // Subscribe to typing indicators for this room
          enhancedRealtimeChatService.subscribeToTyping(roomId, (typingUsers: any[]) => {
            set(() => ({
              typingUsers: typingUsers.filter((user) => user.timestamp > 0), // Only active typing users
            }));
          });

          console.log(`✅ Successfully joined room: ${room.name}`);
        } catch (error) {
          console.warn("💥 Failed to join chat room:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      leaveChatRoom: async (roomId: string) => {
        console.log(`🚪 Leaving chat room: ${roomId}`);

        await enhancedRealtimeChatService.leaveRoom(roomId);

        const currentRoom = get().currentChatRoom;
        if (currentRoom && currentRoom.id === roomId) {
          set({ currentChatRoom: null });
        }

        // Clean up local state
        set((state) => {
          const newMessages = { ...state.messages };
          const newMembers = { ...state.members };
          delete newMessages[roomId];
          delete newMembers[roomId];

          return {
            messages: newMessages,
            members: newMembers,
          };
        });
      },

      setCurrentChatRoom: (room: ChatRoom | null) => {
        set({ currentChatRoom: room });
      },

      // Messages
      loadMessages: async (roomId: string) => {
        try {
          set({ isLoading: true });

          console.log(`📨 Loading messages for room ${roomId}...`);

          // Load messages using enhanced service - they come pre-sorted newest-first
          await enhancedRealtimeChatService.loadInitialMessages(roomId, 50);

          set({ isLoading: false });

          console.log(`📨 Loaded messages for room ${roomId}`);
        } catch (error) {
          console.warn("💥 Failed to load messages:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
          });
          throw appError;
        }
      },

      sendMessage: async (roomId: string, content: string, replyTo?: string) => {
        let optimisticMessageId: string | null = null;

        try {
          console.log(`📤 Sending message to room ${roomId}:`, content);

          // Use unified authentication
          const { user } = await requireAuthentication("send messages");
          const senderName = getUserDisplayName(user);

          // Validation and early return
          if (!content || content.trim().length === 0) {
            return;
          }

          // Create optimistic message with predictable ID
          const timestamp = Date.now();
          optimisticMessageId = `optimistic_${timestamp}_${user.id}`;

          const optimisticMessage: ChatMessage = {
            id: optimisticMessageId,
            chatRoomId: roomId,
            senderId: user.id,
            senderName,
            content,
            messageType: "text",
            timestamp: new Date(timestamp),
            isRead: false,
            status: "pending",
            isOwn: true,
            isOptimistic: true, // Mark as optimistic
            replyTo,
          } as ChatMessage;

          // Track optimistic message in service
          enhancedRealtimeChatService.trackOptimisticMessage(roomId, optimisticMessage);

          // Add optimistic message locally
          get().addMessage(optimisticMessage);

          // Send to Supabase via enhanced real-time service (with retry)
          await retryWithBackoff(
            () => enhancedRealtimeChatService.sendMessage(roomId, content, user.id, senderName, "text", replyTo),
            3,
            800,
            (err) => err.type === ErrorType.NETWORK || err.retryable,
          );

          console.log("✅ Message sent successfully");
        } catch (error) {
          console.warn("💥 Failed to send message:", error);

          // Mark the optimistic message as failed on error
          if (optimisticMessageId) {
            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: (state.messages[roomId] || []).map((msg) =>
                  msg.id === optimisticMessageId ? ({ ...msg, status: "failed" } as any) : msg,
                ),
              },
            }));
          }

          throw error;
        }
      },

      addMessage: (message: ChatMessage) => {
        set((state) => {
          const roomMessages = state.messages[message.chatRoomId] || [];

          // Simple duplicate check by ID (trust service for complex deduplication)
          const messageExists = roomMessages.some((msg) => msg.id === message.id);
          if (messageExists) {
            return state;
          }

          // Add message and sort only if needed
          const updatedMessages = [...roomMessages, message];

          // Keep ascending order (oldest -> newest)
          updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          return {
            messages: {
              ...state.messages,
              [message.chatRoomId]: updatedMessages,
            },
          };
        });
      },

      updateMessageStatus: (
        roomId: string,
        messageId: string,
        status: "pending" | "sent" | "delivered" | "read" | "failed",
      ) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((m) => (m.id === messageId ? ({ ...m, status } as any) : m)),
          },
        }));
      },

      sendVoiceMessage: async (roomId: string, audioUri: string, duration: number) => {
        try {
          const { user } = await requireAuthentication("send voice messages");
          const senderName = getUserDisplayName(user);

          // Upload audio file to storage
          const uploadResult = await storageService.uploadFile(audioUri, {
            bucket: storageService.getBuckets().CHAT_MEDIA,
            folder: `${user.id}/${roomId}/audio`,
            contentType: "audio/mp3",
          });

          if (!uploadResult.success || !uploadResult.url) {
            throw new Error("Failed to upload voice message");
          }

          const message: Partial<ChatMessage> = {
            chatRoomId: roomId,
            senderId: user.id,
            senderName,
            messageType: "voice",
            audioUri: uploadResult.url,
            audioDuration: duration,
            timestamp: new Date(),
          };

          get().addMessage(message as ChatMessage);
          await enhancedRealtimeChatService.sendMessage(
            roomId,
            "",
            user.id,
            senderName,
            "voice",
            undefined,
            uploadResult.url,
            duration,
          );
        } catch (error) {
          console.warn("💥 Failed to send voice message:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      sendMediaMessage: async (roomId: string, mediaUri: string, mediaType: "image" | "video") => {
        try {
          const { user } = await requireAuthentication("send media messages");
          const senderName = getUserDisplayName(user);

          // Compress image if needed
          let finalUri = mediaUri;
          if (mediaType === "image") {
            finalUri = await storageService.compressImage(mediaUri, 0.7);
          }

          // Upload media file to storage
          const uploadResult = await storageService.uploadChatMedia(finalUri, user.id, roomId);

          if (!uploadResult.success || !uploadResult.url) {
            throw new Error("Failed to upload media");
          }

          const baseMessage: Partial<ChatMessage> = {
            chatRoomId: roomId,
            senderId: user.id,
            senderName,
            messageType: mediaType,
            timestamp: new Date(),
          };
          if (mediaType === "image") (baseMessage as any).imageUri = uploadResult.url;
          if (mediaType === "video") (baseMessage as any).videoUri = uploadResult.url;
          const message = baseMessage;

          get().addMessage(message as ChatMessage);
          await enhancedRealtimeChatService.sendMessage(
            roomId,
            "",
            user.id,
            senderName,
            mediaType,
            undefined,
            uploadResult.url,
          );
        } catch (error) {
          console.warn("💥 Failed to send media message:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      toggleNotifications: async (roomId: string) => {
        try {
          await requireAuthentication("toggle notifications");
          await notificationService.toggleChatRoomSubscription(roomId);
        } catch (error) {
          console.warn("💥 Failed to toggle notifications:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      markMessagesAsRead: (roomId: string) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((msg) => ({
              ...msg,
              isRead: true,
            })),
          },
        }));
      },

      reactToMessage: async (roomId: string, messageId: string, reaction: string) => {
        let reverted = false;
        try {
          const { user } = await requireAuthentication("react to messages");
          const userId = user.id;

          // Optimistic local update (assumes raw reactions array shape [{ user_id, emoji }])
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map((m) => {
                if (m.id !== messageId) return m;
                const raw = ((m as any).reactions || []) as any[];
                const idx = raw.findIndex((r) => (r.user_id || r.userId) === userId && r.emoji === reaction);
                let next: any[];
                if (idx > -1) {
                  next = raw.slice(0, idx).concat(raw.slice(idx + 1));
                } else {
                  next = raw.concat([{ user_id: userId, emoji: reaction }]);
                }
                return { ...m, reactions: next } as any;
              }),
            },
          }));

          await enhancedRealtimeChatService.sendReaction(roomId, messageId, userId, reaction);
        } catch (error) {
          // Revert optimistic change by reloading from service on next update
          reverted = true;
          console.warn("💥 Failed to send reaction:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          // Optionally reload or mark for refresh
          throw appError;
        } finally {
          if (reverted) {
            // No-op: the realtime update stream will reconcile
          }
        }
      },

      deleteMessage: async (roomId: string, messageId: string) => {
        // Follow async action pattern with optimistic UI and rollback on error
        const prevMessages = get().messages[roomId] || [];
        let didOptimisticallyRemove = false;
        try {
          await requireAuthentication("delete messages");

          // Optimistically remove from UI
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).filter((m) => m.id !== messageId),
            },
          }));
          didOptimisticallyRemove = true;

          const { error } = await supabase
            .from("chat_messages_firebase")
            .update({ is_deleted: true })
            .eq("id", messageId)
            .eq("chat_room_id", roomId);

          if (error) {
            throw error;
          }
        } catch (error) {
          console.warn("💥 Failed to delete message:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          // Rollback optimistic removal
          if (didOptimisticallyRemove) {
            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: prevMessages,
              },
            }));
          }
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      // Typing indicators with improved handling
      setTyping: (roomId: string, isTyping: boolean) => {
        const { user } = useAuthStore.getState();
        if (user) {
          // Debounced typing is handled in the service
          enhancedRealtimeChatService.setTyping(roomId, user.id, getUserDisplayName(user), isTyping);
        }
      },

      // Pagination
      loadOlderMessages: async (roomId: string) => {
        try {
          set({ isLoading: true });

          const currentMessages = get().messages[roomId] || [];
          if (currentMessages.length === 0) {
            set({ isLoading: false });
            return;
          }

          // Get the oldest loaded message (ascending array => index 0)
          const oldestMessage = currentMessages[0]!;
          const cursor = oldestMessage.timestamp.toISOString();

          // Load older messages using enhanced service with cursor
          const olderMessages = await enhancedRealtimeChatService.loadOlderMessages(roomId, cursor, 20);

          if (olderMessages.length > 0) {
            // Prepend older messages and keep ascending order
            const combined = [...olderMessages, ...currentMessages];
            const messageMap = new Map(combined.map((msg) => [msg.id, msg]));
            const uniqueMessages = Array.from(messageMap.values()).sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            );

            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: uniqueMessages,
              },
              isLoading: false,
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn("Failed to load older messages:", error);
          set({
            isLoading: false,
            error: "Failed to load older messages",
          });
        }
      },

      addTypingUser: (typingUser: TypingUser) => {
        set((state) => ({
          typingUsers: [
            ...state.typingUsers.filter(
              (u) => u.userId !== typingUser.userId || u.chatRoomId !== typingUser.chatRoomId,
            ),
            typingUser,
          ],
        }));

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          get().removeTypingUser(typingUser.userId, typingUser.chatRoomId);
        }, 3000);
      },

      removeTypingUser: (userId: string, roomId: string) => {
        set((state) => ({
          typingUsers: state.typingUsers.filter((u) => u.userId !== userId || u.chatRoomId !== roomId),
        }));
      },

      // Online status
      setOnlineUsers: (userIds: string[]) => {
        set({ onlineUsers: userIds });
      },

      addOnlineUser: (userId: string) => {
        set((state) => ({
          onlineUsers: [...new Set([...state.onlineUsers, userId])],
        }));
      },

      removeOnlineUser: (userId: string) => {
        set((state) => ({
          onlineUsers: state.onlineUsers.filter((id) => id !== userId),
        }));
      },

      // Members
      loadMembers: async (roomId: string) => {
        try {
          set({ isLoading: true });
          console.log(`👥 Loading members for room ${roomId}...`);

          // Load members directly from Supabase
          const { data: members, error } = await supabase
            .from("chat_members_firebase")
            .select("*")
            .eq("chat_room_id", roomId);

          if (error) throw error;

          set((state) => ({
            members: {
              ...state.members,
              [roomId]: members,
            },
            isLoading: false,
          }));

          console.log(`👥 Loaded ${members.length} members for room ${roomId}`);
        } catch (error) {
          console.warn("💥 Failed to load members:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
          });
          throw appError;
        }
      },

      addMember: (member: ChatMember) => {
        set((state) => ({
          members: {
            ...state.members,
            [member.chatRoomId]: [...(state.members[member.chatRoomId] || []), member],
          },
        }));
      },

      removeMember: (userId: string, roomId: string) => {
        set((state) => ({
          members: {
            ...state.members,
            [roomId]: (state.members[roomId] || []).filter((m) => m.userId !== userId),
          },
        }));
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Real-time message listening is now handled by enhanced service in joinChatRoom

      // Cleanup all subscriptions and connections
      cleanup: async () => {
        try {
          await enhancedRealtimeChatService.cleanup();
          set({
            connectionStatus: "disconnected",
            currentChatRoom: null,
            typingUsers: [],
            onlineUsers: [],
            error: null,
          });
          if (netUnsubscribe) {
            netUnsubscribe();
            netUnsubscribe = null;
          }
        } catch (error) {
          console.warn("Failed to cleanup chat store:", error);
        }
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist sanitized essential data, not real-time state
      partialize: (state) => ({
        chatRooms: state.chatRooms,
        messages: sanitizeMessagesForPersistence(state.messages),
        members: sanitizeMembersForPersistence(state.members),
        roomCategoryFilter: (state as any).roomCategoryFilter,
      }),
      // Add version for future migrations
      version: 1,
      migrate: (persistedState: any, _version: number) => {
        try {
          const ps = persistedState || {};
          return {
            chatRooms: Array.isArray(ps.chatRooms) ? ps.chatRooms : [],
            messages: ps.messages ?? {},
            members: ps.members ?? {},
            roomCategoryFilter: ps.roomCategoryFilter ?? "all",
          };
        } catch {
          return { chatRooms: [], messages: {}, members: {}, roomCategoryFilter: "all" };
        }
      },
      // Add data cleanup on hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.messages) {
          // Clean up old persisted data periodically
          const now = Date.now();
          const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

          // Remove messages older than a week
          Object.keys(state.messages).forEach((roomId) => {
            if (state.messages[roomId]) {
              state.messages[roomId] = state.messages[roomId].filter((msg) => {
                return new Date(msg.timestamp).getTime() > oneWeekAgo;
              });
            }
          });

          if (__DEV__) {
            console.log("🧹 Chat store: Cleaned up old persisted data");
          }
        }
      },
    },
  ),
);
export default useChatStore;
