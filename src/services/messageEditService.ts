import supabase from "../config/supabase";
import { Message } from "../types";
import { AppError, ErrorType } from "../utils/errorHandling";

const EDIT_TIME_LIMIT_MINUTES = 15;

interface EditPermissionResult {
  canEdit: boolean;
  reason?: string;
}

export class MessageEditService {
  /**
   * Edit a message with proper validation and error handling
   */
  async editMessage(messageId: string, newContent: string, userId: string): Promise<Message> {
    try {
      // Validate new content
      if (!newContent || newContent.trim().length === 0) {
        throw new AppError("Content cannot be empty", ErrorType.VALIDATION, "Message content is required");
      }

      // Get the original message
      const { data: originalMessage, error: fetchError } = await supabase
        .from("chat_messages_firebase")
        .select("*")
        .eq("id", messageId)
        .single();

      if (fetchError || !originalMessage) {
        throw new AppError(
          "Message not found",
          ErrorType.VALIDATION,
          "The message you are trying to edit does not exist",
        );
      }

      // Check edit permissions
      const permission = await this.checkEditPermission(originalMessage, userId);

      if (!permission.canEdit) {
        throw new AppError(
          permission.reason || "Cannot edit this message",
          ErrorType.PERMISSION,
          permission.reason || "You do not have permission to edit this message",
        );
      }

      // Update the message
      const { data: updatedMessage, error: updateError } = await supabase
        .from("chat_messages_firebase")
        .update({
          content: newContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .select()
        .single();

      if (updateError) {
        throw new AppError(
          "Failed to update message",
          ErrorType.SERVER,
          "Failed to save your changes. Please try again.",
        );
      }

      // Log the edit for audit purposes
      // TODO: Implement audit logging when message_edit_logs table is created
      // await this.logEdit(messageId, originalMessage.content, newContent, userId);

      // Transform to Message type
      return this.transformToMessage(updatedMessage);
    } catch (error) {
      console.error("Failed to edit message:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "An unexpected error occurred",
        ErrorType.UNKNOWN,
        "Failed to edit message. Please try again.",
      );
    }
  }

  /**
   * Check if a user has permission to edit a message
   */
  async checkEditPermission(message: any, userId: string): Promise<EditPermissionResult> {
    // Check if user is the sender
    if (message.sender_id !== userId) {
      return {
        canEdit: false,
        reason: "You can only edit your own messages",
      };
    }

    // Check if message type supports editing (only text messages)
    if (message.message_type !== "text") {
      return {
        canEdit: false,
        reason: "Only text messages can be edited",
      };
    }

    // Check if message is within edit time limit
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const timeLimitMs = EDIT_TIME_LIMIT_MINUTES * 60 * 1000;

    if (messageAge > timeLimitMs) {
      return {
        canEdit: false,
        reason: `Messages can only be edited within ${EDIT_TIME_LIMIT_MINUTES} minutes`,
      };
    }

    // Check if message has been deleted
    if (message.is_deleted) {
      return {
        canEdit: false,
        reason: "Deleted messages cannot be edited",
      };
    }

    return { canEdit: true };
  }

  /**
   * Validate message content
   */
  validateContent(content: string): { isValid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: "Message cannot be empty" };
    }

    if (content.length > 5000) {
      return { isValid: false, error: "Message is too long (max 5000 characters)" };
    }

    return { isValid: true };
  }

  /**
   * Log message edit for audit purposes
   */
  private async logEdit(messageId: string, originalContent: string, newContent: string, userId: string): Promise<void> {
    // TODO: Implement when message_edit_logs table is created
    // try {
    //   await supabase.from('message_edit_logs').insert({
    //     message_id: messageId,
    //     user_id: userId,
    //     original_content: originalContent,
    //     new_content: newContent,
    //     edited_at: new Date().toISOString(),
    //   });
    // } catch (error) {
    //   // Log error but don't fail the edit operation
    //   console.error('Failed to log message edit:', error);
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
   * Broadcast edit event to other users via real-time
   */
  async broadcastEdit(messageId: string, roomId: string, newContent: string): Promise<void> {
    try {
      const channel = supabase.channel(`room:${roomId}`);
      await channel.send({
        type: "broadcast",
        event: "message_edited",
        payload: {
          messageId,
          newContent,
          editedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to broadcast edit event:", error);
    }
  }

  /**
   * Retry failed edit operation with exponential backoff
   */
  async retryEdit(messageId: string, newContent: string, userId: string, maxRetries: number = 3): Promise<Message> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.editMessage(messageId, newContent, userId);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Failed to edit message after retries");
  }
}

export const messageEditService = new MessageEditService();
