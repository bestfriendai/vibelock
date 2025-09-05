import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatRoom, ChatMessage, ChatMember, TypingUser, ConnectionStatus, ChatState } from "../types";
import { webSocketService } from "../services/websocketService";
import { supabaseChat, supabaseAuth } from "../services/supabase";
import { realtimeChatService } from "../services/realtimeChat";

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

  // Members
  loadMembers: (roomId: string) => Promise<void>;
  addMember: (member: ChatMember) => void;
  removeMember: (userId: string, roomId: string) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type ChatStore = ChatState & ChatActions;

// Mock data for development - using actual database UUIDs
const mockChatRooms: ChatRoom[] = [
  {
    id: "86250edc-5520-48da-b9cd-0c28982b6148",
    name: "Washington DC Local",
    description: "Connect with singles in the Washington DC area",
    type: "local",
    category: "all",
    memberCount: 127,
    onlineCount: 23,
    lastMessage: {
      id: "msg_1",
      chatRoomId: "86250edc-5520-48da-b9cd-0c28982b6148",
      senderId: "user_456",
      senderName: "Sarah M.",
      content: "Anyone been to that new rooftop bar in Adams Morgan?",
      messageType: "text",
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      isRead: false,
    },
    lastActivity: new Date(Date.now() - 300000),
    isActive: true,
    location: { city: "Washington", state: "DC" },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "694c3b9c-1079-4cf5-a9cb-b06e8715a804",
    name: "Dating Tips & Advice",
    description: "Share and get advice on dating, relationships, and meeting people",
    type: "topic",
    category: "all",
    memberCount: 89,
    onlineCount: 15,
    lastMessage: {
      id: "msg_2",
      chatRoomId: "694c3b9c-1079-4cf5-a9cb-b06e8715a804",
      senderId: "user_789",
      senderName: "Mike R.",
      content: "What's everyone's take on first date locations?",
      messageType: "text",
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      isRead: false,
    },
    lastActivity: new Date(Date.now() - 900000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "f47b5109-bd62-468c-b024-d40b11ea78c2",
    name: "Success Stories",
    description: "Share your dating success stories and celebrate wins",
    type: "topic",
    category: "all",
    memberCount: 156,
    onlineCount: 31,
    lastMessage: {
      id: "msg_3",
      chatRoomId: "f47b5109-bd62-468c-b024-d40b11ea78c2",
      senderId: "user_321",
      senderName: "Jessica L.",
      content: "Just wanted to thank everyone for the advice! Had an amazing third date last night 💕",
      messageType: "text",
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      isRead: false,
    },
    lastActivity: new Date(Date.now() - 1800000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "ca1d221d-5047-4168-9a46-e25de522179b",
    name: "Global Chat",
    description: "Open discussion for everyone",
    type: "global",
    category: "all",
    memberCount: 342,
    onlineCount: 67,
    lastMessage: {
      id: "msg_4",
      chatRoomId: "ca1d221d-5047-4168-9a46-e25de522179b",
      senderId: "user_654",
      senderName: "Alex T.",
      content: "Good morning everyone! Hope you all have a great day",
      messageType: "text",
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      isRead: false,
    },
    lastActivity: new Date(Date.now() - 3600000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "4c2bfb82-1161-40e3-895d-549b64ae4b26",
    name: "Men's Room",
    description: "Space for men to connect and share experiences",
    type: "topic",
    category: "men",
    memberCount: 54,
    onlineCount: 8,
    lastActivity: new Date(Date.now() - 600000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "a9082cbb-2bc8-48eb-b35d-04997803232b",
    name: "Women's Room",
    description: "Space for women to connect and share experiences",
    type: "topic",
    category: "women",
    memberCount: 78,
    onlineCount: 12,
    lastActivity: new Date(Date.now() - 1200000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "fef4dae9-7507-4832-b82e-69fb5e40fbb5",
    name: "LGBTQ+ Room",
    description: "Inclusive space for LGBTQ+ community members",
    type: "topic",
    category: "lgbtq+",
    memberCount: 33,
    onlineCount: 5,
    lastActivity: new Date(Date.now() - 2400000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
];

const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state - Initialize with mock data so users see chat rooms immediately
      chatRooms: mockChatRooms,
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
          const filteredRooms = category && category !== "all"
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
            const filtered = currentCategory && currentCategory !== "all"
              ? updatedRooms.filter((r: ChatRoom) => (r.category || "all").toLowerCase() === currentCategory.toLowerCase())
              : updatedRooms;

            set({ chatRooms: filtered });
          });

        } catch (error) {
          console.error("💥 Failed to load chat rooms:", error);

          // Fallback to mock data on error
          const category = get().roomCategoryFilter || "all";
          const roomsToUse = category && category !== "all"
            ? mockChatRooms.filter((r) => (r.category || "all").toLowerCase() === category.toLowerCase())
            : mockChatRooms;

          set({
            chatRooms: roomsToUse,
            error: error instanceof Error ? error.message : "Failed to load chat rooms",
            isLoading: false,
          });
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

          // Get current user for real-time presence
          const currentUser = await supabaseAuth.getCurrentUser();
          if (!currentUser) {
            throw new Error("Must be signed in to join chat room");
          }

          // Join room with real-time service
          await realtimeChatService.joinRoom(roomId, currentUser.id, currentUser.email?.split("@")[0] || "User");

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

          console.log(`✅ Successfully joined room: ${room.name}`);
        } catch (error) {
          console.error("💥 Failed to join chat room:", error);
          set({ error: error instanceof Error ? error.message : "Failed to join chat room" });
        }
      },

      leaveChatRoom: async (roomId: string) => {
        console.log(`🚪 Leaving chat room: ${roomId}`);

        await realtimeChatService.leaveRoom(roomId);

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
          set({
            error: error instanceof Error ? error.message : "Failed to load messages",
            isLoading: false,
          });
        }
      },

      sendMessage: async (roomId: string, content: string) => {
        try {
          console.log(`📤 Sending message to room ${roomId}:`, content);

          // Get current authenticated user
          const currentUser = await supabaseAuth.getCurrentUser();
          if (!currentUser) {
            throw new Error("Must be signed in to send messages");
          }

          const senderName = currentUser.email?.split("@")[0] || "Anonymous";

          // Optimistic update - add message locally first
          const optimisticMessage: ChatMessage = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            chatRoomId: roomId,
            senderId: currentUser.id,
            senderName,
            content,
            messageType: "text",
            timestamp: new Date(),
            isRead: true,
            isOwn: true,
          };

          get().addMessage(optimisticMessage);

          // Send to Supabase via real-time service
          await realtimeChatService.sendMessage(roomId, content, currentUser.id, senderName);

          console.log("✅ Message sent successfully");
        } catch (error) {
          console.error("💥 Failed to send message:", error);

          // Remove the optimistic message on error
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).filter(msg => !msg.id.startsWith('temp_')),
            },
          }));

          throw error;
        }
      },

      addMessage: (message: ChatMessage) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [message.chatRoomId]: [...(state.messages[message.chatRoomId] || []), message]
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
          },
        }));
      },

      // Add message immediately for real-time updates
      addMessageImmediate: (message: ChatMessage) => {
        set((state) => {
          const roomMessages = state.messages[message.chatRoomId] || [];

          // Check if message already exists to avoid duplicates
          const messageExists = roomMessages.some(msg => msg.id === message.id);
          if (messageExists) {
            return state;
          }

          return {
            messages: {
              ...state.messages,
              [message.chatRoomId]: [...roomMessages, message]
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
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
        webSocketService.sendTypingIndicator(roomId, isTyping);
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
          // Mock members data
          const mockMembers: ChatMember[] = [
            {
              id: "member_1",
              chatRoomId: roomId,
              userId: "user_456",
              userName: "Sarah M.",
              joinedAt: new Date(Date.now() - 86400000),
              role: "member",
              isOnline: true,
              lastSeen: new Date(),
            },
            {
              id: "member_2",
              chatRoomId: roomId,
              userId: "user_789",
              userName: "Mike R.",
              joinedAt: new Date(Date.now() - 172800000),
              role: "member",
              isOnline: false,
              lastSeen: new Date(Date.now() - 3600000),
            },
          ];

          set((state) => ({
            members: {
              ...state.members,
              [roomId]: mockMembers,
            },
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to load members" });
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
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: messages,
            },
          }));
        });
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
