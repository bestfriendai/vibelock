import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, ChatMessage, ChatMember, TypingUser, ConnectionStatus, ChatState } from "../types";
import { webSocketService } from "../services/websocketService";
import { supabaseChat } from "../services/supabase";
import { realtimeChatService } from "../services/realtimeChat";
import useAuthStore from "./authStore";
import { requireAuthentication, getUserDisplayName } from "../utils/authUtils";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

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
  markMessagesAsRead: (roomId: string) => void;
  startListeningToMessages: (roomId: string) => () => void;

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
      connect: (userId: string) => {
        const callbacks = {
          onMessage: (message: ChatMessage) => {
            get().addMessage(message);
          },
          onTyping: (typingUser: TypingUser) => {
            get().addTypingUser(typingUser);
          },
          onUserJoin: (_userId: string, userName: string, chatRoomId: string) => {
            // Handle user join
            console.log(`${userName} joined ${chatRoomId}`);
          },
          onUserLeave: (userId: string, chatRoomId: string) => {
            // Handle user leave
            console.log(`User ${userId} left ${chatRoomId}`);
          },
          onOnlineStatusChange: (onlineUsers: string[]) => {
            get().setOnlineUsers(onlineUsers);
          },
          onConnectionStatusChange: (status: ConnectionStatus) => {
            get().setConnectionStatus(status);
          },
          onError: (error: string) => {
            get().setError(error);
          },
        };

        webSocketService.connect(userId, callbacks);
      },

      disconnect: () => {
        webSocketService.disconnect();
        set({ connectionStatus: "disconnected" });
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      // Chat rooms
      loadChatRooms: async () => {
        try {
          set({ isLoading: true, error: null });

          console.log("🔄 Loading chat rooms...");

          // Initialize real-time service if not already done
          await realtimeChatService.initialize();

          // Load chat rooms from Supabase with real-time
          const chatRooms = await realtimeChatService.getChatRooms();

          // Apply category filter if set
          const category = get().roomCategoryFilter || "all";
          const filteredRooms =
            category && category !== "all"
              ? chatRooms.filter((r: ChatRoom) => (r.category || "all").toLowerCase() === category.toLowerCase())
              : chatRooms;

          console.log(`✅ Loaded ${filteredRooms.length} chat rooms (filtered by: ${category})`);

          set({
            chatRooms: filteredRooms,
            isLoading: false,
          });

          // Subscribe to real-time room updates
          realtimeChatService.subscribeToRooms((updatedRooms) => {
            const currentCategory = get().roomCategoryFilter || "all";
            const filtered =
              currentCategory && currentCategory !== "all"
                ? updatedRooms.filter(
                    (r: ChatRoom) => (r.category || "all").toLowerCase() === currentCategory.toLowerCase(),
                  )
                : updatedRooms;

            set({ chatRooms: filtered });
          });
        } catch (error) {
          console.error("💥 Failed to load chat rooms:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          set({
            chatRooms: [],
            error: appError.userMessage,
            isLoading: false,
          });

          // Don't fallback to mock data - show proper error state
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

          // Join room with real-time service
          await realtimeChatService.joinRoom(roomId, supabaseUser.id, getUserDisplayName(user));

          // Subscribe to messages for this room
          realtimeChatService.subscribeToMessages(roomId, (messages) => {
            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: messages,
              },
            }));
          });

          // Subscribe to presence for this room
          realtimeChatService.subscribeToPresence(roomId, (members) => {
            set((state) => ({
              members: {
                ...state.members,
                [roomId]: members,
              },
            }));
          });

          // Subscribe to typing indicators for this room
          realtimeChatService.subscribeToTyping(roomId, (typingUsers) => {
            set(() => ({
              typingUsers: typingUsers.filter((user) => user.chatRoomId === roomId),
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

        await realtimeChatService.leaveRoom(roomId);
        await realtimeChatService.cleanupRoom(roomId);

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

          // Load messages from Supabase via real-time service
          const messages = await realtimeChatService.loadRoomMessages(roomId);

          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: messages,
            },
            isLoading: false,
          }));

          console.log(`📨 Loaded ${messages.length} messages for room ${roomId}`);
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

          // Send to Supabase via real-time service
          await realtimeChatService.sendMessage(roomId, content, user.id, senderName);

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

          return {
            messages: {
              ...state.messages,
              [message.chatRoomId]: [...roomMessages, message].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
              ),
            },
          };
        });
      },

      // Add message immediately for real-time updates
      addMessageImmediate: (message: ChatMessage) => {
        set((state) => {
          const roomMessages = state.messages[message.chatRoomId] || [];

          // Check if message already exists to avoid duplicates
          const messageExists = roomMessages.some((msg) => msg.id === message.id);
          if (messageExists) {
            return state;
          }

          return {
            messages: {
              ...state.messages,
              [message.chatRoomId]: [...roomMessages, message].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
              ),
            },
          };
        });
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

      // Typing indicators
      setTyping: (roomId: string, isTyping: boolean) => {
        const { user } = useAuthStore.getState();
        if (user) {
          realtimeChatService.setTyping(roomId, user.id, user.email || "Anonymous", isTyping);
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
          const oldestMessage = currentMessages[0];
          const cursor = oldestMessage.timestamp.toISOString();

          // Load older messages using realtimeChatService with cursor
          const olderMessages = await realtimeChatService.loadRoomMessages(roomId, cursor, 20);

          if (olderMessages.length > 0) {
            // Merge messages and deduplicate by ID
            const allMessages = [...olderMessages, ...currentMessages];
            const uniqueMessages = Array.from(
              new Map(allMessages.map(msg => [msg.id, msg])).values()
            ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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

          // Load members from Supabase
          const members = await realtimeChatService.getRoomMembers(roomId);

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

      // Supabase real-time message listener
      startListeningToMessages: (roomId: string) => {
        return supabaseChat.onMessagesSnapshot(roomId, (messages: ChatMessage[]) => {
          try {
            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: messages,
              },
            }));
          } catch (error) {
            console.error("Subscription update error:", error);
            const appError = error instanceof AppError ? error : parseSupabaseError(error);
            set({ error: appError.userMessage });
          }
        });
      },

      // Cleanup all subscriptions and connections
      cleanup: async () => {
        try {
          await realtimeChatService.cleanup();
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
