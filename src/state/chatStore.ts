import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "../utils/mmkvStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startTransition } from "react";
import {
  ChatRoom,
  ChatMessage,
  Message,
  ChatMember,
  TypingUser,
  ConnectionStatus,
  ChatState,
  MessageEvent,
  UserRole,
} from "../types";
import { consolidatedRealtimeService } from "../services/consolidatedRealtimeService";
import useAuthStore from "./authStore";
import { requireAuthentication, getUserDisplayName } from "../utils/authUtils";
import { AppError, parseSupabaseError, retryWithBackoff, ErrorType } from "../utils/errorHandling";
import supabase from "../config/supabase";
import { searchService } from "../services/search";
import { messageEditService } from "../services/messageEditService";
import { messageForwardService } from "../services/messageForwardService";
import { notificationService } from "../services/notificationService";
import { storageService } from "../services/storageService";
import { messageStatusService } from "../services/messageStatusService";
import NetInfo from "@react-native-community/netinfo";
import { appStateManager } from "../services/appStateManager";
import { reliableNetworkCheck } from "../utils/reliableNetworkCheck";
import { messagePaginationManager } from "../services/messagePaginationService";
import { memoryManager } from "../services/memoryManager";
import { messageVirtualizer } from "../services/messageVirtualizer";
import { performanceMonitor } from "../utils/performance";

// Constants for data limits
const MAX_PERSISTED_MESSAGES_PER_ROOM = 50;
const MAX_PERSISTED_MEMBERS_PER_ROOM = 100;

// Sanitize messages for persistence - remove sensitive content
const sanitizeMessagesForPersistence = (messages: {
  [roomId: string]: ChatMessage[];
}): { [roomId: string]: ChatMessage[] } => {
  const sanitized: { [roomId: string]: ChatMessage[] } = {};

  Object.entries(messages).forEach(([roomId, roomMessages]) => {
    // Limit number of messages per room
    const limitedMessages = roomMessages.slice(0, MAX_PERSISTED_MESSAGES_PER_ROOM);

    sanitized[roomId] = limitedMessages.map((msg) => ({
      ...msg,
      // Remove sensitive media URIs
      audioUri: undefined,
      imageUri: undefined,
      videoUri: undefined,
      // Keep only essential metadata
      content: msg.messageType === "text" ? msg.content.substring(0, 100) : "[Media]",
      // Anonymize sender info
      senderName: msg.senderName ? msg.senderName.substring(0, 1) + "***" : "Anonymous",
    }));
  });

  return sanitized;
};

// Sanitize members for persistence - remove detailed member information
const sanitizeMembersForPersistence = (members: {
  [roomId: string]: ChatMember[];
}): { [roomId: string]: ChatMember[] } => {
  const sanitized: { [roomId: string]: ChatMember[] } = {};

  Object.entries(members).forEach(([roomId, roomMembers]) => {
    // Limit number of members per room
    const limitedMembers = roomMembers.slice(0, MAX_PERSISTED_MEMBERS_PER_ROOM);

    sanitized[roomId] = limitedMembers.map((member) => ({
      ...member,
      // Remove sensitive member data - use userName field
      userName: member.userName ? member.userName.substring(0, 1) + "***" : "Anonymous",
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
  reconnect: () => Promise<void>;

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

  // Message editing and forwarding
  editMessage: (roomId: string, messageId: string, newContent: string) => Promise<void>;
  forwardMessage: (sourceMessage: ChatMessage, targetRoomId: string, comment?: string) => Promise<void>;
  searchMessages: (roomId: string, query: string) => Promise<ChatMessage[]>;
  scrollToMessage: (messageId: string) => void;

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
  loadOlderMessages: (roomId: string) => Promise<{ hasMore: boolean; loadedCount: number }>;

  // Performance optimization
  enableOptimizedMode: (roomId: string) => void;
  cleanupMemory: (roomId?: string) => Promise<number>;
  getPerformanceMetrics: () => any;

  // Real-time subscriptions
  subscribeToChatRoom: (roomId: string) => void;
  unsubscribeFromChatRoom: (roomId: string) => Promise<void>;
  clearOldMessages: (daysToKeep?: number) => void;

  // Offline support
  processOfflineQueue: () => Promise<void>;
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
      subscriptions: {},

      // Performance optimization
      enableOptimizedMode: (roomId: string) => {
        const messages = get().messages[roomId] || [];

        if (messages.length > 100) {
          // Initialize performance services
          messageVirtualizer.optimizeForDevice({ memory: 4096 });
          memoryManager.trackComponent("ChatRoom", roomId);
          performanceMonitor.startFPSMonitoring();

          // Enable aggressive cleanup
          messagePaginationManager.cleanupOldMessages(roomId, 200);
        }
      },

      cleanupMemory: async (roomId?: string) => {
        let totalCleaned = 0;

        if (roomId) {
          // Clean specific room
          const cleaned = await messagePaginationManager.cleanupOldMessages(roomId, 100);
          totalCleaned += cleaned;

          // Clear virtualization cache
          messageVirtualizer.clear();
        } else {
          // Clean all rooms
          const rooms = Object.keys(get().messages);
          for (const room of rooms) {
            const cleaned = await messagePaginationManager.cleanupOldMessages(room, 100);
            totalCleaned += cleaned;
          }
        }

        // Force memory cleanup
        const memCleaned = await memoryManager.forceCleanup();
        totalCleaned += memCleaned;

        performanceMonitor.recordMetric("memoryCleanup", {
          cleaned: totalCleaned,
          roomId,
          timestamp: Date.now(),
        });

        return totalCleaned;
      },

      getPerformanceMetrics: () => {
        const memoryReport = memoryManager.getMemoryReport();
        const performanceReport = performanceMonitor.generatePerformanceReport();
        const virtualizerMetrics = messageVirtualizer.getPerformanceMetrics();
        const paginationMetrics = messagePaginationManager.getMetrics();

        return {
          memory: memoryReport,
          performance: performanceReport,
          virtualizer: virtualizerMetrics,
          pagination: paginationMetrics,
          timestamp: Date.now(),
        };
      },

      // Connection management
      connect: async (userId: string) => {
        // ... existing connect code ...

        // After successful connection, process offline queue

        await get().processOfflineQueue();

        try {
          set({ connectionStatus: "connecting", error: null });

          // Verify authentication before connecting
          let authResult;
          try {
            authResult = await requireAuthentication("connect to chat service");
          } catch (authError) {
            console.error("❌ Authentication failed for chat connection:", authError);
            set({
              connectionStatus: "error" as ConnectionStatus,
              error: "Authentication required. Please sign in to access chat.",
            });
            throw authError;
          }

          // Authentication successful, user is available in authResult if needed

          // Initialize AppState manager
          appStateManager.initialize();

          // Register for AppState changes
          appStateManager.registerListener("chatStore", async (nextState, prevState) => {
            if (prevState) {
              await get().handleAppStateChange?.(nextState, prevState);
            }
          });

          // Register foreground/background callbacks
          const unsubscribeForeground = appStateManager.onForeground!(async () => {
            await get().reconnectAllRooms?.();
          });

          const unsubscribeBackground = appStateManager.onBackground!(() => {
            // Clear typing indicators for all rooms
            const currentRoomId = get().currentChatRoom?.id;
            if (currentRoomId) {
              get().setTyping(currentRoomId, false);
            }
          });

          // Store unsubscribe functions
          set((state) => ({
            subscriptions: {
              ...state.subscriptions,
              appStateForeground: unsubscribeForeground,
              appStateBackground: unsubscribeBackground,
            },
          }));

          // Create enhanced connection monitor with reliable network checking
          const createConnectionMonitor = () => {
            return NetInfo.addEventListener(async (state) => {
              // Use reliable network check first
              const reliableCheck = await reliableNetworkCheck();

              // Combine NetInfo and reliable check results
              const isConnected = Boolean(state.isConnected) && reliableCheck.isConnected;
              const hasInternetAccess =
                (state.isInternetReachable === true || (state.isInternetReachable === null && isConnected)) &&
                reliableCheck.isStable;
              const online = isConnected && hasInternetAccess;

              if (online) {
                // Only reconnect if we were previously connected and authenticated
                if (consolidatedRealtimeService.getConnectionStatus() === "connected") {
                  try {
                    // Re-verify authentication before reconnecting
                    await requireAuthentication("reconnect to chat service");
                    set({ connectionStatus: "connecting" });
                    await consolidatedRealtimeService.initialize();
                    set({ connectionStatus: "connected", error: null });
                  } catch (error) {
                    const isAuthError = error instanceof Error && error.message.includes("signed in");
                    set({
                      connectionStatus: "error" as ConnectionStatus,
                      error: isAuthError ? "Authentication required. Please sign in." : "Reconnection failed",
                    });
                  }
                } else {
                  // Only update to connected if we're not already in a better state
                  const currentStatus = get().connectionStatus;
                  if (currentStatus === "disconnected") {
                    set({ connectionStatus: "connected", error: null });
                  }
                }
              } else {
                // Only set disconnected if we're sure there's no internet
                // Don't override authentication errors
                const currentStatus = get().connectionStatus;
                if (currentStatus !== "error") {
                  set({ connectionStatus: "disconnected", error: "No internet connection" });
                }
              }
            });
          };

          // Set up network monitoring once with improved logic
          if (!netUnsubscribe) {
            netUnsubscribe = createConnectionMonitor();
          }

          // Subscribe to connection status changes from consolidated service
          const unsubscribeConnectionStatus = consolidatedRealtimeService.onConnectionStatusChange((status, error) => {
            set({
              connectionStatus: status as ConnectionStatus,
              error: error || null,
            });
          });

          // Store unsubscribe function for cleanup
          set((state) => ({
            subscriptions: {
              ...state.subscriptions,
              connectionStatus: unsubscribeConnectionStatus,
            },
          }));

          // Initialize the real-time service with retry logic
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              await consolidatedRealtimeService.initialize();
              return;
            } catch (error) {
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, retryCount * 1000));
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          // Differentiate between authentication and network/service errors
          const isAuthError =
            error instanceof Error &&
            (error.message.includes("signed in") ||
              error.message.includes("Authentication") ||
              error.message.includes("AUTHENTICATION_REQUIRED"));

          set({
            connectionStatus: isAuthError ? ("error" as ConnectionStatus) : "disconnected",
            error: isAuthError
              ? "Authentication required. Please sign in to access chat."
              : error instanceof Error
                ? error.message
                : "Failed to connect to chat service",
          });
          throw error;
        }
      },

      disconnect: async () => {
        try {
          await consolidatedRealtimeService.cleanup();
          set({ connectionStatus: "disconnected" });
        } catch (error) {
          console.error("Error during disconnect:", error);
        }
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      // Manual reconnection (useful for retry buttons)
      reconnect: async () => {
        try {
          set({ connectionStatus: "connecting", error: null });
          await consolidatedRealtimeService.forceReconnect();
        } catch (error) {
          console.error("❌ Manual reconnection failed:", error);
          set({
            connectionStatus: "error",
            error: error instanceof Error ? error.message : "Reconnection failed",
          });
        }
      },

      // Chat rooms
      loadChatRooms: async () => {
        try {
          const { user } = await requireAuthentication("load chat rooms");
          set({ isLoading: true, error: null });

          // Check offline cache first
          const networkState = await NetInfo.fetch();
          const cached = await AsyncStorage.getItem("cached_rooms");
          if (cached && !networkState.isConnected) {
            set({ chatRooms: JSON.parse(cached) });
          }
          // Fetch fresh data
          // Load all active chat rooms (simplified approach - no complex filtering)
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
        last_message,
        is_active,
        location,
        created_at,
        updated_at,
        is_private,
        created_by
      `,
            )
            .eq("is_active", true)
            .eq("is_private", false) // Only show public rooms for now
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

          set({
            chatRooms: filteredRooms,
            isLoading: false,
          });
          await AsyncStorage.setItem("cached_rooms", JSON.stringify(formattedRooms));
        } catch (error) {
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          set({
            chatRooms: [],
            error: appError.userMessage,
            isLoading: false,
          });

          throw appError;
        }
      },

      loadMoreRooms: async (page: number) => {
        try {
          const { user } = await requireAuthentication("load more chat rooms");
          const { data: newRooms, error } = await supabase
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
        last_message,
        is_active,
        location,
        created_at,
        updated_at,
        is_private,
        created_by
      `,
            )
            .eq("is_active", true)
            .eq("is_private", false) // Only show public rooms for now
            .range((page - 1) * 20, page * 20 - 1)
            .order("last_activity", { ascending: false });

          if (error) throw error;

          const formattedNewRooms: ChatRoom[] = (newRooms || []).map((room: any) => ({
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

          set((state) => ({
            chatRooms: [...state.chatRooms, ...formattedNewRooms],
            hasMoreRooms: newRooms.length === 20,
          }));
        } catch (error) {
          throw error;
        }
      },

      setRoomCategoryFilter: (category) => {
        set({ roomCategoryFilter: category });
      },

      joinChatRoom: async (roomId: string) => {
        try {
          console.log(`🚀 Joining chat room: ${roomId}`);
          set({ isLoading: true, error: null });

          const room = get().chatRooms.find((r) => r.id === roomId);
          if (!room) {
            throw new Error("Chat room not found");
          }

          set({ currentChatRoom: room });

          // Simplified authentication check
          const authState = useAuthStore.getState();
          if (!authState.user && !authState.isGuestMode) {
            console.error("❌ No user found for joining chat room");
            set({
              connectionStatus: "error" as ConnectionStatus,
              error: "Please sign in to join chat rooms.",
              isLoading: false,
            });
            return;
          }

          const user = authState.user;
          if (!user) {
            console.error("❌ No user available for joining chat room");
            set({
              connectionStatus: "error" as ConnectionStatus,
              error: "User information not available.",
              isLoading: false,
            });
            return;
          }

          // Ensure user is added to chat_members_firebase table
          const { error: memberError } = await supabase.from("chat_members_firebase").upsert(
            {
              chat_room_id: roomId,
              user_id: user.id,
              role: "member",
              is_active: true,
              joined_at: new Date().toISOString(),
            },
            {
              onConflict: "chat_room_id,user_id",
            },
          );

          if (memberError) {
            // Don't throw error here - user can still join the room
            console.warn("⚠️ Could not update member status:", memberError);
          } else {
            console.log("✅ User added to chat room members");
          }

          // Join room using consolidated service
          await consolidatedRealtimeService.joinRoom(roomId, user.id, getUserDisplayName(user), {
            onMessage: (event: MessageEvent) => {
              // Use React 19 startTransition for non-urgent message updates
              startTransition(() => {
                set((state) => {
                  let allMessages: ChatMessage[];

                  switch (event.type) {
                    case "initial":
                      // Service returns ascending (oldest->newest)
                      allMessages = [...event.items];
                      break;

                    case "new":
                      // Add new message to existing messages
                      const existingMessages = state.messages[roomId] || [];
                      allMessages = [...existingMessages, ...event.items];
                      break;

                    case "update":
                      // Update existing message
                      const messages = state.messages[roomId] || [];
                      allMessages = messages.map((msg) => event.items.find((updated) => updated.id === msg.id) || msg);
                      break;

                    case "replace":
                      // Replace only the optimistic message identified by event.tempId
                      const currentMsgs = state.messages[roomId] || [];
                      if (event.tempId && event.items.length > 0) {
                        // Replace the optimistic message with the real message
                        const realMessage = event.items[0];
                        allMessages = currentMsgs
                          .map((msg) => (msg.id === event.tempId ? realMessage : msg))
                          .filter((msg): msg is Message => msg !== undefined);
                        // Remove duplicate if the real message already exists
                        const uniqueIds = new Set<string>();
                        allMessages = allMessages.filter((msg) => {
                          if (uniqueIds.has(msg.id)) return false;
                          uniqueIds.add(msg.id);
                          return true;
                        });
                      } else {
                        // Fallback: Replace all messages (for refresh scenarios)
                        allMessages = [...event.items];
                      }
                      break;

                    case "delete":
                      // Remove deleted messages
                      const currentMessages = state.messages[roomId] || [];
                      const deletedIds = event.items.map((item) => item.id);
                      allMessages = currentMessages.filter((msg) => !deletedIds.includes(msg.id));
                      break;

                    default:
                      return state;
                  }

                  // Keep ascending order for display (oldest->newest)
                  allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                  return {
                    ...state,
                    messages: {
                      ...state.messages,
                      [roomId]: allMessages,
                    },
                  };
                });
              });

              // Track message delivery status for new/initial messages
              if (event.type === "initial" || event.type === "new") {
                const messageIds = event.items
                  .filter((msg) => msg.senderId !== user.id && !msg.isRead)
                  .map((msg) => msg.id);

                if (messageIds.length > 0) {
                  // Mark messages as delivered
                  messageStatusService.markMessagesAsDelivered(messageIds, user.id).catch((error) => {});

                  // If room is currently active/visible, mark as read
                  const currentRoom = get().currentChatRoom;
                  if (currentRoom && currentRoom.id === roomId) {
                    messageStatusService.markMessagesAsRead(messageIds, user.id).catch((error) => {});
                  }
                }

                // Check capability status and show warning if needed
                const capabilities = messageStatusService.getCapabilityStatus();
                if (capabilities.warningShown && !capabilities.supportsDelivered) {
                  // Optionally set a non-blocking warning in state
                  // set({ warning: 'Message delivery tracking is limited' });
                }
              }
            },
            onPresence: (members: ChatMember[]) => {
              startTransition(() => {
                set((state) => ({
                  ...state,
                  members: {
                    ...state.members,
                    [roomId]: members,
                  },
                }));
              });
            },
            onTyping: (typingUsers: TypingUser[]) => {
              startTransition(() => {
                set({ typingUsers });
              });
            },
            onError: (error: any) => {
              console.error("❌ Real-time error:", error);
              set({ error: error.message || "Real-time connection error" });
            },
          });

          // Process offline queue after joining
          await get().processOfflineQueue();

          // Load initial messages with loading state
          await consolidatedRealtimeService.loadInitialMessages(roomId, 50);

          // Subscribe to message status updates
          const unsubscribeStatus = messageStatusService.subscribeToRoomStatusUpdates(roomId, (status) => {
            // Update message status in state
            startTransition(() => {
              set((state) => {
                const messages = state.messages[roomId] || [];
                const updatedMessages = messages.map((msg) => {
                  if (msg.id === status.messageId) {
                    return {
                      ...msg,
                      status: status.status,
                      deliveryStatus: status.status,
                      readBy: status.readBy,
                    };
                  }
                  return msg;
                });

                return {
                  ...state,
                  messages: {
                    ...state.messages,
                    [roomId]: updatedMessages,
                  },
                };
              });
            });
          });

          // Store unsubscribe function for cleanup
          set((state) => ({
            ...state,
            subscriptions: {
              ...state.subscriptions,
              [`status_${roomId}`]: unsubscribeStatus,
            },
          }));

          // Set loading to false after successful join and message load
          set({ isLoading: false });
        } catch (error) {
          // Differentiate between authentication and other errors
          const isAuthError =
            error instanceof Error &&
            (error.message.includes("signed in") ||
              error.message.includes("Authentication") ||
              error.message.includes("AUTHENTICATION_REQUIRED"));

          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          set({
            connectionStatus: isAuthError ? ("error" as ConnectionStatus) : get().connectionStatus,
            error: isAuthError ? "Authentication required. Please sign in to join chat rooms." : appError.userMessage,
            isLoading: false, // Reset loading state on error
          });
          throw appError;
        }
      },

      leaveChatRoom: async (roomId: string) => {
        await consolidatedRealtimeService.leaveRoom(roomId);

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

          // Load messages using consolidated service
          await consolidatedRealtimeService.loadInitialMessages(roomId, 50);

          set({ isLoading: false });
        } catch (error) {
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({
            error: appError.userMessage,
            isLoading: false,
          });
          throw appError;
        }
      },

      sendMessage: async (roomId: string, content: string, replyTo?: string) => {
        const netInfoState = await NetInfo.fetch();
        if (!netInfoState.isConnected) {
          const offlineActions = JSON.parse((await AsyncStorage.getItem("offline_actions")) || "[]");
          offlineActions.push({ type: "sendMessage", roomId, content, replyTo, timestamp: Date.now() });
          await AsyncStorage.setItem("offline_actions", JSON.stringify(offlineActions));
          // Add optimistic message
          const { user } = useAuthStore.getState();
          const senderName = getUserDisplayName(user);
          const timestamp = Date.now();
          const optimisticMessageId = `offline_${timestamp}`;
          const optimisticMessage: ChatMessage = {
            id: optimisticMessageId,
            chatRoomId: roomId,
            senderId: user?.id || "",
            senderName,
            content,
            messageType: "text",
            timestamp: new Date(timestamp),
            isRead: false,
            status: "pending",
            isOwn: true,
            replyTo,
          };
          get().addMessage(optimisticMessage);
          return;
        }

        let optimisticMessageId: string | null = null;
        try {
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

          // Add optimistic message locally
          get().addMessage(optimisticMessage);

          // Track optimistic message with realtime service
          consolidatedRealtimeService.trackOptimisticMessage(roomId, optimisticMessage);

          // Send to Supabase via consolidated real-time service (with retry)
          await retryWithBackoff(
            () => consolidatedRealtimeService.sendMessage(roomId, content, user.id, senderName, "text", replyTo),
            3,
            800,
            (err) => err.type === ErrorType.NETWORK || err.retryable,
          );

          // Process offline queue after successful send
          await get().processOfflineQueue();
        } catch (error) {
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
          await consolidatedRealtimeService.sendMessage(roomId, "", user.id, senderName, "voice", undefined);
        } catch (error) {
          const appError = error instanceof AppError ? error : parseSupabaseError(error);
          set({ error: appError.userMessage });
          throw appError;
        }
      },

      sendMediaMessage: async (roomId: string, mediaUri: string, mediaType: "image" | "video") => {
        try {
          const { user } = await requireAuthentication("send media messages");
          const senderName = getUserDisplayName(user);

          // Process media (compress image or generate video thumbnail)
          const { mediaProcessingService } = await import("../services/mediaProcessingService");
          const processingResult = await mediaProcessingService.processMediaForChat(mediaUri, mediaType, {
            onProgress: (progress) => {},
          });

          // Create optimistic message with thumbnail for immediate UI feedback
          const optimisticMessage: Partial<ChatMessage> = {
            id: `temp_${Date.now()}`,
            chatRoomId: roomId,
            senderId: user.id,
            senderName,
            messageType: mediaType,
            timestamp: new Date(),
            status: "pending" as const,
            width: processingResult.width,
            height: processingResult.height,
          };

          if (mediaType === "image") {
            optimisticMessage.imageUri = processingResult.processedUri;
            optimisticMessage.thumbnailUri = processingResult.processedUri;
          } else {
            optimisticMessage.videoUri = mediaUri;
            optimisticMessage.thumbnailUri = processingResult.thumbnailUri;
            optimisticMessage.duration = processingResult.duration;
          }

          // Add optimistic message immediately
          get().addMessage(optimisticMessage as ChatMessage);

          // Upload processed media to storage
          const uploadResult = await storageService.uploadChatMedia(processingResult.processedUri, user.id, roomId);

          if (!uploadResult.success || !uploadResult.url) {
            throw new Error("Failed to upload media");
          }

          // Upload thumbnail for videos
          let thumbnailUrl: string | undefined;
          if (mediaType === "video" && processingResult.thumbnailUri) {
            const thumbnailUpload = await storageService.uploadChatMedia(
              processingResult.thumbnailUri,
              user.id,
              roomId,
            );
            thumbnailUrl = thumbnailUpload.url;
          }

          // Update message with final URLs
          const finalMessage: Partial<ChatMessage> = {
            chatRoomId: roomId,
            senderId: user.id,
            senderName,
            messageType: mediaType,
            timestamp: new Date(),
            status: "sent" as const,
            width: processingResult.width,
            height: processingResult.height,
          };

          if (mediaType === "image") {
            finalMessage.imageUri = uploadResult.url;
            finalMessage.thumbnailUri = uploadResult.url;
          } else {
            finalMessage.videoUri = uploadResult.url;
            finalMessage.thumbnailUri = thumbnailUrl;
            finalMessage.duration = processingResult.duration;
          }

          // Send message through realtime service
          await consolidatedRealtimeService.sendMessage(roomId, "", user.id, senderName, mediaType, undefined);

          // Clean up temp files
          await mediaProcessingService.cleanupTempFiles();
        } catch (error) {
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

          // Optimistic local update with aggregated reactions
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map((m) => {
                if (m.id !== messageId) return m;

                // Work with aggregated reactions format
                const currentReactions = (m.reactions || []) as {
                  emoji: string;
                  count: number;
                  users: string[];
                }[];
                const existingReaction = currentReactions.find((r) => r.emoji === reaction);

                let updatedReactions: { emoji: string; count: number; users: string[] }[];

                if (existingReaction) {
                  const userIndex = existingReaction.users.indexOf(userId);
                  if (userIndex > -1) {
                    // User is removing their reaction
                    if (existingReaction.count === 1) {
                      // Remove the reaction entirely
                      updatedReactions = currentReactions.filter((r) => r.emoji !== reaction);
                    } else {
                      // Decrease count and remove user
                      updatedReactions = currentReactions.map((r) =>
                        r.emoji === reaction
                          ? {
                              ...r,
                              count: r.count - 1,
                              users: r.users.filter((u) => u !== userId),
                            }
                          : r,
                      );
                    }
                  } else {
                    // User is adding their reaction
                    updatedReactions = currentReactions.map((r) =>
                      r.emoji === reaction
                        ? {
                            ...r,
                            count: r.count + 1,
                            users: [...r.users, userId],
                          }
                        : r,
                    );
                  }
                } else {
                  // New reaction type
                  updatedReactions = [
                    ...currentReactions,
                    {
                      emoji: reaction,
                      count: 1,
                      users: [userId],
                    },
                  ];
                }

                return { ...m, reactions: updatedReactions };
              }),
            },
          }));

          // TODO: Implement reaction sending in consolidated service
        } catch (error) {
          // Revert optimistic change by reloading from service on next update
          reverted = true;
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

      // Message editing
      editMessage: async (roomId: string, messageId: string, newContent: string) => {
        const prevMessages = get().messages[roomId] || [];
        let didOptimisticallyUpdate = false;

        try {
          const { user } = await requireAuthentication("edit messages");

          // Find the original message for optimistic update
          const originalMessage = prevMessages.find((m) => m.id === messageId);
          if (!originalMessage) {
            throw new Error("Message not found");
          }

          // Optimistically update UI
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map((m) =>
                m.id === messageId ? { ...m, content: newContent, isEdited: true, editedAt: new Date() } : m,
              ),
            },
          }));
          didOptimisticallyUpdate = true;

          // Use the message edit service for validation and database update
          const updatedMessage = await messageEditService.editMessage(messageId, newContent, user.id);

          // Broadcast the edit event
          await messageEditService.broadcastEdit(messageId, roomId, newContent);

          // Update with the actual response from service
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map((m) =>
                m.id === messageId ? { ...m, ...updatedMessage, isEdited: true, editedAt: updatedMessage.editedAt } : m,
              ),
            },
          }));
        } catch (error) {
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          // Rollback optimistic update
          if (didOptimisticallyUpdate) {
            set((state) => ({
              messages: {
                ...state.messages,
                [roomId]: prevMessages,
              },
            }));
          }
          set({ error: appError.userMessage || (error as Error).message });
          throw appError;
        }
      },

      // Message forwarding
      forwardMessage: async (sourceMessage: ChatMessage, targetRoomId: string, comment?: string) => {
        try {
          const { user } = await requireAuthentication("forward messages");
          const senderName = getUserDisplayName(user);

          // Create optimistic message for UI
          const timestamp = Date.now();
          const optimisticMessageId = `forwarded_${timestamp}_${user.id}`;

          const forwardedMessage: ChatMessage = {
            id: optimisticMessageId,
            chatRoomId: targetRoomId,
            senderId: user.id,
            senderName,
            content: comment
              ? `${comment}



--- Forwarded message ---

${sourceMessage.content}`
              : `--- Forwarded message ---

${sourceMessage.content}`,
            messageType: sourceMessage.messageType,
            timestamp: new Date(timestamp),
            isRead: false,
            status: "pending",
            isOwn: true,
            forwardedFromId: sourceMessage.id,
            forwardedFromRoomId: sourceMessage.chatRoomId,
            forwardedFromSender: sourceMessage.senderName,
            // Copy media fields if applicable
            imageUri: sourceMessage.imageUri,
            videoUri: sourceMessage.videoUri,
            audioUri: sourceMessage.audioUri,
            audioDuration: sourceMessage.audioDuration,
            thumbnailUri: sourceMessage.thumbnailUri,
          };

          // Add optimistically
          set((state) => ({
            messages: {
              ...state.messages,
              [targetRoomId]: [...(state.messages[targetRoomId] || []), forwardedMessage],
            },
          }));

          // Use the forward service for validation and database operation
          const newMessage = await messageForwardService.forwardMessage(sourceMessage, targetRoomId, user.id, comment);

          // Update with real message from service
          set((state) => ({
            messages: {
              ...state.messages,
              [targetRoomId]:
                state.messages[targetRoomId]?.map((m) =>
                  m.id === optimisticMessageId ? { ...newMessage, status: "sent", isOwn: true } : m,
                ) || [],
            },
          }));
        } catch (error) {
          console.error("💥 Failed to forward message:", error);
          const appError = error instanceof AppError ? error : parseSupabaseError(error);

          // Remove optimistic message on failure
          set((state) => ({
            messages: {
              ...state.messages,
              [targetRoomId]: state.messages[targetRoomId]?.filter((m) => !m.id.startsWith("forwarded_")) || [],
            },
            error: appError.userMessage,
          }));

          throw appError;
        }
      },

      // Search messages
      searchMessages: async (roomId: string, query: string) => {
        try {
          set({ isLoading: true });

          const { data, error } = await supabase
            .from("chat_messages_firebase")
            .select("*")
            .eq("chat_room_id", roomId)
            .ilike("content", `%${query}%`)
            .order("created_at", { ascending: false })
            .limit(50);

          if (error) throw error;

          // Transform to ChatMessage format
          const messages: ChatMessage[] = (data || []).map((msg: any) => ({
            id: msg.id,
            chatRoomId: msg.chat_room_id,
            senderId: msg.sender_id,
            senderName: msg.sender_name || "Unknown",
            content: msg.content,
            messageType: msg.message_type,
            timestamp: new Date(msg.created_at),
            isRead: msg.is_read || false,
            isEdited: msg.is_edited,
            editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
            forwardedFromId: msg.forwarded_from_id,
            forwardedFromRoomId: msg.forwarded_from_room_id,
            forwardedFromSender: msg.forwarded_from_sender,
          }));

          return messages;
        } catch (error) {
          console.error("💥 Failed to search messages:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Scroll to message (this will be used by the UI)
      scrollToMessage: (messageId: string) => {
        // This is primarily a UI concern, but we can emit an event
        // that the UI components can listen to
        // The actual scrolling will be handled by the ChatRoomScreen
        // which has access to the FlashList ref
      },

      // Typing indicators with improved handling
      setTyping: (roomId: string, isTyping: boolean) => {
        const { user } = useAuthStore.getState();
        if (user) {
          // Send typing indicator via consolidated service
          consolidatedRealtimeService.sendTypingIndicator(roomId, user.id, getUserDisplayName(user), isTyping);
        }
      },

      // Pagination
      loadOlderMessages: async (roomId: string) => {
        try {
          set({ isLoading: true });

          const currentMessages = get().messages[roomId] || [];

          // Use performance-optimized pagination for large message lists
          if (currentMessages.length > 100) {
            const messages = await messagePaginationManager.loadNextBatch(
              roomId,
              undefined,
              async (room, cursor, limit) => {
                const result = await consolidatedRealtimeService.loadOlderMessages(
                  room,
                  cursor ||
                    (currentMessages[0]?.timestamp instanceof Date
                      ? currentMessages[0].timestamp.toISOString()
                      : currentMessages[0]?.timestamp
                        ? new Date(currentMessages[0].timestamp).toISOString()
                        : new Date().toISOString()),
                  limit,
                );
                return {
                  messages: result.messages,
                  cursor: result.messages[0]?.timestamp.toISOString() || null,
                  hasMore: result.messages.length === limit,
                };
              },
            );

            if (messages.length > 0) {
              const combined = [...messages, ...currentMessages];
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

              return { hasMore: messages.length === 20, loadedCount: messages.length };
            }

            set({ isLoading: false });
            return { hasMore: false, loadedCount: 0 };
          }

          // Standard pagination for smaller message lists
          if (currentMessages.length === 0) {
            set({ isLoading: false });
            return { hasMore: false, loadedCount: 0 };
          }

          const oldestMessage = currentMessages[0]!;
          const cursor =
            oldestMessage.timestamp instanceof Date
              ? oldestMessage.timestamp.toISOString()
              : new Date(oldestMessage.timestamp).toISOString();
          const batchSize = 20;
          const result = await consolidatedRealtimeService.loadOlderMessages(roomId, cursor, batchSize);
          const olderMessages = result.messages;

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

            // If we got fewer messages than requested, there are no more
            const hasMore = olderMessages.length === batchSize;
            return { hasMore, loadedCount: olderMessages.length };
          } else {
            set({ isLoading: false });
            return { hasMore: false, loadedCount: 0 };
          }
        } catch (error) {
          console.error("❌ Failed to load older messages:", error);
          const currentMessages = get().messages[roomId] || [];
          console.error("Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            roomId,
            currentMessageCount: currentMessages.length,
          });

          const errorMessage = error instanceof Error ? error.message : "Failed to load older messages";
          set({
            isLoading: false,
            error: errorMessage,
          });
          return { hasMore: false, loadedCount: 0 };
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
          // Load members directly from Supabase with user details
          const { data: membersData, error } = await supabase
            .from("chat_members_firebase")
            .select(
              `
              *,
              users (
                id,
                username,
                avatar_url
              )
            `,
            )
            .eq("chat_room_id", roomId)
            .eq("is_active", true);

          if (error) throw error;

          // Transform the data to match ChatMember interface
          const members: ChatMember[] = (membersData || []).map((member: any) => ({
            id: member.id,
            chatRoomId: member.chat_room_id,
            userId: member.user_id,
            userName: member.users?.username || "Unknown User",
            userAvatar: member.users?.avatar_url || null,
            joinedAt: new Date(member.joined_at || member.created_at),
            role: member.role as UserRole,
            isOnline: false, // Will be updated by presence
            lastSeen: new Date(member.updated_at || member.created_at),
          }));

          set((state) => ({
            members: {
              ...state.members,
              [roomId]: members,
            },
            isLoading: false,
          }));
        } catch (error) {
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

      // Real-time subscriptions management
      subscribeToChatRoom: (roomId: string) => {
        const { subscriptions } = get();

        // Prevent duplicate subscriptions
        if (subscriptions[roomId]) {
          return;
        }

        try {
          const subscription = supabase
            .channel(`room:${roomId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "chat_messages_firebase",
                filter: `chat_room_id=eq.${roomId}`,
              },
              (payload: any) => {
                if (payload.eventType === "INSERT") {
                  const newMessage = payload.new as ChatMessage;

                  // Use React 19 startTransition for non-urgent updates
                  startTransition(() => {
                    set((state) => ({
                      messages: {
                        ...state.messages,
                        [roomId]: [...(state.messages[roomId] || []), newMessage].sort(
                          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
                        ),
                      },
                    }));
                  });
                }
              },
            )
            .subscribe((status: any) => {
              if (status === "SUBSCRIBED") {
              } else if (status === "CHANNEL_ERROR") {
                console.error(`Failed to subscribe to room ${roomId}`);
                // Retry logic
                setTimeout(() => {
                  get().subscribeToChatRoom(roomId);
                }, 5000);
              }
            });

          set((state) => ({
            subscriptions: {
              ...state.subscriptions,
              [roomId]: subscription,
            },
          }));
        } catch (error) {
          console.error("Error subscribing to chat room:", error);
        }
      },

      unsubscribeFromChatRoom: async (roomId: string) => {
        const { subscriptions } = get();
        const subscription = subscriptions[roomId];

        if (subscription) {
          try {
            await subscription.unsubscribe();

            set((state) => {
              const newSubscriptions = { ...state.subscriptions };
              delete newSubscriptions[roomId];
              return { subscriptions: newSubscriptions };
            });
          } catch (error) {
            console.error("Error unsubscribing from chat room:", error);
          }
        }
      },

      clearOldMessages: (daysToKeep: number = 7) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        set((state) => {
          const newMessages: typeof state.messages = {};

          Object.keys(state.messages).forEach((roomId) => {
            const roomMessages = state.messages[roomId];
            if (roomMessages) {
              newMessages[roomId] = roomMessages.filter((msg) => new Date(msg.timestamp) > cutoffDate);
            }
          });

          return { messages: newMessages };
        });
      },

      // Handle AppState changes
      handleAppStateChange: async (nextState: string, prevState: string) => {
        // This method is called by the AppStateManager
        // The actual logic is handled by the registered callbacks
      },

      // Reconnect all active rooms after network recovery or foreground
      reconnectAllRooms: async () => {
        try {
          // Use reliable network check first
          const networkStatus = await reliableNetworkCheck();
          if (!networkStatus.isConnected || !networkStatus.isStable) {
            return;
          }

          // Get the authenticated user
          const authResult = await requireAuthentication("reconnect to chat");
          const userName = getUserDisplayName(authResult.user);

          // Resume all subscriptions through the consolidated service
          await consolidatedRealtimeService.resumeAll(authResult.user.id, userName);

          // If there's a current room, optionally re-join it to refresh local state
          const { currentChatRoom } = get();
          if (currentChatRoom) {
            await get().joinChatRoom(currentChatRoom.id);
          }
        } catch (error) {
          console.error("[ChatStore] Failed to reconnect rooms:", error);
          set({ error: "Failed to reconnect to chat rooms" });
        }
      },

      // Cleanup all subscriptions and connections
      cleanup: async () => {
        try {
          // Unregister from AppState manager
          appStateManager.unregisterListener("chatStore");

          // Cleanup AppState callbacks
          const { subscriptions } = get();
          if (subscriptions.appStateForeground) {
            subscriptions.appStateForeground();
          }
          if (subscriptions.appStateBackground) {
            subscriptions.appStateBackground();
          }

          // Cleanup all real-time subscriptions
          const unsubscribePromises = Object.entries(subscriptions).map(async ([roomId, subscription]) => {
            try {
              if (typeof subscription === "function") {
                subscription();
              } else if (subscription && typeof subscription.unsubscribe === "function") {
                await subscription.unsubscribe();
              }
            } catch (error) {
              console.error("Error during subscription cleanup:", error);
            }
          });

          await Promise.allSettled(unsubscribePromises);

          // Unsubscribe from connection status changes
          const currentState = get();
          if (currentState.subscriptions.connectionStatus) {
            currentState.subscriptions.connectionStatus();
          }

          await consolidatedRealtimeService.cleanup();
          set({
            connectionStatus: "disconnected",
            currentChatRoom: null,
            typingUsers: [],
            onlineUsers: [],
            error: null,
            subscriptions: {},
          });
          if (netUnsubscribe) {
            netUnsubscribe();
            netUnsubscribe = null;
          }
        } catch (error) {
          console.error("Error during cleanup:", error);
        }
      },

      // Process offline queue
      processOfflineQueue: async () => {
        try {
          const offlineActions = JSON.parse((await AsyncStorage.getItem("offline_actions")) || "[]");
          if (offlineActions.length === 0) return;

          const { user } = useAuthStore.getState();
          if (!user) return;

          const senderName = getUserDisplayName(user);

          for (const action of offlineActions) {
            if (action.type === "sendMessage") {
              await consolidatedRealtimeService.sendMessage(
                action.roomId,
                action.content,
                user.id,
                senderName,
                "text",
                action.replyTo,
              );

              // Remove optimistic offline message if exists
              set((state) => ({
                messages: {
                  ...state.messages,
                  [action.roomId]: (state.messages[action.roomId] || []).filter(
                    (msg) => !msg.id.startsWith("offline_"),
                  ),
                },
              }));
            }
          }

          await AsyncStorage.setItem("offline_actions", JSON.stringify([]));
        } catch (error) {
          console.error("Failed to process offline queue:", error);
        }
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => mmkvStorage),
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
        } catch (error) {
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
          }
        }
      },
    },
  ),
);
export default useChatStore;
