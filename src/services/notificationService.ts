import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../config/supabase';
import { AppError, ErrorType, parseSupabaseError } from '../utils/errorHandling';

// Configure notification behavior with platform-specific settings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: Platform.OS === 'ios', // Only iOS supports badges
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android-specific notification channel configuration
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EF4444',
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  });
}

export interface NotificationData {
  type: 'new_review' | 'new_comment' | 'new_message' | 'new_like' | 'review_approved' | 'review_rejected' | 'safety_alert';
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
  private notificationListeners: Notifications.Subscription[] = [];
  private retryAttempts = 0;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  /**
   * Initialize the notification service with enhanced Android support
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Android-specific initialization
      if (Platform.OS === 'android') {
        await this.initializeAndroidNotifications();
      }

      // Request permissions with platform-specific handling
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        // Don't throw error, just log and continue
        return;
      }

      // Get push token with retry mechanism
      if (Device.isDevice) {
        const token = await this.getPushToken();
        if (token) {
          await this.registerPushToken(token);
          this.setupNotificationListeners();
        }
      } else {
        console.warn('Push notifications only work on physical devices');
        if (__DEV__) {
          Alert.alert('Info', 'Push notifications require a physical device.');
        }
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);

      // Don't throw error in production to prevent app crashes
      if (__DEV__) {
        const appError = error instanceof AppError ? error : parseSupabaseError(error);
        throw new AppError(
          'Failed to initialize notifications',
          ErrorType.SERVER,
          'NOTIFICATION_INIT_FAILED',
          undefined,
          true
        );
      }
    }
  }

  /**
   * Initialize Android-specific notification settings
   */
  private async initializeAndroidNotifications(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Create notification channels for different types
      await Promise.all([
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EF4444',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        }),
        Notifications.setNotificationChannelAsync('reviews', {
          name: 'Review Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EF4444',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        }),
        Notifications.setNotificationChannelAsync('messages', {
          name: 'Message Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EF4444',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        }),
      ]);

      console.log('Android notification channels created successfully');
    } catch (error) {
      console.error('Failed to create Android notification channels:', error);
    }
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap here
    });

    this.notificationListeners.push(receivedListener, responseListener);
  }

  /**
   * Get the device's push token with retry mechanism
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }

      // Validate project ID
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) {
        throw new AppError(
          'Missing EXPO_PUBLIC_PROJECT_ID environment variable',
          ErrorType.SERVER,
          'MISSING_PROJECT_ID',
          undefined,
          true
        );
      }

      // Get push token with platform-specific configuration
      const tokenConfig: any = { projectId };

      // Android-specific configuration
      if (Platform.OS === 'android') {
        tokenConfig.applicationId = Constants.expoConfig?.android?.package || 'com.lockerroom.app';
      }

      const token = await Notifications.getExpoPushTokenAsync(tokenConfig);

      if (!token?.data) {
        throw new AppError(
          'Failed to retrieve push token from Expo',
          ErrorType.SERVER,
          'EMPTY_PUSH_TOKEN',
          undefined,
          true
        );
      }

      this.pushToken = token.data;
      console.log('Push token retrieved successfully:', token.data.substring(0, 20) + '...');
      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);

      // Retry mechanism for transient failures
      if (this.retryAttempts < this.maxRetries && !(error instanceof AppError && error.type === ErrorType.SERVER)) {
        this.retryAttempts++;
        console.log(`Retrying push token retrieval (attempt ${this.retryAttempts}/${this.maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryAttempts));
        return this.getPushToken();
      }

      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw new AppError(
        'Failed to get push token after retries',
        ErrorType.SERVER,
        'PUSH_TOKEN_FAILED',
        undefined,
        true
      );
    }
  }

  /**
   * Register push token with Supabase
   */
  private async registerPushToken(token: string): Promise<void> {
    try {
      const { supabaseUser } = await import('../utils/authUtils').then(m => m.getAuthenticatedUser());
      if (!supabaseUser) {
        console.warn('User not authenticated, cannot register push token');
        return;
      }

      const deviceId = await this.getDeviceId();
      const platform = Platform.OS;

      // Insert or update push token
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: supabaseUser.id,
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
        throw new AppError(
          'Failed to register push token',
          ErrorType.SERVER,
          'PUSH_TOKEN_REGISTER_FAILED',
          undefined,
          true
        );
      } else {
        console.log('Push token registered successfully');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw appError;
    }
  }

  /**
   * Get unique device identifier with improved Android support
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Use a combination of device info to create a unique ID
      const deviceName = Device.deviceName || 'unknown';
      const osVersion = Device.osVersion || 'unknown';
      const platform = Platform.OS;
      const modelName = Device.modelName || 'unknown';
      const brand = Device.brand || 'unknown';

      // For Android, include more device-specific info for better uniqueness
      let deviceString: string;
      if (Platform.OS === 'android') {
        deviceString = `${platform}-${brand}-${modelName}-${deviceName}-${osVersion}`;
      } else {
        deviceString = `${platform}-${deviceName}-${osVersion}`;
      }

      // Clean and normalize the device string
      const cleanDeviceId = deviceString
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-') // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '') // Remove leading/trailing dashes
        .toLowerCase();

      // Ensure minimum length and add timestamp if too short
      if (cleanDeviceId.length < 10) {
        return `${cleanDeviceId}-${Date.now().toString(36)}`;
      }

      return cleanDeviceId;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      // Fallback with timestamp for uniqueness
      return `${Platform.OS}-fallback-${Date.now().toString(36)}`;
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
      // Prefer RPC to bypass RLS safely (SECURITY DEFINER on server)
      const { error } = await supabase.rpc('create_notification', {
        target_user_id: userId,
        n_type: notification.type,
        n_title: notification.title,
        n_body: notification.body,
        n_data: notification.data || {},
      });

      if (error) {
        console.error('Failed to create notification via RPC, falling back to direct insert:', error);
        // Safe fallback for dev environments where a permissive policy may exist
        const { error: insertError } = await supabase
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

        if (insertError) {
          console.error('Failed to create notification:', insertError);
          throw new AppError(
            'Failed to create notification',
            ErrorType.SERVER,
            'NOTIFICATION_CREATE_FAILED',
            undefined,
            true
          );
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw appError;
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
        throw new AppError(
          'Failed to mark notification as read',
          ErrorType.SERVER,
          'NOTIFICATION_MARK_READ_FAILED',
          undefined,
          true
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw appError;
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
        throw new AppError(
          'Failed to mark all notifications as read',
          ErrorType.SERVER,
          'NOTIFICATION_MARK_ALL_READ_FAILED',
          undefined,
          true
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      throw appError;
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
   * Subscribe/unsubscribe to chat room notifications
   */
  async setChatRoomSubscription(roomId: string, isSubscribed: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_room_subscriptions')
        .upsert({
          user_id: user.id,
          room_id: roomId,
          is_subscribed: isSubscribed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,room_id' });

      if (error) {
        console.error('Failed to update chat room subscription:', error);
      }
    } catch (error) {
      console.error('Error updating chat room subscription:', error);
    }
  }

  async getChatRoomSubscription(roomId: string): Promise<boolean> {
    try {
      const { supabaseUser } = await import('../utils/authUtils').then(m => m.getAuthenticatedUser());
      if (!supabaseUser) return false;

      const { data, error } = await supabase
        .from('chat_room_subscriptions')
        .select('is_subscribed')
        .eq('user_id', supabaseUser.id)
        .eq('room_id', roomId)
        .single();

      if (error) {
        // If no row, treat as unsubscribed
        return false;
      }

      return !!data?.is_subscribed;
    } catch (error) {
      console.error('Error fetching chat room subscription:', error);
      return false;
    }
  }

  /**
   * Listen for notification responses
   */
  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener(listener);
    this.notificationListeners.push(subscription);
    return subscription;
  }

  /**
   * Listen for notifications received while app is in foreground
   */
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationReceivedListener(listener);
    this.notificationListeners.push(subscription);
    return subscription;
  }

  /**
   * Clean up all notification listeners
   */
  cleanup() {
    console.log("🧹 Cleaning up notification service");
    this.notificationListeners.forEach(subscription => {
      subscription.remove();
    });
    this.notificationListeners = [];
    this.pushToken = null;
    this.isInitialized = false;
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
