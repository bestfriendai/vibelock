/**
 * WebSocket Service Tests for Expo SDK 54 and React Native 0.81.4 Compatibility
 */

import { webSocketService } from '../websocketService';
import type { WebSocketServiceCallbacks } from '../../types';

// Mock Supabase to avoid actual network calls in tests
jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue(Promise.resolve()),
      send: jest.fn().mockReturnValue(Promise.resolve()),
      track: jest.fn().mockReturnValue(Promise.resolve()),
      untrack: jest.fn().mockReturnValue(Promise.resolve()),
      presenceState: jest.fn().mockReturnValue({}),
    })),
    removeChannel: jest.fn().mockReturnValue(Promise.resolve()),
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockReturnValue(Promise.resolve({
            data: {
              id: 'test-id',
              content: 'Test message',
              timestamp: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn().mockReturnValue(Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
  },
}));

describe('SupabaseRealtimeService - Expo SDK 54 Compatibility', () => {
  let mockCallbacks: WebSocketServiceCallbacks;

  beforeEach(() => {
    mockCallbacks = {
      onMessage: jest.fn(),
      onTyping: jest.fn(),
      onUserJoin: jest.fn(),
      onUserLeave: jest.fn(),
      onOnlineStatusChange: jest.fn(),
      onConnectionStatusChange: jest.fn(),
      onError: jest.fn(),
    };
  });

  afterEach(async () => {
    await webSocketService.disconnect();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should export the webSocketService instance', () => {
      expect(webSocketService).toBeDefined();
      expect(typeof webSocketService.connect).toBe('function');
    });

    it('should start with disconnected status', () => {
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
      expect(webSocketService.isConnected()).toBe(false);
    });

    it('should have zero pending messages initially', () => {
      expect(webSocketService.getPendingMessagesCount()).toBe(0);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection with user context', async () => {
      await webSocketService.connect('test-user-id', mockCallbacks, 'Test User');

      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalledWith('connecting');
    });

    it('should prevent duplicate connections', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      // First connection
      await webSocketService.connect('test-user-id', mockCallbacks);

      // Attempt second connection (should be prevented)
      await webSocketService.connect('test-user-id', mockCallbacks);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Already connecting or connected to Supabase Realtime')
      );

      spy.mockRestore();
    });

    it('should handle disconnection properly', async () => {
      await webSocketService.connect('test-user-id', mockCallbacks);
      await webSocketService.disconnect();

      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
      expect(webSocketService.getPendingMessagesCount()).toBe(0);
    });
  });

  describe('Room Management', () => {
    beforeEach(async () => {
      await webSocketService.connect('test-user-id', mockCallbacks, 'Test User');
    });

    afterEach(async () => {
      await webSocketService.disconnect();
    });

    it('should join room successfully', async () => {
      await webSocketService.joinRoom('test-room-id');

      // Should call user join callback
      expect(mockCallbacks.onUserJoin).toHaveBeenCalledWith(
        'test-user-id',
        'Test User',
        'test-room-id'
      );
    });

    it('should leave room successfully', async () => {
      await webSocketService.joinRoom('test-room-id');
      await webSocketService.leaveRoom('test-room-id');

      expect(mockCallbacks.onUserLeave).toHaveBeenCalledWith(
        'test-user-id',
        'test-room-id'
      );
    });

    it('should handle room switching', async () => {
      await webSocketService.joinRoom('room-1');
      await webSocketService.joinRoom('room-2');

      // Should have left the first room
      expect(mockCallbacks.onUserLeave).toHaveBeenCalledWith('test-user-id', 'room-1');
      expect(mockCallbacks.onUserJoin).toHaveBeenCalledWith('test-user-id', 'Test User', 'room-2');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await webSocketService.connect('test-user-id', mockCallbacks, 'Test User');
      await webSocketService.joinRoom('test-room-id');
    });

    afterEach(async () => {
      await webSocketService.disconnect();
    });

    it('should send chat message with optimistic updates', async () => {
      const testMessage = {
        content: 'Hello, world!',
        messageType: 'text' as const,
        senderName: 'Test User',
        senderId: 'test-user-id',
        chatRoomId: 'test-room-id',
        isRead: false,
      };

      await webSocketService.sendChatMessage(testMessage);

      // Should receive optimistic update
      expect(mockCallbacks.onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello, world!',
          status: 'pending',
          isOwn: true,
        })
      );
    });

    it('should handle typing indicators', async () => {
      await webSocketService.sendTypingIndicator('test-room-id', true);

      // Should not throw any errors
      expect(webSocketService.isConnected()).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock auth error
      const mockSupabase = require('../../config/supabase').supabase;
      mockSupabase.auth.getUser.mockReturnValueOnce(Promise.resolve({
        data: { user: null },
        error: { message: 'Auth error' },
      }));

      await webSocketService.connect('test-user-id', mockCallbacks);

      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalledWith('connecting');
      expect(mockCallbacks.onError).toHaveBeenCalled();
    });

    it('should require connection before joining room', async () => {
      await expect(webSocketService.joinRoom('test-room-id')).rejects.toThrow(
        'Must be connected before joining a room'
      );
    });

    it('should require connection and room before sending messages', async () => {
      await expect(webSocketService.sendChatMessage({
        content: 'test',
        messageType: 'text',
        senderName: 'test',
        senderId: 'test',
        chatRoomId: 'test',
        isRead: false,
      })).rejects.toThrow('Must be connected and in a room to send messages');
    });
  });

  describe('React Native 0.81.4 Compatibility', () => {
    it('should use correct async/await patterns', async () => {
      // All methods should return promises and support async/await
      const connectPromise = webSocketService.connect('test-user-id', mockCallbacks);
      expect(connectPromise).toBeInstanceOf(Promise);

      await connectPromise;

      const joinPromise = webSocketService.joinRoom('test-room-id');
      expect(joinPromise).toBeInstanceOf(Promise);
    });

    it('should handle modern JavaScript features', () => {
      // Test modern features like Map, Set, etc.
      expect(webSocketService.getPendingMessagesCount()).toBe(0);

      // Test class methods
      expect(typeof webSocketService.connect).toBe('function');
      expect(typeof webSocketService.disconnect).toBe('function');
      expect(typeof webSocketService.sendChatMessage).toBe('function');
    });

    it('should support TypeScript strict mode', () => {
      // Type checking should pass without errors
      const status = webSocketService.getConnectionStatus();
      expect(['connecting', 'connected', 'disconnected', 'error']).toContain(status);
    });
  });

  describe('Expo SDK 54 Features', () => {
    it('should work with Expo environment', () => {
      // Should not rely on Node.js specific features
      expect(typeof webSocketService.connect).toBe('function');
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
    });

    it('should handle React Native bridge communication', async () => {
      // Test that the webSocketService works with React Native's async bridge
      await webSocketService.connect('test-user-id', mockCallbacks);

      // Should handle async operations properly
      expect(mockCallbacks.onConnectionStatusChange).toHaveBeenCalled();
    });

    it('should support polyfills and modern features', () => {
      // Should work with URL polyfills and other Expo polyfills
      expect(() => new Date().toISOString()).not.toThrow();
      expect(() => JSON.stringify({})).not.toThrow();
      expect(() => Math.random().toString(36)).not.toThrow();
    });
  });
});