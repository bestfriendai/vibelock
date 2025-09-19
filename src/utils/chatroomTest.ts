/**
 * Comprehensive Chatroom Functionality Test
 * Tests the complete authentication and chatroom flow
 */

import { supabase } from "../config/supabase";
import { authService } from "../services/auth";
import { enhancedRealtimeChatService } from "../services/realtimeChat";
import { requireAuthentication } from "./authUtils";
import useAuthStore from "../state/authStore";
import useChatStore from "../state/chatStore";

interface TestResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

export class ChatroomTester {
  private results: TestResult[] = [];

  private addResult(step: string, success: boolean, error?: string, data?: any) {
    this.results.push({ step, success, error, data });
    console.log(`${success ? '✅' : '❌'} ${step}${error ? `: ${error}` : ''}`);
  }

  async runCompleteTest(): Promise<TestResult[]> {
    console.log("🧪 Starting comprehensive chatroom functionality test...");
    this.results = [];

    try {
      // Test 1: Database Connection
      await this.testDatabaseConnection();
      
      // Test 2: Authentication State
      await this.testAuthenticationState();
      
      // Test 3: Chat Rooms Loading
      await this.testChatRoomsLoading();
      
      // Test 4: Real-time Service Initialization
      await this.testRealtimeServiceInit();
      
      // Test 5: Chat Room Joining
      await this.testChatRoomJoining();
      
      // Test 6: Message Sending
      await this.testMessageSending();
      
      // Test 7: Message Loading
      await this.testMessageLoading();
      
      // Test 8: Connection Status
      await this.testConnectionStatus();

    } catch (error) {
      this.addResult("Complete Test", false, `Test suite failed: ${error}`);
    }

    console.log("\n📊 Test Results Summary:");
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    console.log(`${passed}/${total} tests passed`);
    
    if (passed < total) {
      console.log("\n❌ Failed tests:");
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.step}: ${r.error}`);
      });
    }

    return this.results;
  }

  private async testDatabaseConnection() {
    try {
      const { data, error } = await supabase
        .from("chat_rooms_firebase")
        .select("count")
        .limit(1);
      
      if (error) throw error;
      this.addResult("Database Connection", true, undefined, { connected: true });
    } catch (error) {
      this.addResult("Database Connection", false, `${error}`);
    }
  }

  private async testAuthenticationState() {
    try {
      const authState = useAuthStore.getState();
      const isAuthenticated = authState.isAuthenticated && !!authState.user && !authState.isGuestMode;
      
      if (!isAuthenticated) {
        this.addResult("Authentication State", false, "User not authenticated or in guest mode");
        return;
      }

      // Test requireAuthentication function
      const { user, supabaseUser } = await requireAuthentication("test authentication");
      
      this.addResult("Authentication State", true, undefined, {
        hasUser: !!user,
        hasSupabaseUser: !!supabaseUser,
        userId: user?.id?.slice(-8)
      });
    } catch (error) {
      this.addResult("Authentication State", false, `${error}`);
    }
  }

  private async testChatRoomsLoading() {
    try {
      const chatStore = useChatStore.getState();
      await chatStore.loadChatRooms();
      
      const rooms = chatStore.chatRooms;
      this.addResult("Chat Rooms Loading", true, undefined, { 
        roomCount: rooms.length,
        rooms: rooms.slice(0, 3).map(r => ({ id: r.id.slice(-8), name: r.name }))
      });
    } catch (error) {
      this.addResult("Chat Rooms Loading", false, `${error}`);
    }
  }

  private async testRealtimeServiceInit() {
    try {
      await enhancedRealtimeChatService.initialize();
      this.addResult("Real-time Service Init", true, undefined, { 
        initialized: true,
        activeChannels: enhancedRealtimeChatService.getActiveChannelsCount()
      });
    } catch (error) {
      this.addResult("Real-time Service Init", false, `${error}`);
    }
  }

  private async testChatRoomJoining() {
    try {
      const chatStore = useChatStore.getState();
      const rooms = chatStore.chatRooms;
      
      if (rooms.length === 0) {
        this.addResult("Chat Room Joining", false, "No chat rooms available to join");
        return;
      }

      const testRoom = rooms[0];
      await chatStore.joinChatRoom(testRoom.id);
      
      this.addResult("Chat Room Joining", true, undefined, {
        roomId: testRoom.id.slice(-8),
        roomName: testRoom.name,
        currentRoom: !!chatStore.currentChatRoom
      });
    } catch (error) {
      this.addResult("Chat Room Joining", false, `${error}`);
    }
  }

  private async testMessageSending() {
    try {
      const chatStore = useChatStore.getState();
      const currentRoom = chatStore.currentChatRoom;
      
      if (!currentRoom) {
        this.addResult("Message Sending", false, "No current chat room");
        return;
      }

      const testMessage = `Test message from chatroom tester - ${new Date().toISOString()}`;
      await chatStore.sendMessage(currentRoom.id, testMessage);
      
      this.addResult("Message Sending", true, undefined, {
        roomId: currentRoom.id.slice(-8),
        messageContent: testMessage.slice(0, 50)
      });
    } catch (error) {
      this.addResult("Message Sending", false, `${error}`);
    }
  }

  private async testMessageLoading() {
    try {
      const chatStore = useChatStore.getState();
      const currentRoom = chatStore.currentChatRoom;
      
      if (!currentRoom) {
        this.addResult("Message Loading", false, "No current chat room");
        return;
      }

      await chatStore.loadMessages(currentRoom.id);
      const messages = chatStore.messages[currentRoom.id] || [];
      
      this.addResult("Message Loading", true, undefined, {
        roomId: currentRoom.id.slice(-8),
        messageCount: messages.length,
        latestMessage: messages[messages.length - 1]?.content?.slice(0, 30)
      });
    } catch (error) {
      this.addResult("Message Loading", false, `${error}`);
    }
  }

  private async testConnectionStatus() {
    try {
      const chatStore = useChatStore.getState();
      const connectionStatus = chatStore.connectionStatus;
      
      const isHealthy = connectionStatus === "connected";
      this.addResult("Connection Status", isHealthy, 
        isHealthy ? undefined : `Connection status is ${connectionStatus}`, 
        { 
          status: connectionStatus,
          error: chatStore.error,
          activeChannels: enhancedRealtimeChatService.getActiveChannelsCount()
        }
      );
    } catch (error) {
      this.addResult("Connection Status", false, `${error}`);
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getFailedTests(): TestResult[] {
    return this.results.filter(r => !r.success);
  }

  getPassedTests(): TestResult[] {
    return this.results.filter(r => r.success);
  }
}

// Export singleton instance
export const chatroomTester = new ChatroomTester();

// Helper function to run quick test
export const runChatroomTest = async (): Promise<TestResult[]> => {
  return await chatroomTester.runCompleteTest();
};
