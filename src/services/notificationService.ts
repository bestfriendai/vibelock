import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'new_review' | 'new_comment' | 'new_message' | 'review_approved' | 'review_rejected' | 'safety_alert';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushToken {
  token: string;
  deviceId: string;
  platform: string;
}

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return;
      }

      // Get push token
      if (Device.isDevice) {
        const token = await this.getPushToken();
        if (token) {
          await this.registerPushToken(token);
        }
      } else {
        console.warn('Push notifications only work on physical devices');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Get the device's push token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.pushToken = token.data;
      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Register push token with Supabase
   */
  private async registerPushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated, cannot register push token');
        return;
      }

      const deviceId = await this.getDeviceId();
      const platform = Platform.OS;

      // Insert or update push token
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token,
          device_id: deviceId,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('Failed to register push token:', error);
      } else {
        console.log('Push token registered successfully');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Get unique device identifier
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Use a combination of device info to create a unique ID
      const deviceName = Device.deviceName || 'unknown';
      const osVersion = Device.osVersion || 'unknown';
      const platform = Platform.OS;
      
      // Create a simple hash-like identifier
      const deviceString = `${platform}-${deviceName}-${osVersion}`;
      return deviceString.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    } catch (error) {
      console.error('Failed to get device ID:', error);
      return `${Platform.OS}-${Date.now()}`;
    }
  }

  /**
   * Send a local notification
   */
  async sendLocalNotification(notification: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  /**
   * Create a notification in the database
   */
  async createNotification(userId: string, notification: NotificationData): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          is_read: false,
          is_sent: false,
        });

      if (error) {
        console.error('Failed to create notification:', error);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to mark notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Remove push token (on logout)
   */
  async removePushToken(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deviceId = await this.getDeviceId();

      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('device_id', deviceId);

      if (error) {
        console.error('Failed to remove push token:', error);
      }
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Listen for notification responses
   */
  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Listen for notifications received while app is in foreground
   */
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.pushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
