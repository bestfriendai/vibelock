import { ChatMessage, ConnectionStatus, TypingUser } from "../types";

export interface WebSocketMessage {
  type: "message" | "typing" | "join" | "leave" | "online_status" | "error";
  data: any;
  timestamp: Date;
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

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketServiceCallbacks | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private currentUserId: string | null = null;
  private currentChatRoomId: string | null = null;

  // Mock WebSocket URL - in production this would be your actual WebSocket server
  private readonly WS_URL = "ws://localhost:8080/chat";

  constructor() {
    // For development, we'll simulate WebSocket behavior
    this.simulateWebSocketConnection();
  }

  connect(userId: string, callbacks: WebSocketServiceCallbacks) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.currentUserId = userId;
    this.callbacks = callbacks;
    this.isConnecting = true;

    callbacks.onConnectionStatusChange("connecting");

    // In development, simulate connection
    this.simulateConnection();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.callbacks?.onConnectionStatusChange("disconnected");
  }

  joinRoom(chatRoomId: string) {
    this.currentChatRoomId = chatRoomId;
    this.sendMessage({
      type: "join",
      data: { chatRoomId, userId: this.currentUserId },
      timestamp: new Date(),
    });
  }

  leaveRoom(chatRoomId: string) {
    this.sendMessage({
      type: "leave",
      data: { chatRoomId, userId: this.currentUserId },
      timestamp: new Date(),
    });

    if (this.currentChatRoomId === chatRoomId) {
      this.currentChatRoomId = null;
    }
  }

  sendChatMessage(message: Omit<ChatMessage, "id" | "timestamp">) {
    const wsMessage: WebSocketMessage = {
      type: "message",
      data: {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    this.sendMessage(wsMessage);
  }

  sendTypingIndicator(chatRoomId: string, isTyping: boolean) {
    this.sendMessage({
      type: "typing",
      data: {
        chatRoomId,
        userId: this.currentUserId,
        isTyping,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    });
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  private simulateWebSocketConnection() {
    // For development, we simulate WebSocket behavior with timeouts
    // In production, this would be replaced with actual WebSocket logic
  }

  private simulateConnection() {
    // Simulate connection delay
    setTimeout(() => {
      this.isConnecting = false;
      this.callbacks?.onConnectionStatusChange("connected");
      this.startHeartbeat();
      this.processMessageQueue();

      // Simulate receiving some initial data
      this.simulateInitialData();
    }, 1000);
  }

  private simulateInitialData() {
    // Simulate online users
    setTimeout(() => {
      this.callbacks?.onOnlineStatusChange(["user1", "user2", "user3"]);
    }, 500);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping", timestamp: new Date() }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        if (this.currentUserId && this.callbacks) {
          this.connect(this.currentUserId, this.callbacks);
        }
      }, delay);
    } else {
      this.callbacks?.onConnectionStatusChange("error");
      this.callbacks?.onError("Failed to reconnect after maximum attempts");
    }
  }

  // Simulate receiving messages for development
  simulateIncomingMessage(message: ChatMessage) {
    this.callbacks?.onMessage(message);
  }

  simulateTypingUser(typingUser: TypingUser) {
    this.callbacks?.onTyping(typingUser);
  }

  simulateUserJoin(userId: string, userName: string, chatRoomId: string) {
    this.callbacks?.onUserJoin(userId, userName, chatRoomId);
  }

  simulateUserLeave(userId: string, chatRoomId: string) {
    this.callbacks?.onUserLeave(userId, chatRoomId);
  }

  getConnectionStatus(): ConnectionStatus {
    if (!this.ws) return "disconnected";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "error";
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
