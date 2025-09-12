import { notificationService, NotificationData } from "./notificationService";
import { supabase } from "../config/supabase";

/**
 * Helper functions for common notification scenarios
 */

/**
 * Send notification when a new review is created
 */
export async function notifyNewReview(reviewId: string, reviewedPersonName: string, reviewerName: string) {
  try {
    const notification: NotificationData = {
      type: "new_review",
      title: "New Review Posted",
      body: `${reviewerName} posted a review about ${reviewedPersonName}`,
      data: {
        reviewId,
        reviewedPersonName,
        reviewerName,
      },
    };

    // For now, send to all users (in a real app, you'd target specific users)
    // This could be enhanced to notify users in the same location or with matching preferences
    await sendNotificationToAllUsers(notification);
  } catch (error) {
    console.warn("Failed to send new review notification:", error);
  }
}

/**
 * Send notification when a review is approved
 */
export async function notifyReviewApproved(authorId: string, reviewId: string, reviewedPersonName: string) {
  try {
    const notification: NotificationData = {
      type: "review_approved",
      title: "Review Approved",
      body: `Your review about ${reviewedPersonName} has been approved and is now live`,
      data: {
        reviewId,
        reviewedPersonName,
      },
    };

    await notificationService.createNotification(authorId, notification);
  } catch (error) {
    console.warn("Failed to send review approved notification:", error);
  }
}

/**
 * Send notification when a review is rejected
 */
export async function notifyReviewRejected(
  authorId: string,
  reviewId: string,
  reviewedPersonName: string,
  reason?: string,
) {
  try {
    const notification: NotificationData = {
      type: "review_rejected",
      title: "Review Not Approved",
      body: `Your review about ${reviewedPersonName} was not approved${reason ? `: ${reason}` : ""}`,
      data: {
        reviewId,
        reviewedPersonName,
        reason,
      },
    };

    await notificationService.createNotification(authorId, notification);
  } catch (error) {
    console.warn("Failed to send review rejected notification:", error);
  }
}

/**
 * Send notification when someone comments on a review
 */
export async function notifyNewComment(reviewId: string, commentAuthorName: string, commentContent: string) {
  try {
    // Get the review author to notify them
    const { data: review, error } = await supabase
      .from("reviews_firebase")
      .select("author_id, reviewed_person_name")
      .eq("id", reviewId)
      .single();

    if (error || !review) {
      console.warn("Failed to get review for comment notification:", error);
      return;
    }

    const notification: NotificationData = {
      type: "new_comment",
      title: "New Comment",
      body: `${commentAuthorName} commented on your review about ${review.reviewed_person_name}`,
      data: {
        reviewId,
        commentAuthorName,
        commentContent: commentContent.substring(0, 100), // Truncate for notification
      },
    };

    await notificationService.createNotification(review.author_id, notification);
  } catch (error) {
    console.warn("Failed to send new comment notification:", error);
  }
}

/**
 * Send notification for new chat messages
 */
export async function notifyNewMessage(
  chatRoomId: string,
  senderName: string,
  messageContent: string,
  recipientIds?: string[],
) {
  try {
    const notification: NotificationData = {
      type: "new_message",
      title: `New message from ${senderName}`,
      body: messageContent.substring(0, 100), // Truncate for notification
      data: {
        chatRoomId,
        senderName,
      },
    };

    if (recipientIds && recipientIds.length > 0) {
      // Send to specific recipients
      for (const userId of recipientIds) {
        await notificationService.createNotification(userId, notification);
      }
    } else {
      // Send to all chat room members (you'd need to implement this based on your chat room membership logic)
      await sendNotificationToChatRoomMembers(chatRoomId, notification);
    }
  } catch (error) {
    console.warn("Failed to send new message notification:", error);
  }
}

/**
 * Send safety alert notification
 */
export async function notifySafetyAlert(title: string, message: string, targetUserIds?: string[]) {
  try {
    const notification: NotificationData = {
      type: "safety_alert",
      title,
      body: message,
      data: {
        priority: "high",
        timestamp: new Date().toISOString(),
      },
    };

    if (targetUserIds && targetUserIds.length > 0) {
      // Send to specific users
      for (const userId of targetUserIds) {
        await notificationService.createNotification(userId, notification);
      }
    } else {
      // Send to all users
      await sendNotificationToAllUsers(notification);
    }
  } catch (error) {
    console.warn("Failed to send safety alert notification:", error);
  }
}

/**
 * Helper function to send notification to all users
 * In a production app, you'd want to batch this and use a queue system
 */
async function sendNotificationToAllUsers(notification: NotificationData) {
  try {
    // Get all user IDs (you might want to paginate this in a real app)
    const { data: users, error } = await supabase.from("users").select("id").limit(1000); // Limit to prevent overwhelming the system

    if (error) {
      console.warn("Failed to get users for notification:", error);
      return;
    }

    // Send notification to each user
    for (const user of users || []) {
      await notificationService.createNotification(user.id, notification);
    }
  } catch (error) {
    console.warn("Failed to send notification to all users:", error);
  }
}

/**
 * Helper function to send notification to chat room members
 */
async function sendNotificationToChatRoomMembers(chatRoomId: string, notification: NotificationData) {
  try {
    // In a real app, you'd have a chat room members table
    // For now, we'll just log this as it would need to be implemented based on your chat architecture
    console.log(`Would send notification to members of chat room ${chatRoomId}:`, notification);

    // Example implementation if you had a chat_room_members table:
    /*
    const { data: members, error } = await supabase
      .from('chat_room_members')
      .select('user_id')
      .eq('chat_room_id', chatRoomId)
      .eq('is_active', true);

    if (error) {
      console.warn('Failed to get chat room members:', error);
      return;
    }

    for (const member of members || []) {
      await notificationService.createNotification(member.user_id, notification);
    }
    */
  } catch (error) {
    console.warn("Failed to send notification to chat room members:", error);
  }
}

/**
 * Schedule a notification for later delivery
 */
export async function scheduleNotification(userId: string, notification: NotificationData, scheduledFor: Date) {
  try {
    // Create notification with scheduled time
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      is_read: false,
      is_sent: false,
      created_at: scheduledFor.toISOString(),
    });

    if (error) {
      console.warn("Failed to schedule notification:", error);
    }
  } catch (error) {
    console.warn("Error scheduling notification:", error);
  }
}

/**
 * Get notification preferences for a user
 */
export async function getUserNotificationPreferences(userId: string) {
  try {
    // This would be implemented based on your user preferences schema
    // For now, return default preferences
    return {
      newReviews: true,
      newComments: true,
      newMessages: true,
      safetyAlerts: true,
      reviewApproval: true,
    };
  } catch (error) {
    console.warn("Failed to get notification preferences:", error);
    return null;
  }
}

/**
 * Update notification preferences for a user
 */
export async function updateUserNotificationPreferences(userId: string, preferences: Record<string, boolean>) {
  try {
    // This would update a user_notification_preferences table
    // For now, just log the preferences
    console.log(`Would update notification preferences for user ${userId}:`, preferences);
  } catch (error) {
    console.warn("Failed to update notification preferences:", error);
  }
}
