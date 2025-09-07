import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, NotificationData } from '../services/notificationService';

export interface Notification {
  id: string;
  userId: string;
  type: 'new_review' | 'new_comment' | 'new_message' | 'new_like' | 'review_approved' | 'review_rejected' | 'safety_alert';
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  isSent: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface NotificationActions {
  // Initialization
  initialize: () => Promise<void>;
  
  // Notification management
  loadNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  
  // Local notifications
  sendLocalNotification: (notification: NotificationData) => Promise<void>;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  updateUnreadCount: (userId: string) => Promise<void>;
}

type NotificationStore = NotificationState & NotificationActions;

const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // State
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      isInitialized: false,

      // Actions
      initialize: async () => {
        try {
          if (get().isInitialized) return;
          
          set({ isLoading: true, error: null });
          
          // Initialize the notification service
          await notificationService.initialize();
          
          // Set up notification listeners
          notificationService.addNotificationReceivedListener((notification) => {
            console.log('Notification received:', notification);
            // Handle foreground notifications
            const notificationData: NotificationData = {
              type: (notification.request.content.data?.type as 'new_review' | 'new_comment' | 'new_message' | 'new_like' | 'review_approved' | 'review_rejected' | 'safety_alert') || 'new_message',
              title: notification.request.content.title || 'New Notification',
              body: notification.request.content.body || '',
              data: notification.request.content.data,
            };
            
            // You could show a custom in-app notification here
          });

          notificationService.addNotificationResponseListener((response) => {
            console.log('Notification response:', response);
            // Handle notification tap
            const data = response.notification.request.content.data;
            
            // Navigate to appropriate screen based on notification type
            if (data?.type === 'new_review' && data?.reviewId) {
              // Navigate to review detail
            } else if (data?.type === 'new_message' && data?.chatRoomId) {
              // Navigate to chat room
            }
          });

          set({ isInitialized: true, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize notifications',
            isLoading: false,
          });
        }
      },

      loadNotifications: async (userId: string) => {
        try {
          set({ isLoading: true, error: null });

          const notifications = await notificationService.getUserNotifications(userId);
          const unreadCount = await notificationService.getUnreadCount(userId);

          const formattedNotifications: Notification[] = notifications.map((notif) => ({
            id: notif.id,
            userId: notif.user_id,
            type: notif.type,
            title: notif.title,
            body: notif.body,
            data: notif.data,
            isRead: notif.is_read,
            isSent: notif.is_sent,
            createdAt: new Date(notif.created_at),
          }));

          set({
            notifications: formattedNotifications,
            unreadCount,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load notifications',
            isLoading: false,
          });
        }
      },

      addNotification: (notification: Notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
        }));
      },

      markAsRead: async (notificationId: string) => {
        try {
          await notificationService.markAsRead(notificationId);

          set((state) => ({
            notifications: state.notifications.map((notif) =>
              notif.id === notificationId ? { ...notif, isRead: true } : notif
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to mark notification as read',
          });
        }
      },

      markAllAsRead: async (userId: string) => {
        try {
          await notificationService.markAllAsRead(userId);

          set((state) => ({
            notifications: state.notifications.map((notif) => ({ ...notif, isRead: true })),
            unreadCount: 0,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
          });
        }
      },

      sendLocalNotification: async (notification: NotificationData) => {
        try {
          await notificationService.sendLocalNotification(notification);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to send local notification',
          });
        }
      },

      updateUnreadCount: async (userId: string) => {
        try {
          const unreadCount = await notificationService.getUnreadCount(userId);
          set({ unreadCount });
        } catch (error) {
          console.error('Failed to update unread count:', error);
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist notifications and unread count, not loading states
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

export default useNotificationStore;
