/**
 * Chat service using Firebase-suffixed schema.
 * This aligns with the schema used by chatStore and realtimeChat.
 * Tables: chat_rooms_firebase, chat_messages_firebase, chat_members_firebase
 */
import { supabase } from '../config/supabase';
import { ChatRoom, Message, RoomMember } from '../types';
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from '../utils/fieldMapping';
import { withRetry } from '../utils/retryLogic';

export class ChatService {
  async getRooms(userId: string): Promise<ChatRoom[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('chat_rooms_firebase')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapFieldsToCamelCase);
    });
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    const { data, error } = await supabase
      .from('chat_rooms_firebase')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return mapFieldsToCamelCase(data);
  }

  async createRoom(room: Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatRoom> {
    const snakeCaseRoom = mapFieldsToSnakeCase(room);

    const { data, error } = await supabase
      .from('chat_rooms_firebase')
      .insert(snakeCaseRoom)
      .select()
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async updateRoom(roomId: string, updates: Partial<ChatRoom>): Promise<ChatRoom> {
    const snakeCaseUpdates = mapFieldsToSnakeCase(updates);

    const { data, error } = await supabase
      .from('chat_rooms_firebase')
      .update(snakeCaseUpdates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_rooms_firebase')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
  }

  async getMessages(
    roomId: string,
    limit: number = 50,
    before?: string
  ): Promise<Message[]> {
    let query = supabase
      .from('chat_messages_firebase')
      .select('*')
      .eq('chat_room_id', roomId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('timestamp', before);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapFieldsToCamelCase).reverse();
  }

  async sendMessage(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    const snakeCaseMessage = mapFieldsToSnakeCase(message);

    // Map Message fields to Firebase schema
    const firebaseMessage = {
      chat_room_id: message.chatRoomId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_avatar: message.senderAvatar,
      content: message.content,
      message_type: message.messageType || 'text',
      is_read: message.isRead || false,
      reply_to: message.replyTo,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('chat_messages_firebase')
      .insert(firebaseMessage)
      .select()
      .single();

    if (error) throw error;

    await this.updateRoomActivity(message.chatRoomId);

    return mapFieldsToCamelCase(data);
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from('chat_messages_firebase')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages_firebase')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const { data, error } = await supabase
      .from('chat_members_firebase')
      .select('*')
      .eq('chat_room_id', roomId);

    if (error) throw error;
    return (data || []).map(mapFieldsToCamelCase);
  }

  async addRoomMember(roomId: string, userId: string, role: string = 'member'): Promise<void> {
    const { error } = await supabase
      .from('chat_members_firebase')
      .insert({
        chat_room_id: roomId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString()
      });

    if (error && !error.message.includes('duplicate')) throw error;
  }

  async removeRoomMember(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_members_firebase')
      .delete()
      .eq('chat_room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async updateMemberRole(roomId: string, userId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from('chat_members_firebase')
      .update({ role })
      .eq('chat_room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('message_reads')
      .upsert({
        room_id: roomId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  private async updateRoomActivity(roomId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_rooms_firebase')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', roomId);

    if (error) console.error('Failed to update room activity:', error);
  }

  async searchMessages(roomId: string, query: string, limit: number = 20): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chat_messages_firebase')
      .select('*')
      .eq('chat_room_id', roomId)
      .ilike('content', `%${query}%`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapFieldsToCamelCase);
  }
}

export const chatService = new ChatService();