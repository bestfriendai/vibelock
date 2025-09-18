/**
 * @experimental This store is part of a planned modularization effort
 * but is NOT YET INTEGRATED into the UI. Do not use in production code.
 * See src/state/README.md for details.
 */

import { create } from "zustand";
import { Message } from "../types";
import { chatService } from "../services/chat";
import { createMessageDeduplicator } from "../utils/messageDeduplication";

interface MessagesState {
  messages: Map<string, Message[]>;
  optimisticMessages: Map<string, Message>;
  loadingStates: Map<string, boolean>;
  errors: Map<string, Error>;
  deduplicator: ReturnType<typeof createMessageDeduplicator>;

  getMessages: (roomId: string) => Message[];
  addMessage: (message: Message) => void;
  addOptimisticMessage: (message: Message) => void;
  confirmOptimisticMessage: (tempId: string, confirmedMessage: Message) => void;
  removeOptimisticMessage: (tempId: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  loadMessages: (roomId: string, before?: string) => Promise<void>;
  clearRoomMessages: (roomId: string) => void;
  clearAllMessages: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: new Map(),
  optimisticMessages: new Map(),
  loadingStates: new Map(),
  errors: new Map(),
  deduplicator: createMessageDeduplicator(),

  getMessages: (roomId: string) => {
    const roomMessages = get().messages.get(roomId) || [];
    const optimistic = Array.from(get().optimisticMessages.values()).filter((msg) => msg.chatRoomId === roomId);
    return [...roomMessages, ...optimistic].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  },

  addMessage: (message: Message) => {
    const { messages, deduplicator } = get();

    // Ensure message has an ID
    const messageWithId = message.id ? message : { ...message, id: `msg_${Date.now()}_${Math.random()}` };

    if (!deduplicator.addMessage(messageWithId)) {
      return;
    }

    const roomMessages = messages.get(messageWithId.chatRoomId) || [];
    const updatedMessages = [...roomMessages, messageWithId].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const newMessages = new Map(messages);
    newMessages.set(messageWithId.chatRoomId, updatedMessages);

    set({ messages: newMessages });
  },

  addOptimisticMessage: (message: Message) => {
    // Ensure message has an ID for optimistic updates
    const messageWithId = message.id ? message : { ...message, id: `temp_${Date.now()}_${Math.random()}` };
    set((state) => ({
      optimisticMessages: new Map(state.optimisticMessages).set(messageWithId.id, messageWithId),
    }));
  },

  confirmOptimisticMessage: (tempId: string, confirmedMessage: Message) => {
    const { optimisticMessages, addMessage } = get();

    const newOptimistic = new Map(optimisticMessages);
    newOptimistic.delete(tempId);

    set({ optimisticMessages: newOptimistic });
    addMessage(confirmedMessage);
  },

  removeOptimisticMessage: (tempId: string) => {
    set((state) => {
      const newOptimistic = new Map(state.optimisticMessages);
      newOptimistic.delete(tempId);
      return { optimisticMessages: newOptimistic };
    });
  },

  updateMessage: (messageId: string, updates: Partial<Message>) => {
    set((state) => {
      const newMessages = new Map(state.messages);

      for (const [roomId, roomMessages] of newMessages) {
        const index = roomMessages.findIndex((msg) => msg.id === messageId);
        if (index !== -1) {
          const updatedMessages = [...roomMessages];
          const currentMessage = updatedMessages[index];
          if (currentMessage) {
            const updatedMessage: Message = {
              ...currentMessage,
              ...updates,
              // Ensure required fields are never undefined
              id: messageId,
              chatRoomId: currentMessage.chatRoomId,
              senderId: currentMessage.senderId,
              senderName: currentMessage.senderName,
              content: updates.content ?? currentMessage.content,
              messageType: updates.messageType ?? currentMessage.messageType,
              timestamp: updates.timestamp ?? currentMessage.timestamp,
              isRead: updates.isRead ?? currentMessage.isRead,
            };
            updatedMessages[index] = updatedMessage;
            newMessages.set(roomId, updatedMessages);
          }
          break;
        }
      }

      return { messages: newMessages };
    });
  },

  deleteMessage: (messageId: string) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      state.deduplicator.removeMessage(messageId);

      for (const [roomId, roomMessages] of newMessages) {
        const filtered = roomMessages.filter((msg) => msg.id !== messageId);
        if (filtered.length !== roomMessages.length) {
          newMessages.set(roomId, filtered);
          break;
        }
      }

      return { messages: newMessages };
    });
  },

  loadMessages: async (roomId: string, before?: string) => {
    const { loadingStates, errors } = get();

    if (loadingStates.get(roomId)) return;

    set((state) => ({
      loadingStates: new Map(state.loadingStates).set(roomId, true),
      errors: new Map(state.errors).set(roomId, undefined as any),
    }));

    try {
      const newMessages = await chatService.getMessages(roomId, 50, before);

      set((state) => {
        const existingMessages = state.messages.get(roomId) || [];
        const deduplicatedMessages = state.deduplicator.deduplicateMessages([...newMessages, ...existingMessages]);

        return {
          messages: new Map(state.messages).set(roomId, deduplicatedMessages),
          loadingStates: new Map(state.loadingStates).set(roomId, false),
        };
      });
    } catch (error) {
      set((state) => ({
        errors: new Map(state.errors).set(roomId, error as Error),
        loadingStates: new Map(state.loadingStates).set(roomId, false),
      }));
    }
  },

  clearRoomMessages: (roomId: string) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.delete(roomId);

      const newOptimistic = new Map(state.optimisticMessages);
      for (const [id, msg] of newOptimistic) {
        if (msg.chatRoomId === roomId) {
          newOptimistic.delete(id);
        }
      }

      return {
        messages: newMessages,
        optimisticMessages: newOptimistic,
      };
    });
  },

  clearAllMessages: () => {
    get().deduplicator.clear();
    set({
      messages: new Map(),
      optimisticMessages: new Map(),
      loadingStates: new Map(),
      errors: new Map(),
    });
  },
}));
