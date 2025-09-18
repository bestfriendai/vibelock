/**
 * Chat service using Firebase-suffixed schema.
 * This aligns with the schema used by chatStore and realtimeChat.
 * Tables: chat_rooms_firebase, chat_messages_firebase, chat_members_firebase
 */
import { supabase } from "../config/supabase";
import { ChatRoom, Message, RoomMember } from "../types";
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from "../utils/fieldMapping";
import { withRetry } from "../utils/retryLogic";

export class ChatService {
  async getRooms(userId: string): Promise<ChatRoom[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from("chat_rooms_firebase")
        .select("*")
        .eq("is_active", true)
        .order("last_activity", { ascending: false });

      if (error) throw error;
      return (data || []).map(room => {
        const mappedRoom = mapFieldsToCamelCase(room) as unknown as ChatRoom;
        // Handle lastMessage conversion from Json to Message
        if (mappedRoom.lastMessage && typeof mappedRoom.lastMessage === 'object') {
          mappedRoom.lastMessage = mappedRoom.lastMessage as unknown as Message;
        }
        // Convert string dates to Date objects
        if (typeof mappedRoom.lastActivity === 'string') {
          mappedRoom.lastActivity = new Date(mappedRoom.lastActivity);
        }
        if (typeof mappedRoom.createdAt === 'string') {
          mappedRoom.createdAt = new Date(mappedRoom.createdAt);
        }
        if (typeof mappedRoom.updatedAt === 'string') {
          mappedRoom.updatedAt = new Date(mappedRoom.updatedAt);
        }
        return mappedRoom;
      });
    });
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    const { data, error } = await supabase.from("chat_rooms_firebase").select("*").eq("id", roomId).single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const mappedRoom = mapFieldsToCamelCase(data) as unknown as ChatRoom;
    // Handle lastMessage conversion from Json to Message
    if (mappedRoom.lastMessage && typeof mappedRoom.lastMessage === 'object') {
      mappedRoom.lastMessage = mappedRoom.lastMessage as unknown as Message;
    }
    // Convert string dates to Date objects
    if (typeof mappedRoom.lastActivity === 'string') {
      mappedRoom.lastActivity = new Date(mappedRoom.lastActivity);
    }
    if (typeof mappedRoom.createdAt === 'string') {
      mappedRoom.createdAt = new Date(mappedRoom.createdAt);
    }
    if (typeof mappedRoom.updatedAt === 'string') {
      mappedRoom.updatedAt = new Date(mappedRoom.updatedAt);
    }
    return mappedRoom;
  }

  async createRoom(room: Omit<ChatRoom, "id" | "createdAt" | "updatedAt">): Promise<ChatRoom> {
    const snakeCaseRoom = mapFieldsToSnakeCase(room);

    // Convert Date fields to ISO strings for Supabase
    if (snakeCaseRoom.last_activity instanceof Date) {
      (snakeCaseRoom as any).last_activity = snakeCaseRoom.last_activity.toISOString();
    }

    const { data, error } = await supabase.from("chat_rooms_firebase").insert(snakeCaseRoom as any).select().single();

    if (error) throw error;
    const mappedRoom = mapFieldsToCamelCase(data) as unknown as ChatRoom;
    // Convert string dates to Date objects
    if (typeof mappedRoom.lastActivity === 'string') {
      mappedRoom.lastActivity = new Date(mappedRoom.lastActivity);
    }
    if (typeof mappedRoom.createdAt === 'string') {
      mappedRoom.createdAt = new Date(mappedRoom.createdAt);
    }
    if (typeof mappedRoom.updatedAt === 'string') {
      mappedRoom.updatedAt = new Date(mappedRoom.updatedAt);
    }
    return mappedRoom;
  }

  async updateRoom(roomId: string, updates: Partial<ChatRoom>): Promise<ChatRoom> {
    const snakeCaseUpdates = mapFieldsToSnakeCase(updates);

    const { data, error } = await supabase
      .from("chat_rooms_firebase")
      .update(snakeCaseUpdates as any)
      .eq("id", roomId)
      .select()
      .single();

    if (error) throw error;
    const mappedRoom = mapFieldsToCamelCase(data) as unknown as ChatRoom;
    // Convert string dates to Date objects
    if (typeof mappedRoom.lastActivity === 'string') {
      mappedRoom.lastActivity = new Date(mappedRoom.lastActivity);
    }
    if (typeof mappedRoom.createdAt === 'string') {
      mappedRoom.createdAt = new Date(mappedRoom.createdAt);
    }
    if (typeof mappedRoom.updatedAt === 'string') {
      mappedRoom.updatedAt = new Date(mappedRoom.updatedAt);
    }
    return mappedRoom;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase.from("chat_rooms_firebase").delete().eq("id", roomId);

    if (error) throw error;
  }

  async getMessages(roomId: string, limit: number = 50, before?: string): Promise<Message[]> {
    let query = supabase
      .from("chat_messages_firebase")
      .select("*")
      .eq("chat_room_id", roomId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("timestamp", before);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(message => {
      const mappedMessage = mapFieldsToCamelCase(message) as unknown as Message;
      // Convert string dates to Date objects
      if (typeof mappedMessage.timestamp === 'string') {
        mappedMessage.timestamp = new Date(mappedMessage.timestamp);
      }
      return mappedMessage;
    }).reverse();
  }

  async sendMessage(message: Omit<Message, "id" | "createdAt" | "updatedAt">): Promise<Message> {
    const snakeCaseMessage = mapFieldsToSnakeCase(message);

    // Map Message fields to Firebase schema
    const firebaseMessage = {
      chat_room_id: message.chatRoomId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_avatar: message.senderAvatar,
      content: message.content,
      message_type: message.messageType || "text",
      is_read: message.isRead || false,
      reply_to: message.replyTo,
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("chat_messages_firebase").insert(firebaseMessage).select().single();

    if (error) throw error;

    await this.updateRoomActivity(message.chatRoomId);

    const mappedMessage = mapFieldsToCamelCase(data) as unknown as Message;
    // Convert string dates to Date objects
    if (typeof mappedMessage.timestamp === 'string') {
      mappedMessage.timestamp = new Date(mappedMessage.timestamp);
    }
    return mappedMessage;
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from("chat_messages_firebase")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;
    const mappedMessage = mapFieldsToCamelCase(data) as unknown as Message;
    // Convert string dates to Date objects
    if (typeof mappedMessage.timestamp === 'string') {
      mappedMessage.timestamp = new Date(mappedMessage.timestamp);
    }
    return mappedMessage;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase.from("chat_messages_firebase").delete().eq("id", messageId);

    if (error) throw error;
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    // Note: chat_members_firebase table is not in the generated types
    // This is a type assertion to handle the missing table definition
    const { data, error } = await supabase.from("chat_members_firebase" as any).select("*").eq("chat_room_id", roomId);

    if (error) {
      console.warn("Failed to fetch room members (table may not exist):", error);
      return []; // Return empty array if table doesn't exist
    }
    return (data || []).map(member => {
      const mappedMember = mapFieldsToCamelCase(member) as unknown as RoomMember;
      // Convert string dates to Date objects
      if (typeof mappedMember.joinedAt === 'string') {
        mappedMember.joinedAt = new Date(mappedMember.joinedAt);
      }
      return mappedMember;
    });
  }

  async addRoomMember(roomId: string, userId: string, role: string = "member"): Promise<void> {
    // Note: chat_members_firebase table is not in the generated types
    const { error } = await supabase.from("chat_members_firebase" as any).insert({
      chat_room_id: roomId,
      user_id: userId,
      role,
      joined_at: new Date().toISOString(),
    });

    if (error && !error.message.includes("duplicate")) {
      console.warn("Failed to add room member (table may not exist):", error);
    }
  }

  async removeRoomMember(roomId: string, userId: string): Promise<void> {
    // Note: chat_members_firebase table is not in the generated types
    const { error } = await supabase
      .from("chat_members_firebase" as any)
      .delete()
      .eq("chat_room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      console.warn("Failed to remove room member (table may not exist):", error);
    }
  }

  async updateMemberRole(roomId: string, userId: string, role: string): Promise<void> {
    // Note: chat_members_firebase table is not in the generated types
    const { error } = await supabase
      .from("chat_members_firebase" as any)
      .update({ role })
      .eq("chat_room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      console.warn("Failed to update member role (table may not exist):", error);
    }
  }

  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    // Note: message_reads table is not in the generated types
    const { error } = await supabase.from("message_reads" as any).upsert({
      room_id: roomId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Failed to mark messages as read (table may not exist):", error);
    }
  }

  private async updateRoomActivity(roomId: string): Promise<void> {
    const { error } = await supabase
      .from("chat_rooms_firebase")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", roomId);

    if (error) console.error("Failed to update room activity:", error);
  }

  async searchMessages(roomId: string, query: string, limit: number = 20): Promise<Message[]> {
    const { data, error } = await supabase
      .from("chat_messages_firebase")
      .select("*")
      .eq("chat_room_id", roomId)
      .ilike("content", `%${query}%`)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(message => {
      const mappedMessage = mapFieldsToCamelCase(message) as unknown as Message;
      // Convert string dates to Date objects
      if (typeof mappedMessage.timestamp === 'string') {
        mappedMessage.timestamp = new Date(mappedMessage.timestamp);
      }
      return mappedMessage;
    });
  }
}

export const chatService = new ChatService();
