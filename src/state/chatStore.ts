import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { ChatRoom, ChatMessage, ChatMember, TypingUser, ConnectionStatus, ChatState } from "../types";
import { enhancedRealtimeChatService } from "../services/realtimeChat";
import useAuthStore from "./authStore";
import { requireAuthentication, getUserDisplayName } from "../utils/authUtils";
import { AppError, parseSupabaseError } from "../utils/errorHandling";
import { supabase } from "../config/supabase";
import { notificationService } from "../services/notificationService";
import { storageService } from "../services/storageService";

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
  sendMessage: (roomId: string, content: string) => void;
  addMessage: (message: ChatMessage) => void;
  sendVoiceMessage: (roomId: string, audioUri: string, duration: number) => Promise<void>;
  sendMediaMessage: (roomId: string, mediaUri: string, mediaType: "image" | "video") => Promise<void>;
  markMessagesAsRead: (roomId: string) => void;
  reactToMessage: (roomId: string, messageId: string, reaction: string) => Promise<void>;
  toggleNotifications: (roomId: string) => Promise<void>;

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
          await enhancedRealtimeChatService.initialize();
          set({ connectionStatus: "connected" });
          console.log("✅ Connected to enhanced real-time chat service");
        } catch (error) {
          console.error("❌ Failed to connect to chat service:", error);
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
          console.error("❌ Error during disconnect:", error);
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
          console.error("💥 Failed to load chat rooms:", error);
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

          // Subscribe to messages for this room - CRITICAL: Messages are sorted newest-first for FlashList inverted display
          enhancedRealtimeChatService.subscribeToMessages(
            roomId,
            (newMessages: ChatMessage[], isInitialLoad = false) => {
              console.log(
                `🔍 Received ${newMessages.length} ${isInitialLoad ? "initial" : "new"} messages for room ${roomId}`,
              );

              set((state) => {
                let allMessages: ChatMessage[];

                if (isInitialLoad) {
                  // For initial load, replace all messages
                  allMessages = [...newMessages];
                } else {
                  // For new messages, add to existing ones with enhanced duplicate detection
                  const existingMessages = state.messages[roomId] || [];
                  allMessages = [...existingMessages];

                  newMessages.forEach((newMsg) => {
                    // Enhanced duplicate detection: check by ID first, then by content/sender/time similarity
                    const isDuplicateById = allMessages.some((existing) => existing.id === newMsg.id);

                    if (!isDuplicateById) {
                      // Check for potential optimistic message duplicates (same content, sender, within 5 seconds)
                      const isDuplicateByContent = allMessages.some(
                        (existing) =>
                          existing.senderId === newMsg.senderId &&
                          existing.content === newMsg.content &&
                          Math.abs(new Date(existing.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) <
                            5000,
                      );

                      if (!isDuplicateByContent) {
                        allMessages.push(newMsg);
                      } else {
                        console.log(`🔄 Duplicate message detected by content/time similarity, skipping`);

                        // Remove the optimistic message and replace with the real one
                        const optimisticIndex = allMessages.findIndex(
                          (existing) =>
                            existing.senderId === newMsg.senderId &&
                            existing.content === newMsg.content &&
                            Math.abs(new Date(existing.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) <
                              5000,
                        );

                        if (optimisticIndex !== -1) {
                          allMessages[optimisticIndex] = newMsg; // Replace optimistic with real message
                          console.log(`🔄 Replaced optimistic message with real message`);
                        }
                      }
                    }
                  });
                }

                // Sort messages newest-first for proper FlashList inverted display
                const sortedMessages = allMessages.sort(
                  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                );

                return {
                  messages: {
                    ...state.messages,
                    [roomId]: sortedMessages,
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
          console.error("💥 Failed to join chat room:", error);
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
          console.error("💥 Failed to load messages:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
          });
          throw appError;
        }
      },

      sendMessage: async (roomId: string, content: string) => {
        let optimisticMessageId: string | null = null;

        try {
          console.log(`📤 Sending message to room ${roomId}:`, content);

          // Use unified authentication
          const { user } = await requireAuthentication("send messages");
          const senderName = getUserDisplayName(user);

          // Optimistic update - add message locally first
          const optimisticMessage: ChatMessage = {
            id: uuidv4(),
            chatRoomId: roomId,
            senderId: user.id,
            senderName,
            content,
            messageType: "text",
            timestamp: new Date(),
            isRead: true,
            isOwn: true,
          };

          optimisticMessageId = optimisticMessage.id;
          get().addMessage(optimisticMessage);

          // Send to Supabase via enhanced real-time service
          await enhancedRealtimeChatService.sendMessage(roomId, content, user.id, senderName);

          console.log("✅ Message sent successfully");
        } catch (error) {
          console.error("💥 Failed to send message:", error);

          // Remove the optimistic message on error if it was created
          if (optimisticMessageId) {
            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: (state.messages[roomId] || []).filter((msg) => msg.id !== optimisticMessageId),
              },
            }));
          }

          throw error;
        }
      },

      addMessage: (message: ChatMessage) => {
        set((state) => {
          const roomMessages = state.messages[message.chatRoomId] || [];

          // Check if message already exists to avoid duplicates
          const messageExists = roomMessages.some((msg) => msg.id === message.id);
          if (messageExists) {
            return state;
          }

          // CRITICAL: Sort newest-first for FlashList inverted display
          return {
            messages: {
              ...state.messages,
              [message.chatRoomId]: [...roomMessages, message].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
              ),
            },
          };
        });
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
          console.error("💥 Failed to send voice message:", error);
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
          console.error("💥 Failed to send media message:", error);
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
          console.error("💥 Failed to toggle notifications:", error);
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
        try {
          const { user } = await requireAuthentication("react to messages");
          await enhancedRealtimeChatService.sendReaction(roomId, messageId, user.id, reaction);
        } catch (error) {
          console.error("💥 Failed to send reaction:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      // Typing indicators
      setTyping: (roomId: string, isTyping: boolean) => {
        const { user } = useAuthStore.getState();
        if (user) {
          enhancedRealtimeChatService.setTyping(roomId, user.id, user.email || "Anonymous", isTyping);
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

          // Get the oldest message timestamp for cursor-based pagination
          const oldestMessage = currentMessages[0]!;
          const cursor = oldestMessage.timestamp.toISOString();

          // Load older messages using enhanced service with cursor
          const olderMessages = await enhancedRealtimeChatService.loadOlderMessages(roomId, cursor, 20);

          if (olderMessages.length > 0) {
            // Merge messages and deduplicate by ID
            const allMessages = [...olderMessages, ...currentMessages];
            const uniqueMessages = Array.from(new Map(allMessages.map((msg) => [msg.id, msg])).values()).sort(
              // FIXED: Sort descending for FlashList inverted display
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
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
          console.error("Failed to load older messages:", error);
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
          console.error("💥 Failed to load members:", error);
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
        } catch (error) {
          console.error("Failed to cleanup chat store:", error);
        }
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data, not real-time state
      partialize: (state) => ({
        chatRooms: state.chatRooms,
        messages: state.messages,
        members: state.members,
        roomCategoryFilter: (state as any).roomCategoryFilter,
      }),
    },
  ),
);
export default useChatStore;
