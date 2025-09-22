// Message Status Tracking Service
// Handles message delivery and read status tracking

import supabase from "../config/supabase";
import { enhancedRealtimeChatService } from "./realtimeChat";
import { RealtimeChannel } from "@supabase/supabase-js";
import { DeliveryStatus, MessageStatus } from "../types";

interface MessageStatusUpdate {
  messageId: string;
  status: DeliveryStatus;
  userId?: string;
  timestamp: Date;
}

class MessageStatusService {
  private statusCache: Map<string, MessageStatus> = new Map();
  private statusListeners: Map<string, (status: MessageStatus) => void> = new Map();
  private statusChannels: Map<string, RealtimeChannel> = new Map();
  private pendingUpdates: Map<string, MessageStatusUpdate[]> = new Map();
  private updateBatchTimeout: NodeJS.Timeout | null = null;
  private batchDelayMs = 500;
  private maxBatchSize = 20;

  // Schema capability flags
  private supportsDelivered: boolean | null = null;
  private supportsStatus: boolean | null = null;
  private capabilityCheckDone = false;
  private capabilityWarningShown = false;

  /**
   * Check schema capabilities
   */
  private async checkSchemaCapabilities(): Promise<void> {
    if (this.capabilityCheckDone) return;

    try {
      // Try to select delivered_at column
      const { data, error } = await supabase.from("chat_messages_firebase").select("id, delivered_at").limit(1);

      if (!error) {
        this.supportsDelivered = true;
        console.log("[MessageStatus] Schema supports delivered_at column");
      } else if (error.code === "42703" || error.code === "PGRST301") {
        // Column doesn't exist
        this.supportsDelivered = false;
        console.log("[MessageStatus] Schema does not support delivered_at column");
      }

      // Check for environment flag override
      const enableDeliveredColumn = process.env.EXPO_PUBLIC_ENABLE_DELIVERED_COLUMN;
      if (enableDeliveredColumn === "false") {
        this.supportsDelivered = false;
        console.log("[MessageStatus] delivered_at column disabled by environment flag");
      }

      // Test if status column exists
      const { data: statusData, error: statusError } = await supabase
        .from("chat_messages_firebase")
        .select("id, status")
        .limit(1);

      if (!statusError) {
        this.supportsStatus = true;
        console.log("[MessageStatus] Schema supports status column");
      } else if (statusError.code === "42703" || statusError.code === "PGRST301") {
        // Column doesn't exist
        this.supportsStatus = false;
        console.log("[MessageStatus] Schema does not support status column");
      } else {
        // Default to false on other errors
        this.supportsStatus = false;
      }

      this.capabilityCheckDone = true;
    } catch (error) {
      console.warn("[MessageStatus] Failed to check schema capabilities:", error);
      // Default to safe mode (no delivered_at/status)
      this.supportsDelivered = false;
      this.supportsStatus = false;
      this.capabilityCheckDone = true;
    }
  }

  /**
   * Show capability warning once
   */
  private showCapabilityWarning(): void {
    if (!this.capabilityWarningShown) {
      console.warn("[MessageStatus] Message delivery tracking is limited due to missing database columns");
      this.capabilityWarningShown = true;
    }
  }

  /**
   * Mark a single message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      console.log(`[MessageStatus] Marking message ${messageId} as read by ${userId}`);

      // Update in database
      const { error } = await supabase
        .from("chat_messages_firebase")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) {
        console.error("[MessageStatus] Error marking message as read:", error);
        throw error;
      }

      // Update cache
      const cached = this.statusCache.get(messageId);
      if (cached) {
        cached.status = "read";
        cached.readAt = new Date();
        if (!cached.readBy) cached.readBy = [];
        if (!cached.readBy.includes(userId)) {
          cached.readBy.push(userId);
        }
        this.notifyStatusChange(cached);
      }

      console.log(`[MessageStatus] Message ${messageId} marked as read`);
    } catch (error) {
      console.error("[MessageStatus] Failed to mark message as read:", error);
      throw error;
    }
  }

  /**
   * Mark multiple messages as read (batch operation)
   */
  async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    if (messageIds.length === 0) return;

    try {
      console.log(`[MessageStatus] Marking ${messageIds.length} messages as read`);

      // Batch update in database
      const { error } = await supabase
        .from("chat_messages_firebase")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in("id", messageIds);

      if (error) {
        console.error("[MessageStatus] Error batch marking messages as read:", error);
        throw error;
      }

      // Update cache for all messages
      messageIds.forEach((messageId) => {
        const cached = this.statusCache.get(messageId);
        if (cached) {
          cached.status = "read";
          cached.readAt = new Date();
          if (!cached.readBy) cached.readBy = [];
          if (!cached.readBy.includes(userId)) {
            cached.readBy.push(userId);
          }
          this.notifyStatusChange(cached);
        }
      });

      console.log(`[MessageStatus] ${messageIds.length} messages marked as read`);
    } catch (error) {
      console.error("[MessageStatus] Failed to batch mark messages as read:", error);
      throw error;
    }
  }

  /**
   * Mark messages as delivered
   */
  async markMessagesAsDelivered(messageIds: string[], userId: string): Promise<void> {
    if (messageIds.length === 0) return;

    // Check capabilities first
    await this.checkSchemaCapabilities();

    if (!this.supportsDelivered) {
      // Skip if not supported
      this.showCapabilityWarning();
      return;
    }

    try {
      console.log(`[MessageStatus] Marking ${messageIds.length} messages as delivered`);

      // Add to pending updates for batch processing
      messageIds.forEach((messageId) => {
        const update: MessageStatusUpdate = {
          messageId,
          status: "delivered",
          userId,
          timestamp: new Date(),
        };

        if (!this.pendingUpdates.has(messageId)) {
          this.pendingUpdates.set(messageId, []);
        }
        this.pendingUpdates.get(messageId)!.push(update);
      });

      // Schedule batch update
      this.scheduleBatchUpdate();

      // Update cache immediately for UI responsiveness
      messageIds.forEach((messageId) => {
        const cached = this.statusCache.get(messageId);
        if (cached && cached.status !== "read") {
          cached.status = "delivered";
          cached.deliveredAt = new Date();
          this.notifyStatusChange(cached);
        }
      });
    } catch (error) {
      console.error("[MessageStatus] Failed to mark messages as delivered:", error);
      throw error;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    // Check cache first
    if (this.statusCache.has(messageId)) {
      return this.statusCache.get(messageId)!;
    }

    try {
      // Fetch from database
      const { data, error } = await supabase
        .from("chat_messages_firebase")
        .select("id, chat_room_id, is_read, timestamp")
        .eq("id", messageId)
        .single();

      if (error || !data) {
        console.warn("[MessageStatus] Message not found:", messageId);
        return null;
      }

      const status: MessageStatus = {
        messageId: data.id,
        roomId: data.chat_room_id || "",
        status: data.is_read ? "read" : "delivered",
        deliveredAt: data.timestamp ? new Date(data.timestamp) : new Date(),
        readAt: data.is_read && data.timestamp ? new Date(data.timestamp) : undefined,
      };

      // Cache the status
      this.statusCache.set(messageId, status);

      return status;
    } catch (error) {
      console.error("[MessageStatus] Failed to get message status:", error);
      return null;
    }
  }

  /**
   * Subscribe to real-time status updates for a room
   */
  subscribeToRoomStatusUpdates(roomId: string, callback: (status: MessageStatus) => void): () => void {
    const listenerId = `${roomId}_${Date.now()}`;
    this.statusListeners.set(listenerId, callback);

    // Create realtime subscription if not exists
    if (!this.statusChannels.has(roomId)) {
      const channel = supabase
        .channel(`message_status_${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages_firebase",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => this.handleStatusUpdate(roomId, payload),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(`[MessageStatus] Subscribed to status updates for room ${roomId}`);
          }
        });

      this.statusChannels.set(roomId, channel);
    }

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listenerId);

      // Check if we should unsubscribe from channel
      const hasListeners = Array.from(this.statusListeners.keys()).some((key) => key.startsWith(roomId));
      if (!hasListeners && this.statusChannels.has(roomId)) {
        const channel = this.statusChannels.get(roomId)!;
        channel.unsubscribe();
        this.statusChannels.delete(roomId);
        console.log(`[MessageStatus] Unsubscribed from status updates for room ${roomId}`);
      }
    };
  }

  /**
   * Handle real-time status update from Supabase
   */
  private handleStatusUpdate(roomId: string, payload: any): void {
    if (!payload.new) return;

    const { id, is_read, created_at } = payload.new;

    const status: MessageStatus = {
      messageId: id,
      roomId,
      status: is_read ? "read" : "delivered",
      deliveredAt: new Date(created_at),
      readAt: is_read ? new Date() : undefined,
    };

    // Update cache
    this.statusCache.set(id, status);

    // Notify listeners
    this.notifyStatusChange(status);
  }

  /**
   * Notify all listeners about a status change
   */
  private notifyStatusChange(status: MessageStatus): void {
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("[MessageStatus] Error in status listener:", error);
      }
    });
  }

  /**
   * Schedule batch update of pending status changes
   */
  private scheduleBatchUpdate(): void {
    if (this.updateBatchTimeout) {
      return; // Batch already scheduled
    }

    this.updateBatchTimeout = setTimeout(() => {
      this.processBatchUpdates();
      this.updateBatchTimeout = null;
    }, this.batchDelayMs);
  }

  /**
   * Process batch updates
   */
  private async processBatchUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.entries()).slice(0, this.maxBatchSize);
    this.pendingUpdates.clear(); // Clear processed updates

    try {
      // Group updates by status
      const deliveredIds = updates
        .filter(([_, statuses]) => statuses.some((s) => s.status === "delivered"))
        .map(([id]) => id);

      const readIds = updates.filter(([_, statuses]) => statuses.some((s) => s.status === "read")).map(([id]) => id);

      // Batch update delivered messages (skip if not supported)
      if (deliveredIds.length > 0 && this.supportsDelivered) {
        // Note: delivered_at column doesn't exist in current schema
        // Keeping this code for future when column is added
        console.log(`[MessageStatus] Would mark ${deliveredIds.length} messages as delivered (feature pending)`);
        this.supportsDelivered = false; // Disable for now
      }

      // Batch update read messages (always supported)
      if (readIds.length > 0) {
        await supabase
          .from("chat_messages_firebase")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .in("id", readIds);
      }

      console.log(`[MessageStatus] Batch updated ${updates.length} message statuses`);
    } catch (error: any) {
      console.error("[MessageStatus] Batch update failed:", error);

      // Check for column not found error
      if (error?.code === "42703" || error?.code === "PGRST301") {
        this.supportsDelivered = false;
        this.supportsStatus = false;
        console.log("[MessageStatus] Disabled advanced status updates - columns not found");
        this.showCapabilityWarning();
        // Don't retry these updates
        return;
      }

      // Re-add failed updates for retry (only if not a schema error)
      updates.forEach(([id, statuses]) => {
        this.pendingUpdates.set(id, statuses);
      });
    }
  }

  /**
   * Update message status with retry logic
   */
  async updateMessageStatus(messageId: string, status: DeliveryStatus, userId?: string, retries = 3): Promise<void> {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        if (status === "read") {
          await this.markMessageAsRead(messageId, userId!);
        } else if (status === "delivered") {
          await this.markMessagesAsDelivered([messageId], userId!);
        } else {
          // Update other statuses directly (only if supported)
          await this.checkSchemaCapabilities();

          if (this.supportsStatus) {
            // Note: status column doesn't exist in current schema
            // Keeping this code for future when column is added
            console.log(`[MessageStatus] Would update message ${messageId} status to ${status} (feature pending)`);
            this.supportsStatus = false; // Disable for now
          } else {
            this.showCapabilityWarning();
            return; // Skip if not supported
          }
        }

        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(`[MessageStatus] Retry ${i + 1}/${retries} failed:`, error);

        if (i < retries - 1) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    // All retries failed
    console.error("[MessageStatus] Failed to update message status after retries:", lastError);
    throw lastError;
  }

  /**
   * Clear status cache for a room
   */
  clearRoomCache(roomId: string): void {
    const keysToDelete: string[] = [];
    this.statusCache.forEach((status, key) => {
      if (status.roomId === roomId) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.statusCache.delete(key));
    console.log(`[MessageStatus] Cleared cache for room ${roomId} (${keysToDelete.length} entries)`);
  }

  /**
   * Get capability status for UI
   */
  getCapabilityStatus(): { supportsDelivered: boolean; supportsStatus: boolean; warningShown: boolean } {
    return {
      supportsDelivered: this.supportsDelivered ?? false,
      supportsStatus: this.supportsStatus ?? false,
      warningShown: this.capabilityWarningShown,
    };
  }

  /**
   * Clean up service
   */
  async cleanup(): Promise<void> {
    // Clear batch timeout
    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
      this.updateBatchTimeout = null;
    }

    // Process any pending updates
    await this.processBatchUpdates();

    // Unsubscribe all channels
    for (const channel of this.statusChannels.values()) {
      await channel.unsubscribe();
    }

    // Clear all data
    this.statusCache.clear();
    this.statusListeners.clear();
    this.statusChannels.clear();
    this.pendingUpdates.clear();

    console.log("[MessageStatus] Service cleaned up");
  }
}

// Export singleton instance
export const messageStatusService = new MessageStatusService();
export default messageStatusService;
