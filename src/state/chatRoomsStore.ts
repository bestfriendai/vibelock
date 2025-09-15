/**
 * @experimental This store is part of a planned modularization effort
 * but is NOT YET INTEGRATED into the UI. Do not use in production code.
 * See src/state/README.md for details.
 */

import { create } from "zustand";
import { ChatRoom, RoomMember } from "../types";
import { chatService } from "../services/chat";

interface ChatRoomsState {
  rooms: Map<string, ChatRoom>;
  activeRoomId: string | null;
  roomMembers: Map<string, RoomMember[]>;
  loadingRooms: boolean;
  error: Error | null;

  getRooms: () => ChatRoom[];
  getRoom: (roomId: string) => ChatRoom | undefined;
  setActiveRoom: (roomId: string | null) => void;
  loadRooms: (userId: string) => Promise<void>;
  addRoom: (room: ChatRoom) => void;
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  deleteRoom: (roomId: string) => void;
  loadRoomMembers: (roomId: string) => Promise<void>;
  getRoomMembers: (roomId: string) => RoomMember[];
  clearRooms: () => void;
}

export const useChatRoomsStore = create<ChatRoomsState>((set, get) => ({
  rooms: new Map(),
  activeRoomId: null,
  roomMembers: new Map(),
  loadingRooms: false,
  error: null,

  getRooms: () => {
    return Array.from(get().rooms.values()).sort(
      (a, b) => new Date(b.lastActivity || b.createdAt).getTime() - new Date(a.lastActivity || a.createdAt).getTime(),
    );
  },

  getRoom: (roomId: string) => {
    return get().rooms.get(roomId);
  },

  setActiveRoom: (roomId: string | null) => {
    set({ activeRoomId: roomId });
  },

  loadRooms: async (userId: string) => {
    set({ loadingRooms: true, error: null });

    try {
      const rooms = await chatService.getRooms(userId);

      const roomsMap = new Map<string, ChatRoom>();
      rooms.forEach((room) => {
        roomsMap.set(room.id, room);
      });

      set({
        rooms: roomsMap,
        loadingRooms: false,
      });
    } catch (error) {
      set({
        error: error as Error,
        loadingRooms: false,
      });
    }
  },

  addRoom: (room: ChatRoom) => {
    set((state) => ({
      rooms: new Map(state.rooms).set(room.id, room),
    }));
  },

  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => {
    set((state) => {
      const room = state.rooms.get(roomId);
      if (!room) return state;

      const updatedRoom = { ...room, ...updates };
      return {
        rooms: new Map(state.rooms).set(roomId, updatedRoom),
      };
    });
  },

  deleteRoom: (roomId: string) => {
    set((state) => {
      const newRooms = new Map(state.rooms);
      newRooms.delete(roomId);

      const newMembers = new Map(state.roomMembers);
      newMembers.delete(roomId);

      return {
        rooms: newRooms,
        roomMembers: newMembers,
        activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
      };
    });
  },

  loadRoomMembers: async (roomId: string) => {
    try {
      const members = await chatService.getRoomMembers(roomId);

      set((state) => ({
        roomMembers: new Map(state.roomMembers).set(roomId, members),
      }));
    } catch (error) {
      console.error("Failed to load room members:", error);
    }
  },

  getRoomMembers: (roomId: string) => {
    return get().roomMembers.get(roomId) || [];
  },

  clearRooms: () => {
    set({
      rooms: new Map(),
      activeRoomId: null,
      roomMembers: new Map(),
      loadingRooms: false,
      error: null,
    });
  },
}));
