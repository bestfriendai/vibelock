import supabase from "../config/supabase";
import { Message, ChatRoom } from "../types";
import { AppError, ErrorType } from "../utils/errorHandling";
import { storageService } from "./storageService";

interface ForwardPermissionResult {
  canForward: boolean;
  reason?: string;
}

export class MessageForwardService {
  /**
   * Forward a message to another room
   */
  async forwardMessage(
    sourceMessage: Message,
    targetRoomId: string,
    userId: string,
    comment?: string,
  ): Promise<Message> {
    try {
      // Check permissions
      const permission = await this.checkForwardPermission(sourceMessage, targetRoomId, userId);

      if (!permission.canForward) {
        throw new AppError(
          permission.reason || "Cannot forward this message",
          ErrorType.PERMISSION,
          permission.reason || "You do not have permission to forward this message",
        );
      }

      // Format the forwarded content
      const forwardedContent = this.formatForwardedContent(sourceMessage, comment);

      // Handle media forwarding
      const mediaFields = await this.handleMediaForwarding(sourceMessage);

      // Create the forwarded message
      const { data: forwardedMessage, error } = await supabase
        .from("chat_messages_firebase")
        .insert({
          chat_room_id: targetRoomId,
          sender_id: userId,
          content: forwardedContent,
          message_type: sourceMessage.messageType,
          forwarded_from_id: sourceMessage.id,
          forwarded_from_room_id: sourceMessage.chatRoomId,
          forwarded_from_sender: sourceMessage.senderName,
          ...mediaFields,
        })
        .select()
        .single();

      if (error) {
        throw new AppError(
          "Failed to forward message",
          ErrorType.SERVER,
          "Failed to forward the message. Please try again.",
        );
      }

      // Log the forward action
      await this.logForward(sourceMessage.id, targetRoomId, userId, comment);

      return this.transformToMessage(forwardedMessage);
    } catch (error) {
      console.error("Failed to forward message:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "An unexpected error occurred",
        ErrorType.UNKNOWN,
        "Failed to forward message. Please try again.",
      );
    }
  }

  /**
   * Check if a user has permission to forward a message
   */
  async checkForwardPermission(
    message: Message,
    targetRoomId: string,
    userId: string,
  ): Promise<ForwardPermissionResult> {
    // Check if user has access to the source message room
    const { data: sourceMembership, error: sourceError } = await supabase
      .from("chat_members_firebase")
      .select("id")
      .eq("chat_room_id", message.chatRoomId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (sourceError || !sourceMembership) {
      return {
        canForward: false,
        reason: "You do not have access to the source message",
      };
    }

    // Check if user has access to the target room
    const { data: targetMembership, error: targetError } = await supabase
      .from("chat_members_firebase")
      .select("id")
      .eq("chat_room_id", targetRoomId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (targetError || !targetMembership) {
      return {
        canForward: false,
        reason: "You do not have access to the target room",
      };
    }

    // Check if target room allows the message type
    const { data: targetRoom, error: roomError } = await supabase
      .from("chat_rooms_firebase")
      .select("*")
      .eq("id", targetRoomId)
      .single();

    if (roomError || !targetRoom) {
      return {
        canForward: false,
        reason: "Target room not found",
      };
    }

    // Check for same room forwarding
    if (message.chatRoomId === targetRoomId) {
      return {
        canForward: false,
        reason: "Cannot forward message to the same room",
      };
    }

    return { canForward: true };
  }

  /**
   * Format the content for a forwarded message
   */
  private formatForwardedContent(sourceMessage: Message, comment?: string): string {
    let content = "";

    if (comment && comment.trim()) {
      content += `${comment.trim()}\n\n`;
    }

    content += `--- Forwarded message ---\n`;
    content += `From: ${sourceMessage.senderName}\n`;
    content += `Original: ${new Date(sourceMessage.timestamp).toLocaleString()}\n\n`;
    content += sourceMessage.content;

    return content;
  }

  /**
   * Handle media fields when forwarding
   */
  private async handleMediaForwarding(sourceMessage: Message): Promise<any> {
    const mediaFields: any = {};

    // For text messages, no media handling needed
    if (sourceMessage.messageType === "text") {
      return mediaFields;
    }

    // Copy media URLs directly (they're already in storage)
    if (sourceMessage.imageUri) {
      mediaFields.image_url = sourceMessage.imageUri;
      mediaFields.thumbnail_url = sourceMessage.thumbnailUri;
    }

    if (sourceMessage.videoUri) {
      mediaFields.video_url = sourceMessage.videoUri;
      mediaFields.thumbnail_url = sourceMessage.thumbnailUri;
    }

    if (sourceMessage.audioUri) {
      mediaFields.audio_url = sourceMessage.audioUri;
      mediaFields.audio_duration = sourceMessage.audioDuration;
    }

    return mediaFields;
  }

  /**
   * Create attribution text for forwarded messages
   */
  generateForwardedAttribution(forwardedFromSender: string, forwardedFromRoom?: string): string {
    if (forwardedFromRoom) {
      return `Forwarded from ${forwardedFromSender} in ${forwardedFromRoom}`;
    }
    return `Forwarded from ${forwardedFromSender}`;
  }

  /**
   * Handle forwarding chains (messages that are already forwarded)
   */
  async handleForwardingChain(sourceMessage: Message): Promise<{ originalMessageId: string; chainLength: number }> {
    let originalMessageId = sourceMessage.id;
    let chainLength = 0;

    // TODO: Implement forwarding chain tracking when forwarded_from_id column is added to database
    // For now, we'll just track if this is already a forwarded message
    if (sourceMessage.forwardedFromId) {
      originalMessageId = sourceMessage.forwardedFromId;
      chainLength = 1;

      // Temporarily limit chain length without database check
      const maxChainLength = 5;
      if (chainLength >= maxChainLength) {
        throw new AppError(
          "Forwarding chain too long",
          ErrorType.VALIDATION,
          "This message has been forwarded too many times",
        );
      }
    }

    return { originalMessageId, chainLength };
  }

  /**
   * Log forward action for analytics
   */
  private async logForward(messageId: string, targetRoomId: string, userId: string, comment?: string): Promise<void> {
    // TODO: Implement when message_forward_logs table is created
    // try {
    //   await supabase.from('message_forward_logs').insert({
    //     message_id: messageId,
    //     target_room_id: targetRoomId,
    //     user_id: userId,
    //     has_comment: !!comment,
    //     forwarded_at: new Date().toISOString(),
    //   });
    // } catch (error) {
    //   // Log error but don't fail the forward operation
    //   console.error('Failed to log message forward:', error);
    // }
  }

  /**
   * Transform database message to Message type
   */
  private transformToMessage(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      chatRoomId: dbMessage.chat_room_id,
      senderId: dbMessage.sender_id,
      senderName: dbMessage.sender_name || "Unknown",
      content: dbMessage.content,
      messageType: dbMessage.message_type,
      timestamp: new Date(dbMessage.created_at),
      isRead: dbMessage.is_read || false,
      isEdited: dbMessage.is_edited || false,
      editedAt: dbMessage.edited_at ? new Date(dbMessage.edited_at) : undefined,
      forwardedFromId: dbMessage.forwarded_from_id,
      forwardedFromRoomId: dbMessage.forwarded_from_room_id,
      forwardedFromSender: dbMessage.forwarded_from_sender,
      imageUri: dbMessage.image_url,
      videoUri: dbMessage.video_url,
      audioUri: dbMessage.audio_url,
      audioDuration: dbMessage.audio_duration,
      thumbnailUri: dbMessage.thumbnail_url,
    };
  }

  /**
   * Validate forwarding for different message types
   */
  validateMessageTypeForForwarding(messageType: string): boolean {
    const allowedTypes = ["text", "image", "video", "voice", "document"];
    return allowedTypes.includes(messageType);
  }

  /**
   * Get forwarding statistics for analytics
   */
  async getForwardingStats(
    roomId: string,
    days: number = 30,
  ): Promise<{
    totalForwards: number;
    mostForwardedMessages: any[];
    topForwarders: any[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get total forwards
    const { data: forwards, error: forwardsError } = await supabase
      .from("chat_messages_firebase")
      .select("id", { count: "exact" })
      .eq("chat_room_id", roomId)
      .not("forwarded_from_id", "is", null)
      .gte("created_at", cutoffDate.toISOString());

    // TODO: Implement when message_forward_logs table is created
    // Get most forwarded messages
    // const { data: mostForwarded } = await supabase
    //   .from('message_forward_logs')
    //   .select('message_id, count')
    //   .gte('forwarded_at', cutoffDate.toISOString())
    //   .order('count', { ascending: false })
    //   .limit(5);

    // Get top forwarders
    // const { data: topForwarders } = await supabase
    //   .from('message_forward_logs')
    //   .select('user_id, count')
    //   .gte('forwarded_at', cutoffDate.toISOString())
    //   .order('count', { ascending: false })
    //   .limit(5);

    const mostForwarded = null;
    const topForwarders = null;

    return {
      totalForwards: forwards?.length || 0,
      mostForwardedMessages: mostForwarded || [],
      topForwarders: topForwarders || [],
    };
  }
}

export const messageForwardService = new MessageForwardService();
