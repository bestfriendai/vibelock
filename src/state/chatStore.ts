import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  ChatRoom, 
  ChatMessage, 
  ChatMember, 
  TypingUser, 
  ConnectionStatus,
  ChatState 
} from "../types";
import { webSocketService } from "../services/websocketService";

interface ChatActions {
  // Connection management
  connect: (userId: string) => void;
  disconnect: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // Chat rooms
  loadChatRooms: () => Promise<void>;
  joinChatRoom: (roomId: string) => Promise<void>;
  leaveChatRoom: (roomId: string) => void;
  setCurrentChatRoom: (room: ChatRoom | null) => void;
  
  // Messages
  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string) => void;
  addMessage: (message: ChatMessage) => void;
  markMessagesAsRead: (roomId: string) => void;
  
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

// Mock data for development
const mockChatRooms: ChatRoom[] = [
  {
    id: "room_local_dc",
    name: "Washington DC Local",
    description: "Connect with singles in the Washington DC area",
    type: "local",
    memberCount: 127,
    onlineCount: 23,
    lastMessage: {
      id: "msg_1",
      chatRoomId: "room_local_dc",
      senderId: "user_456",
      senderName: "Sarah M.",
      content: "Anyone been to that new rooftop bar in Adams Morgan?",
      messageType: "text",
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      isRead: false
    },
    lastActivity: new Date(Date.now() - 300000),
    isActive: true,
    location: { city: "Washington", state: "DC" },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date()
  },
  {
    id: "room_topic_dating_tips",
    name: "Dating Tips & Advice",
    description: "Share and get advice on dating, relationships, and meeting people",
    type: "topic",
    memberCount: 89,
    onlineCount: 15,
    lastMessage: {
      id: "msg_2",
      chatRoomId: "room_topic_dating_tips",
      senderId: "user_789",
      senderName: "Mike R.",
      content: "What's everyone's take on first date locations?",
      messageType: "text",
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      isRead: false
    },
    lastActivity: new Date(Date.now() - 900000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date()
  },
  {
    id: "room_topic_success_stories",
    name: "Success Stories",
    description: "Share your dating success stories and celebrate wins",
    type: "topic",
    memberCount: 156,
    onlineCount: 31,
    lastMessage: {
      id: "msg_3",
      chatRoomId: "room_topic_success_stories",
      senderId: "user_321",
      senderName: "Jessica L.",
      content: "Just wanted to thank everyone for the advice! Had an amazing third date last night 💕",
      messageType: "text",
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      isRead: false
    },
    lastActivity: new Date(Date.now() - 1800000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date()
  },
  {
    id: "room_global",
    name: "Global Chat",
    description: "Open discussion for everyone",
    type: "global",
    memberCount: 342,
    onlineCount: 67,
    lastMessage: {
      id: "msg_4",
      chatRoomId: "room_global",
      senderId: "user_654",
      senderName: "Alex T.",
      content: "Good morning everyone! Hope you all have a great day",
      messageType: "text",
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      isRead: false
    },
    lastActivity: new Date(Date.now() - 3600000),
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date()
  }
];

const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      chatRooms: [],
      currentChatRoom: null,
      messages: {},
      members: {},
      typingUsers: [],
      onlineUsers: [],
      connectionStatus: 'disconnected',
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
          onUserJoin: (userId: string, userName: string, chatRoomId: string) => {
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
          }
        };

        webSocketService.connect(userId, callbacks);
      },

      disconnect: () => {
        webSocketService.disconnect();
        set({ connectionStatus: 'disconnected' });
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      // Chat rooms
      loadChatRooms: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set({ 
            chatRooms: mockChatRooms,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to load chat rooms",
            isLoading: false 
          });
        }
      },

      joinChatRoom: async (roomId: string) => {
        try {
          const room = get().chatRooms.find(r => r.id === roomId);
          if (room) {
            set({ currentChatRoom: room });
            webSocketService.joinRoom(roomId);
            await get().loadMessages(roomId);
            await get().loadMembers(roomId);
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to join chat room" });
        }
      },

      leaveChatRoom: (roomId: string) => {
        webSocketService.leaveRoom(roomId);
        const currentRoom = get().currentChatRoom;
        if (currentRoom && currentRoom.id === roomId) {
          set({ currentChatRoom: null });
        }
      },

      setCurrentChatRoom: (room: ChatRoom | null) => {
        set({ currentChatRoom: room });
      },

      // Messages
      loadMessages: async (roomId: string) => {
        try {
          set({ isLoading: true });
          
          // Generate mock messages for the room
          const mockMessages: ChatMessage[] = [
            {
              id: `msg_${roomId}_1`,
              chatRoomId: roomId,
              senderId: "user_456",
              senderName: "Sarah M.",
              content: "Hey everyone! How's everyone doing today?",
              messageType: "text",
              timestamp: new Date(Date.now() - 3600000),
              isRead: true,
              isOwn: false
            },
            {
              id: `msg_${roomId}_2`,
              chatRoomId: roomId,
              senderId: "current_user",
              senderName: "You",
              content: "Doing great! Just joined this room",
              messageType: "text",
              timestamp: new Date(Date.now() - 3000000),
              isRead: true,
              isOwn: true
            },
            {
              id: `msg_${roomId}_3`,
              chatRoomId: roomId,
              senderId: "user_789",
              senderName: "Mike R.",
              content: "Welcome! This is a great community",
              messageType: "text",
              timestamp: new Date(Date.now() - 2400000),
              isRead: true,
              isOwn: false
            }
          ];

          set(state => ({
            messages: {
              ...state.messages,
              [roomId]: mockMessages
            },
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to load messages",
            isLoading: false 
          });
        }
      },

      sendMessage: (roomId: string, content: string) => {
        const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
          chatRoomId: roomId,
          senderId: "current_user",
          senderName: "You",
          content,
          messageType: "text",
          isRead: true,
          isOwn: true
        };

        webSocketService.sendChatMessage(message);
        
        // Optimistically add message to local state
        const newMessage: ChatMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date()
        };
        
        get().addMessage(newMessage);
      },

      addMessage: (message: ChatMessage) => {
        set(state => ({
          messages: {
            ...state.messages,
            [message.chatRoomId]: [
              ...(state.messages[message.chatRoomId] || []),
              message
            ]
          }
        }));
      },

      markMessagesAsRead: (roomId: string) => {
        set(state => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map(msg => ({
              ...msg,
              isRead: true
            }))
          }
        }));
      },

      // Typing indicators
      setTyping: (roomId: string, isTyping: boolean) => {
        webSocketService.sendTypingIndicator(roomId, isTyping);
      },

      addTypingUser: (typingUser: TypingUser) => {
        set(state => ({
          typingUsers: [
            ...state.typingUsers.filter(u => 
              u.userId !== typingUser.userId || u.chatRoomId !== typingUser.chatRoomId
            ),
            typingUser
          ]
        }));

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          get().removeTypingUser(typingUser.userId, typingUser.chatRoomId);
        }, 3000);
      },

      removeTypingUser: (userId: string, roomId: string) => {
        set(state => ({
          typingUsers: state.typingUsers.filter(u => 
            u.userId !== userId || u.chatRoomId !== roomId
          )
        }));
      },

      // Online status
      setOnlineUsers: (userIds: string[]) => {
        set({ onlineUsers: userIds });
      },

      addOnlineUser: (userId: string) => {
        set(state => ({
          onlineUsers: [...new Set([...state.onlineUsers, userId])]
        }));
      },

      removeOnlineUser: (userId: string) => {
        set(state => ({
          onlineUsers: state.onlineUsers.filter(id => id !== userId)
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
              lastSeen: new Date()
            },
            {
              id: "member_2",
              chatRoomId: roomId,
              userId: "user_789",
              userName: "Mike R.",
              joinedAt: new Date(Date.now() - 172800000),
              role: "member",
              isOnline: false,
              lastSeen: new Date(Date.now() - 3600000)
            }
          ];

          set(state => ({
            members: {
              ...state.members,
              [roomId]: mockMembers
            }
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to load members" });
        }
      },

      addMember: (member: ChatMember) => {
        set(state => ({
          members: {
            ...state.members,
            [member.chatRoomId]: [
              ...(state.members[member.chatRoomId] || []),
              member
            ]
          }
        }));
      },

      removeMember: (userId: string, roomId: string) => {
        set(state => ({
          members: {
            ...state.members,
            [roomId]: (state.members[roomId] || []).filter(m => m.userId !== userId)
          }
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
      }
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data, not real-time state
      partialize: (state) => ({
        chatRooms: state.chatRooms,
        messages: state.messages,
        members: state.members
      }),
    }
  )
);

export default useChatStore;