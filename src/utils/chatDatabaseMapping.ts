// Database field mapping utilities for chat features
// Maps between database schema and TypeScript interfaces

import { Message, ChatRoom, ChatMember } from "../types";

// Type alias for backward compatibility
type ChatMessage = Message;

/**
 * Maps a database chat message to the ChatMessage interface
 */
export function mapDatabaseMessageToChatMessage(dbMessage: any): ChatMessage | null {
  if (!dbMessage) return null;

  try {
    // Handle reactions - can be JSON string or object
    let reactions: any[] = [];
    if (dbMessage.reactions) {
      if (typeof dbMessage.reactions === "string") {
        try {
          reactions = JSON.parse(dbMessage.reactions);
        } catch {
          reactions = [];
        }
      } else if (Array.isArray(dbMessage.reactions)) {
        reactions = dbMessage.reactions;
      }
    }

    const message: Message = {
      id: dbMessage.id,
      chatRoomId: dbMessage.chat_room_id || dbMessage.chatRoomId,
      senderId: dbMessage.sender_id || dbMessage.senderId,
      senderName: dbMessage.sender_name || dbMessage.senderName || "Anonymous",
      senderAvatar: dbMessage.sender_avatar || dbMessage.senderAvatar,
      content: dbMessage.content || "",
      messageType: dbMessage.message_type || dbMessage.messageType || "text",
      timestamp: dbMessage.timestamp ? new Date(dbMessage.timestamp) : new Date(),
      isRead: dbMessage.is_read ?? dbMessage.isRead ?? false,
      replyTo: dbMessage.reply_to || dbMessage.replyTo || undefined,
      reactions,
      status: dbMessage.status || "sent",
      // Map delivered_at and read_at to deliveredTo and readBy arrays if available
      deliveredTo: dbMessage.delivered_at ? [dbMessage.sender_id || dbMessage.senderId] : [],
      readBy: dbMessage.read_at ? [dbMessage.sender_id || dbMessage.senderId] : [],
      // Mark edited status if the message was edited
      isEdited: dbMessage.is_deleted ?? false,
    };

    return message;
  } catch (error) {
    console.error("Error mapping database message:", error, dbMessage);
    return null;
  }
}

/**
 * Maps a ChatMessage to database fields
 */
export function mapChatMessageToDatabase(message: Partial<ChatMessage>): any {
  const dbMessage: any = {};

  if (message.id !== undefined) dbMessage.id = message.id;
  if (message.chatRoomId !== undefined) dbMessage.chat_room_id = message.chatRoomId;
  if (message.senderId !== undefined) dbMessage.sender_id = message.senderId;
  if (message.senderName !== undefined) dbMessage.sender_name = message.senderName;
  if (message.senderAvatar !== undefined) dbMessage.sender_avatar = message.senderAvatar;
  if (message.content !== undefined) dbMessage.content = message.content;
  if (message.messageType !== undefined) dbMessage.message_type = message.messageType;
  if (message.timestamp !== undefined) {
    dbMessage.timestamp = message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp;
  }
  if (message.isRead !== undefined) dbMessage.is_read = message.isRead;
  if (message.replyTo !== undefined) dbMessage.reply_to = message.replyTo;
  if (message.reactions !== undefined) dbMessage.reactions = message.reactions;
  if (message.status !== undefined) dbMessage.status = message.status;
  // Map deliveredTo and readBy arrays to timestamp fields (if needed)
  if (message.deliveredTo !== undefined && message.deliveredTo.length > 0) {
    dbMessage.delivered_at = new Date().toISOString();
  }
  if (message.readBy !== undefined && message.readBy.length > 0) {
    dbMessage.read_at = new Date().toISOString();
  }
  // Map isEdited to is_deleted for now (database schema limitation)
  if (message.isEdited !== undefined) dbMessage.is_deleted = message.isEdited;

  return dbMessage;
}

/**
 * Maps a database chat room to the ChatRoom interface
 */
export function mapDatabaseRoomToChatRoom(dbRoom: any): ChatRoom | null {
  if (!dbRoom) return null;

  try {
    // Handle location - can be JSON string or object
    let location = null;
    if (dbRoom.location) {
      if (typeof dbRoom.location === "string") {
        try {
          location = JSON.parse(dbRoom.location);
        } catch {
          location = null;
        }
      } else if (typeof dbRoom.location === "object") {
        location = dbRoom.location;
      }
    }

    // Handle last_message - can be JSON string or object
    let lastMessage = null;
    const lastMessageField = dbRoom.last_message || dbRoom.lastMessage;
    if (lastMessageField) {
      if (typeof lastMessageField === "string") {
        try {
          lastMessage = JSON.parse(lastMessageField);
        } catch {
          lastMessage = null;
        }
      } else if (typeof lastMessageField === "object") {
        lastMessage = lastMessageField;
      }
    }

    // Handle typing_users - can be JSON string or array
    let typingUsers: any[] = [];
    const typingUsersField = dbRoom.typing_users || dbRoom.typingUsers;
    if (typingUsersField) {
      if (typeof typingUsersField === "string") {
        try {
          typingUsers = JSON.parse(typingUsersField);
        } catch {
          typingUsers = [];
        }
      } else if (Array.isArray(typingUsersField)) {
        typingUsers = typingUsersField;
      }
    }

    return {
      id: dbRoom.id,
      name: dbRoom.name || "Unnamed Room",
      description: dbRoom.description || "",
      type: dbRoom.type || "global",
      category: dbRoom.category || "all",
      memberCount: dbRoom.member_count ?? dbRoom.memberCount ?? 0,
      onlineCount: dbRoom.online_count ?? dbRoom.onlineCount ?? 0,
      lastMessage,
      lastActivity:
        dbRoom.last_activity || dbRoom.lastActivity
          ? new Date(dbRoom.last_activity || dbRoom.lastActivity)
          : new Date(),
      isActive: dbRoom.is_active ?? dbRoom.isActive ?? true,
      location,
      createdAt: dbRoom.created_at || dbRoom.createdAt ? new Date(dbRoom.created_at || dbRoom.createdAt) : new Date(),
      updatedAt: dbRoom.updated_at || dbRoom.updatedAt ? new Date(dbRoom.updated_at || dbRoom.updatedAt) : new Date(),
      // Note: createdBy, isPrivate, isDeleted, typingUsers fields exist in database but not in ChatRoom interface
      unreadCount: dbRoom.unread_count ?? dbRoom.unreadCount ?? 0,
    };
  } catch (error) {
    console.error("Error mapping database room:", error, dbRoom);
    return null;
  }
}

/**
 * Maps a database chat member to the ChatMember interface
 */
export function mapDatabaseMemberToChatMember(dbMember: any): ChatMember | null {
  if (!dbMember) return null;

  try {
    // Handle permissions - can be JSON string or object
    let permissions = {};
    if (dbMember.permissions) {
      if (typeof dbMember.permissions === "string") {
        try {
          permissions = JSON.parse(dbMember.permissions);
        } catch {
          permissions = { can_send_messages: true, can_send_media: true };
        }
      } else if (typeof dbMember.permissions === "object") {
        permissions = dbMember.permissions;
      }
    }

    return {
      id: dbMember.id,
      chatRoomId: dbMember.chat_room_id || dbMember.chatRoomId,
      userId: dbMember.user_id || dbMember.userId,
      userName: dbMember.user_name || dbMember.userName || "Anonymous",
      userAvatar: dbMember.user_avatar || dbMember.userAvatar,
      role: dbMember.role || "member",
      joinedAt:
        dbMember.joined_at || dbMember.joinedAt ? new Date(dbMember.joined_at || dbMember.joinedAt) : new Date(),
      isOnline: dbMember.is_online ?? dbMember.isOnline ?? false,
      lastSeen:
        dbMember.last_seen_at || dbMember.lastSeenAt
          ? new Date(dbMember.last_seen_at || dbMember.lastSeenAt)
          : new Date(),
      // Note: isActive and permissions fields exist in database but not in ChatMember interface
    };
  } catch (error) {
    console.error("Error mapping database member:", error, dbMember);
    return null;
  }
}
