import { ChatRoom, ChatMessage, ChatMember } from "../types";

// Mock API service for chat functionality
// In production, these would be actual API calls to your backend

export interface ChatApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

class ChatApiService {
  private baseDelay = 500; // Simulate network delay

  private async simulateNetworkDelay(delay = this.baseDelay): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Chat Rooms API
  async getChatRooms(): Promise<ChatApiResponse<ChatRoom[]>> {
    try {
      await this.simulateNetworkDelay();

      const rooms: ChatRoom[] = [
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
            timestamp: new Date(Date.now() - 300000),
            isRead: false,
          },
          lastActivity: new Date(Date.now() - 300000),
          isActive: true,
          location: { city: "Washington", state: "DC" },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
        {
          id: "room_local_alexandria",
          name: "Alexandria & Arlington",
          description: "Local chat for Alexandria and Arlington area",
          type: "local",
          memberCount: 89,
          onlineCount: 12,
          lastMessage: {
            id: "msg_2",
            chatRoomId: "room_local_alexandria",
            senderId: "user_789",
            senderName: "Mike R.",
            content: "Great coffee shop recommendations in Old Town?",
            messageType: "text",
            timestamp: new Date(Date.now() - 600000),
            isRead: false,
          },
          lastActivity: new Date(Date.now() - 600000),
          isActive: true,
          location: { city: "Alexandria", state: "VA" },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
        {
          id: "room_topic_dating_tips",
          name: "Dating Tips & Advice",
          description: "Share and get advice on dating, relationships, and meeting people",
          type: "topic",
          memberCount: 234,
          onlineCount: 45,
          lastMessage: {
            id: "msg_3",
            chatRoomId: "room_topic_dating_tips",
            senderId: "user_321",
            senderName: "Jessica L.",
            content: "What's everyone's take on first date locations?",
            messageType: "text",
            timestamp: new Date(Date.now() - 900000),
            isRead: false,
          },
          lastActivity: new Date(Date.now() - 900000),
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
        {
          id: "room_topic_success_stories",
          name: "Success Stories",
          description: "Share your dating success stories and celebrate wins",
          type: "topic",
          memberCount: 156,
          onlineCount: 31,
          lastMessage: {
            id: "msg_4",
            chatRoomId: "room_topic_success_stories",
            senderId: "user_654",
            senderName: "Alex T.",
            content: "Just wanted to thank everyone for the advice! Had an amazing third date last night 💕",
            messageType: "text",
            timestamp: new Date(Date.now() - 1800000),
            isRead: false,
          },
          lastActivity: new Date(Date.now() - 1800000),
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
        {
          id: "room_topic_red_flags",
          name: "Red Flags Discussion",
          description: "Discuss and identify dating red flags to help each other stay safe",
          type: "topic",
          memberCount: 198,
          onlineCount: 27,
          lastMessage: {
            id: "msg_5",
            chatRoomId: "room_topic_red_flags",
            senderId: "user_987",
            senderName: "Taylor K.",
            content: "Trust your gut feeling - it's usually right",
            messageType: "text",
            timestamp: new Date(Date.now() - 2700000),
            isRead: false,
          },
          lastActivity: new Date(Date.now() - 2700000),
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
        {
          id: "room_global",
          name: "Global Chat",
          description: "Open discussion for everyone - all topics welcome",
          type: "global",
          memberCount: 542,
          onlineCount: 89,
          lastMessage: {
            id: "msg_6",
            chatRoomId: "room_global",
            senderId: "user_111",
            senderName: "Jordan P.",
            content: "Good morning everyone! Hope you all have a great day ☀️",
            messageType: "text",
            timestamp: new Date(Date.now() - 3600000),
            isRead: false,
          },
          lastActivity: new Date(Date.now() - 3600000),
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
      ];

      return {
        data: rooms,
        success: true,
      };
    } catch {
      return {
        data: [],
        success: false,
        message: "Failed to fetch chat rooms",
      };
    }
  }

  async getChatRoom(roomId: string): Promise<ChatApiResponse<ChatRoom | null>> {
    try {
      await this.simulateNetworkDelay();

      const rooms = await this.getChatRooms();
      const room = rooms.data.find((r) => r.id === roomId);

      return {
        data: room || null,
        success: true,
      };
    } catch {
      return {
        data: null,
        success: false,
        message: "Failed to fetch chat room",
      };
    }
  }

  // Messages API
  async getChatMessages(
    roomId: string,
    page = 1,
    limit = 50,
  ): Promise<ChatApiResponse<PaginatedResponse<ChatMessage>>> {
    try {
      await this.simulateNetworkDelay();

      // Generate mock messages for the room
      const mockMessages: ChatMessage[] = this.generateMockMessages(roomId, limit);

      return {
        data: {
          data: mockMessages,
          pagination: {
            page,
            limit,
            total: mockMessages.length,
            hasMore: false,
          },
        },
        success: true,
      };
    } catch {
      return {
        data: {
          data: [],
          pagination: { page, limit, total: 0, hasMore: false },
        },
        success: false,
        message: "Failed to fetch messages",
      };
    }
  }

  async sendMessage(
    roomId: string,
    content: string,
    senderId: string,
    senderName: string,
  ): Promise<ChatApiResponse<ChatMessage>> {
    try {
      await this.simulateNetworkDelay(200);

      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        chatRoomId: roomId,
        senderId,
        senderName,
        content,
        messageType: "text",
        timestamp: new Date(),
        isRead: true,
        isOwn: true,
      };

      return {
        data: message,
        success: true,
      };
    } catch {
      return {
        data: {} as ChatMessage,
        success: false,
        message: "Failed to send message",
      };
    }
  }

  // Members API
  async getChatMembers(roomId: string): Promise<ChatApiResponse<ChatMember[]>> {
    try {
      await this.simulateNetworkDelay();

      const mockMembers: ChatMember[] = [
        {
          id: "member_1",
          chatRoomId: roomId,
          userId: "user_456",
          userName: "Sarah M.",
          userAvatar: "https://picsum.photos/100/100?random=1",
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
          userAvatar: "https://picsum.photos/100/100?random=2",
          joinedAt: new Date(Date.now() - 172800000),
          role: "member",
          isOnline: false,
          lastSeen: new Date(Date.now() - 3600000),
        },
        {
          id: "member_3",
          chatRoomId: roomId,
          userId: "user_321",
          userName: "Jessica L.",
          userAvatar: "https://picsum.photos/100/100?random=3",
          joinedAt: new Date(Date.now() - 259200000),
          role: "moderator",
          isOnline: true,
          lastSeen: new Date(),
        },
        {
          id: "member_4",
          chatRoomId: roomId,
          userId: "user_654",
          userName: "Alex T.",
          userAvatar: "https://picsum.photos/100/100?random=4",
          joinedAt: new Date(Date.now() - 345600000),
          role: "member",
          isOnline: false,
          lastSeen: new Date(Date.now() - 7200000),
        },
      ];

      return {
        data: mockMembers,
        success: true,
      };
    } catch {
      return {
        data: [],
        success: false,
        message: "Failed to fetch members",
      };
    }
  }

  async joinChatRoom(roomId: string, userId: string): Promise<ChatApiResponse<boolean>> {
    try {
      await this.simulateNetworkDelay();

      // Simulate joining room
      return {
        data: true,
        success: true,
        message: "Successfully joined chat room",
      };
    } catch {
      return {
        data: false,
        success: false,
        message: "Failed to join chat room",
      };
    }
  }

  async leaveChatRoom(roomId: string, userId: string): Promise<ChatApiResponse<boolean>> {
    try {
      await this.simulateNetworkDelay();

      // Simulate leaving room
      return {
        data: true,
        success: true,
        message: "Successfully left chat room",
      };
    } catch {
      return {
        data: false,
        success: false,
        message: "Failed to leave chat room",
      };
    }
  }

  // Helper method to generate mock messages
  private generateMockMessages(roomId: string, count: number): ChatMessage[] {
    const sampleMessages = [
      "Hey everyone! How's everyone doing today?",
      "Just joined this room, excited to meet new people!",
      "Anyone have recommendations for good date spots?",
      "Welcome to the community! 👋",
      "Great discussion everyone, thanks for the advice",
      "Has anyone tried that new restaurant downtown?",
      "Looking forward to chatting with you all",
      "Thanks for the warm welcome!",
      "Hope everyone is having a great day",
      "This community is so supportive, love it here",
    ];

    const sampleUsers = [
      { id: "user_456", name: "Sarah M." },
      { id: "user_789", name: "Mike R." },
      { id: "user_321", name: "Jessica L." },
      { id: "user_654", name: "Alex T." },
      { id: "user_987", name: "Taylor K." },
      { id: "user_111", name: "Jordan P." },
    ];

    const messages: ChatMessage[] = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      const content = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const timestamp = new Date(Date.now() - i * 300000 - Math.random() * 300000);

      if (!user) continue; // Skip if user is undefined (shouldn't happen with our array)

      messages.unshift({
        id: `msg_${roomId}_${i}`,
        chatRoomId: roomId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: `https://picsum.photos/100/100?random=${i + 10}`,
        content: content || "Hello!",
        messageType: "text",
        timestamp,
        isRead: true,
        isOwn: user.id === "current_user",
      });
    }

    return messages;
  }
}

// Export singleton instance
export const chatApi = new ChatApiService();
