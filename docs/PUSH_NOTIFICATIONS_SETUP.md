# Push Notifications Setup Guide

## Overview
This document provides a complete guide for implementing push notifications in the React Native application using Firebase Cloud Messaging (FCM) for Android and Apple Push Notification Service (APNs) for iOS.

## Prerequisites
- React Native project with `@react-native-firebase/app` and `@react-native-firebase/messaging` installed
- Firebase project set up with FCM enabled
- Apple Developer account with APNs certificates configured
- App icons and notification images prepared

## Setup Steps

### 1. Install Dependencies

```bash
# Install Firebase modules
npm install @react-native-firebase/app @react-native-firebase/messaging
# or
yarn add @react-native-firebase/app @react-native-firebase/messaging

# For iOS, install pods
cd ios && pod install
```

### 2. Configure Firebase

#### Android Configuration
1. Download `google-services.json` from your Firebase project
2. Place it in the `android/app` directory
3. Add the google-services plugin to your `android/build.gradle`:
```gradle
buildscript {
  dependencies {
    // ...
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

4. Apply the plugin in your `android/app/build.gradle`:
```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'
```

#### iOS Configuration
1. Download `GoogleService-Info.plist` from your Firebase project
2. Open your iOS project in Xcode
3. Right-click on your project directory and select "Add Files to [project name]"
4. Select the `GoogleService-Info.plist` file
5. Enable push notifications in Xcode:
   - Go to "Signing & Capabilities"
   - Click "+ Capability"
   - Add "Push Notifications"
   - Add "Background Modes" and check "Remote notifications"

### 3. Create Push Notification Service

#### Create Notification Service
Create a file `src/services/pushNotifications.ts`:

```typescript
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { logEvent } from './analytics';

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    let authStatus: FirebaseMessagingTypes.AuthorizationStatus;

    if (Platform.OS === 'ios') {
      authStatus = await messaging().requestPermission();
    } else {
      // For Android, we need to request POST_NOTIFICATIONS permission for API 33+
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        authStatus = granted === PermissionsAndroid.RESULTS.GRANTED
          ? messaging.AuthorizationStatus.AUTHORIZED
          : messaging.AuthorizationStatus.DENIED;
      } else {
        authStatus = messaging.AuthorizationStatus.AUTHORIZED;
      }
    }

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    // Log analytics event
    await logEvent('notification_permission_requested', {
      enabled,
      platform: Platform.OS,
    });

    return enabled;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    
    // Log analytics event
    await logEvent('notification_permission_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    return false;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    // Check if notification permission is granted
    const enabled = await requestNotificationPermission();
    
    if (!enabled) {
      console.log('Notification permission not granted');
      return null;
    }

    // Get FCM token
    const token = await messaging().getToken();
    
    // Log analytics event
    await logEvent('fcm_token_received', {
      platform: Platform.OS,
    });
    
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    
    // Log analytics event
    await logEvent('fcm_token_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    return null;
  }
};

// Subscribe to a topic
export const subscribeToTopic = async (topic: string): Promise<void> => {
  try {
    await messaging().subscribeToTopic(topic);
    
    // Log analytics event
    await logEvent('topic_subscribed', {
      topic,
      platform: Platform.OS,
    });
    
    console.log(`Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to subscribe to topic ${topic}:`, error);
    
    // Log analytics event
    await logEvent('topic_subscription_error', {
      topic,
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Unsubscribe from a topic
export const unsubscribeFromTopic = async (topic: string): Promise<void> => {
  try {
    await messaging().unsubscribeFromTopic(topic);
    
    // Log analytics event
    await logEvent('topic_unsubscribed', {
      topic,
      platform: Platform.OS,
    });
    
    console.log(`Unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    
    // Log analytics event
    await logEvent('topic_unsubscription_error', {
      topic,
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Register FCM token with backend
export const registerFCMToken = async (
  token: string,
  userId?: string,
): Promise<void> => {
  try {
    // This would typically be an API call to your backend
    console.log('Registering FCM token with backend:', token);
    
    // Log analytics event
    await logEvent('fcm_token_registered', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to register FCM token with backend:', error);
    
    // Log analytics event
    await logEvent('fcm_token_registration_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Unregister FCM token from backend
export const unregisterFCMToken = async (
  token: string,
  userId?: string,
): Promise<void> => {
  try {
    // This would typically be an API call to your backend
    console.log('Unregistering FCM token from backend:', token);
    
    // Log analytics event
    await logEvent('fcm_token_unregistered', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to unregister FCM token from backend:', error);
    
    // Log analytics event
    await logEvent('fcm_token_unregistration_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Initialize push notifications
export const initializePushNotifications = async (
  userId?: string,
  onNotification?: (notification: FirebaseMessagingTypes.RemoteMessage) => void,
  onNotificationOpened?: (notification: FirebaseMessagingTypes.NotificationOpen) => void,
): Promise<void> => {
  try {
    // Request permission
    const enabled = await requestNotificationPermission();
    
    if (!enabled) {
      console.log('Notification permission not granted');
      return;
    }

    // Get FCM token
    const token = await getFCMToken();
    
    if (token) {
      // Register token with backend
      await registerFCMToken(token, userId);
    }

    // Handle foreground notifications
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
      
      // Log analytics event
      await logEvent('notification_received_foreground', {
        platform: Platform.OS,
      });
      
      // Call custom handler if provided
      if (onNotification) {
        onNotification(remoteMessage);
      }
    });

    // Handle notification opened from background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        console.log(
          'Notification caused app to open from background state:',
          JSON.stringify(remoteMessage),
        );
        
        // Log analytics event
        logEvent('notification_opened_background', {
          platform: Platform.OS,
        });
        
        // Call custom handler if provided
        if (onNotificationOpened) {
          onNotificationOpened(remoteMessage);
        }
      },
    );

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            JSON.stringify(remoteMessage),
          );
          
          // Log analytics event
          logEvent('notification_opened_quit', {
            platform: Platform.OS,
          });
          
          // Call custom handler if provided
          if (onNotificationOpened) {
            onNotificationOpened(remoteMessage);
          }
        }
      });

    // Handle token refresh
    const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
      async (newToken) => {
        console.log('FCM token refreshed:', newToken);
        
        // Log analytics event
        await logEvent('fcm_token_refreshed', {
          platform: Platform.OS,
        });
        
        // Register new token with backend
        await registerFCMToken(newToken, userId);
      },
    );

    // Return cleanup function
    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    
    // Log analytics event
    await logEvent('push_notifications_initialization_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Display local notification (for foreground notifications)
export const displayLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> => {
  try {
    // This would typically use react-native-push-notification or similar
    console.log('Displaying local notification:', { title, body, data });
    
    // Log analytics event
    await logEvent('local_notification_displayed', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to display local notification:', error);
    
    // Log analytics event
    await logEvent('local_notification_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Schedule local notification
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  date: Date,
  data?: Record<string, any>,
): Promise<void> => {
  try {
    // This would typically use react-native-push-notification or similar
    console.log('Scheduling local notification:', { title, body, date, data });
    
    // Log analytics event
    await logEvent('local_notification_scheduled', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to schedule local notification:', error);
    
    // Log analytics event
    await logEvent('local_notification_scheduling_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Cancel scheduled local notification
export const cancelLocalNotification = async (id: string): Promise<void> => {
  try {
    // This would typically use react-native-push-notification or similar
    console.log('Cancelling local notification:', id);
    
    // Log analytics event
    await logEvent('local_notification_cancelled', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to cancel local notification:', error);
    
    // Log analytics event
    await logEvent('local_notification_cancellation_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Cancel all scheduled local notifications
export const cancelAllLocalNotifications = async (): Promise<void> => {
  try {
    // This would typically use react-native-push-notification or similar
    console.log('Cancelling all local notifications');
    
    // Log analytics event
    await logEvent('all_local_notifications_cancelled', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to cancel all local notifications:', error);
    
    // Log analytics event
    await logEvent('all_local_notifications_cancellation_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};
```

#### Create Push Notification Hook
Create a file `src/hooks/usePushNotifications.ts`:

```typescript
import { useState, useEffect } from 'react';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {
  initializePushNotifications,
  subscribeToTopic,
  unsubscribeFromTopic,
  displayLocalNotification,
  scheduleLocalNotification,
  cancelLocalNotification,
  cancelAllLocalNotifications,
} from '../services/pushNotifications';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from './useToast';

export interface NotificationData {
  id?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp?: number;
  read?: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [permissionEnabled, setPermissionEnabled] = useState(false);

  // Initialize push notifications
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        
        const cleanup = await initializePushNotifications(
          user?.id,
          handleNotification,
          handleNotificationOpened,
        );
        
        return cleanup;
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        showToast('Failed to enable notifications', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [user]);

  // Handle notification
  const handleNotification = async (
    notification: FirebaseMessagingTypes.RemoteMessage,
  ) => {
    try {
      const { notification, data } = notification;
      
      if (notification) {
        const newNotification: NotificationData = {
          id: data?.id || Date.now().toString(),
          title: notification.title || '',
          body: notification.body || '',
          data,
          timestamp: Date.now(),
          read: false,
        };
        
        // Add to notifications list
        setNotifications(prev => [newNotification, ...prev]);
        
        // Display local notification for foreground notifications
        await displayLocalNotification(
          notification.title || '',
          notification.body || '',
          data,
        );
        
        // Show toast
        showToast(notification.title || 'New notification', 'info');
      }
    } catch (error) {
      console.error('Failed to handle notification:', error);
    }
  };

  // Handle notification opened
  const handleNotificationOpened = async (
    notificationOpen: FirebaseMessagingTypes.NotificationOpen,
  ) => {
    try {
      const { notification } = notificationOpen;
      
      if (notification) {
        // Mark notification as read
        const notificationId = notification.data?.id;
        
        if (notificationId) {
          setNotifications(prev =>
            prev.map(n =>
              n.id === notificationId ? { ...n, read: true } : n,
            ),
          );
        }
        
        // Navigate to relevant screen based on notification data
        // This would typically use navigation
        console.log('Notification opened:', notification.data);
      }
    } catch (error) {
      console.error('Failed to handle notification opened:', error);
    }
  };

  // Subscribe to topic
  const handleSubscribeToTopic = async (topic: string) => {
    try {
      setIsLoading(true);
      await subscribeToTopic(topic);
      showToast(`Subscribed to ${topic}`, 'success');
    } catch (error) {
      console.error(`Failed to subscribe to topic ${topic}:`, error);
      showToast(`Failed to subscribe to ${topic}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from topic
  const handleUnsubscribeFromTopic = async (topic: string) => {
    try {
      setIsLoading(true);
      await unsubscribeFromTopic(topic);
      showToast(`Unsubscribed from ${topic}`, 'success');
    } catch (error) {
      console.error(`Failed to unsubscribe from topic ${topic}:`, error);
      showToast(`Failed to unsubscribe from ${topic}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Display local notification
  const handleDisplayLocalNotification = async (
    title: string,
    body: string,
    data?: Record<string, any>,
  ) => {
    try {
      await displayLocalNotification(title, body, data);
    } catch (error) {
      console.error('Failed to display local notification:', error);
      showToast('Failed to display notification', 'error');
    }
  };

  // Schedule local notification
  const handleScheduleLocalNotification = async (
    title: string,
    body: string,
    date: Date,
    data?: Record<string, any>,
  ) => {
    try {
      setIsLoading(true);
      await scheduleLocalNotification(title, body, date, data);
      showToast('Notification scheduled', 'success');
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      showToast('Failed to schedule notification', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel local notification
  const handleCancelLocalNotification = async (id: string) => {
    try {
      setIsLoading(true);
      await cancelLocalNotification(id);
      showToast('Notification cancelled', 'success');
    } catch (error) {
      console.error('Failed to cancel local notification:', error);
      showToast('Failed to cancel notification', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel all local notifications
  const handleCancelAllLocalNotifications = async () => {
    try {
      setIsLoading(true);
      await cancelAllLocalNotifications();
      showToast('All notifications cancelled', 'success');
    } catch (error) {
      console.error('Failed to cancel all local notifications:', error);
      showToast('Failed to cancel notifications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Delete notification
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Delete all notifications
  const deleteAllNotifications = () => {
    setNotifications([]);
  };

  // Get unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    isLoading,
    notifications,
    permissionEnabled,
    unreadCount,
    handleSubscribeToTopic,
    handleUnsubscribeFromTopic,
    handleDisplayLocalNotification,
    handleScheduleLocalNotification,
    handleCancelLocalNotification,
    handleCancelAllLocalNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};
```

### 4. Create Push Notification Components

#### Create Notification Item Component
Create a file `src/components/notifications/NotificationItem.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { NotificationData } from '../../hooks/usePushNotifications';

interface NotificationItemProps {
  notification: NotificationData;
  onPress?: (notification: NotificationData) => void;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
  onMarkAsRead,
}) => {
  const { theme } = useTheme();
  const { title, body, timestamp, read } = notification;

  // Format timestamp
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise, show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
  };

  const handleDelete = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (onDelete && notification.id) {
      onDelete(notification.id);
    }
  };

  const handleMarkAsRead = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (onMarkAsRead && notification.id) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card },
        !read && { borderLeftColor: theme.primary, borderLeftWidth: 4 },
      ]}
      onPress={handlePress}
    >
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        
        <Text style={[styles.body, { color: theme.secondaryText }]} numberOfLines={2}>
          {body}
        </Text>
        
        <View style={styles.footer}>
          <Text style={[styles.time, { color: theme.secondaryText }]}>
            {formatTime(timestamp)}
          </Text>
          
          {!read && (
            <TouchableOpacity onPress={handleMarkAsRead}>
              <Text style={[styles.markAsRead, { color: theme.primary }]}>
                Mark as read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
        <Text style={[styles.deleteText, { color: theme.error }]}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
  },
  markAsRead: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    justifyContent: 'center',
    paddingLeft: 16,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NotificationItem;
```

#### Create Notifications List Component
Create a file `src/components/notifications/NotificationsList.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePushNotifications, NotificationData } from '../../hooks/usePushNotifications';
import NotificationItem from './NotificationItem';

interface NotificationsListProps {
  onNotificationPress?: (notification: NotificationData) => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  onNotificationPress,
}) => {
  const { theme } = useTheme();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = usePushNotifications();
  
  const [refreshing, setRefreshing] = React.useState(false);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    // This would typically fetch notifications from backend
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
        No notifications
      </Text>
    </View>
  );

  // Render header
  const renderHeader = () => {
    if (notifications.length === 0) return null;
    
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={[styles.headerButton, { color: theme.primary }]}>
            Mark all as read
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={deleteAllNotifications}>
          <Text style={[styles.headerButton, { color: theme.error }]}>
            Delete all
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={onNotificationPress}
            onDelete={deleteNotification}
            onMarkAsRead={markAsRead}
          />
        )}
        keyExtractor={(item) => item.id || Date.now().toString()}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.contentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default NotificationsList;
```

#### Create Notification Settings Component
Create a file `src/components/notifications/NotificationSettings.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface NotificationSettingsProps {
  onBack?: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const {
    isLoading,
    permissionEnabled,
    handleSubscribeToTopic,
    handleUnsubscribeFromTopic,
  } = usePushNotifications();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(permissionEnabled);
  const [topics, setTopics] = useState([
    { id: 'general', name: 'General Notifications', subscribed: true },
    { id: 'promotions', name: 'Promotions and Offers', subscribed: true },
    { id: 'updates', name: 'App Updates', subscribed: true },
    { id: 'events', name: 'Events and News', subscribed: false },
  ]);

  // Update notifications enabled state
  useEffect(() => {
    setNotificationsEnabled(permissionEnabled);
  }, [permissionEnabled]);

  // Toggle notifications
  const toggleNotifications = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      
      // This would typically enable/disable notifications at the system level
      // For now, we'll just update the state
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      setNotificationsEnabled(!value);
    }
  };

  // Toggle topic subscription
  const toggleTopicSubscription = async (topicId: string, subscribed: boolean) => {
    try {
      setTopics(prev =>
        prev.map(topic =>
          topic.id === topicId ? { ...topic, subscribed } : topic,
        ),
      );
      
      if (subscribed) {
        await handleSubscribeToTopic(topicId);
      } else {
        await handleUnsubscribeFromTopic(topicId);
      }
    } catch (error) {
      console.error(`Failed to toggle topic ${topicId}:`, error);
      setTopics(prev =>
        prev.map(topic =>
          topic.id === topicId ? { ...topic, subscribed: !subscribed } : topic,
        ),
      );
    }
  };

  // Show confirmation dialog
  const showConfirmationDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: onConfirm,
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backButton, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: theme.text }]}>
          Notification Settings
        </Text>
        
        <View style={styles.placeholder} />
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Notifications
        </Text>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Enable Notifications
          </Text>
          
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.background}
          />
        </View>
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Notification Topics
        </Text>
        
        {topics.map(topic => (
          <View key={topic.id} style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              {topic.name}
            </Text>
            
            <Switch
              value={topic.subscribed}
              onValueChange={value => toggleTopicSubscription(topic.id, value)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.background}
            />
          </View>
        ))}
      </View>
      
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Information
        </Text>
        
        <Text style={[styles.infoText, { color: theme.secondaryText }]}>
          Notifications help you stay updated with the latest information. You can
          customize which notifications you receive and how you receive them.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 50,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default NotificationSettings;
```

### 5. Create Notifications Screen

#### Create Notifications Screen
Create a file `src/screens/notifications/NotificationsScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePushNotifications, NotificationData } from '../../hooks/usePushNotifications';
import NotificationsList from '../../components/notifications/NotificationsList';
import NotificationSettings from '../../components/notifications/NotificationSettings';

const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { unreadCount } = usePushNotifications();
  const [showSettings, setShowSettings] = useState(false);

  const handleNotificationPress = (notification: NotificationData) => {
    // Navigate to relevant screen based on notification data
    // This would typically use navigation
    console.log('Notification pressed:', notification);
  };

  const handleBack = () => {
    setShowSettings(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {showSettings ? (
        <NotificationSettings onBack={handleBack} />
      ) : (
        <>
          <View style={[styles.header, { backgroundColor: theme.card }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              Notifications
            </Text>
            
            <TouchableOpacity onPress={() => setShowSettings(true)}>
              <Text style={[styles.settingsButton, { color: theme.primary }]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
          
          <NotificationsList onNotificationPress={handleNotificationPress} />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NotificationsScreen;
```

### 6. Integration in App

#### Update App Entry Point
Update your `App.tsx` to include push notifications initialization:

```typescript
import React, { useEffect } from 'react';
import { initializePushNotifications } from './src/services/pushNotifications';

const App = () => {
  useEffect(() => {
    // Initialize push notifications when app starts
    const setupPushNotifications = async () => {
      await initializePushNotifications();
    };
    
    setupPushNotifications();
  }, []);

  // ... rest of your app
};
```

#### Update App Navigation
Add the NotificationsScreen to your navigation stack:

```typescript
// In your navigation file
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

// Add to your navigator
<Stack.Screen
  name="Notifications"
  component={NotificationsScreen}
  options={{ 
    title: 'Notifications',
    tabBarBadge: notifications.unreadCount > 0 ? notifications.unreadCount : undefined,
  }}
/>
```

### 7. Advanced Features Implementation

#### Create Notification Scheduler Service
Create a file `src/services/notificationScheduler.ts`:

```typescript
import {
  scheduleLocalNotification,
  cancelLocalNotification,
  cancelAllLocalNotifications,
} from './pushNotifications';
import { logEvent } from './analytics';

// Scheduled notification interface
export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  date: Date;
  data?: Record<string, any>;
  recurring?: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly';
}

// Schedule notification
export const scheduleNotification = async (
  notification: ScheduledNotification,
): Promise<void> => {
  try {
    await scheduleLocalNotification(
      notification.title,
      notification.body,
      notification.date,
      notification.data,
    );
    
    // Log analytics event
    await logEvent('notification_scheduled', {
      id: notification.id,
      recurring: notification.recurring,
      recurringInterval: notification.recurringInterval,
    });
    
    console.log('Notification scheduled:', notification);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    
    // Log analytics event
    await logEvent('notification_scheduling_error', {
      id: notification.id,
      error: error.message,
    });
    
    throw error;
  }
};

// Cancel scheduled notification
export const cancelScheduledNotification = async (id: string): Promise<void> => {
  try {
    await cancelLocalNotification(id);
    
    // Log analytics event
    await logEvent('scheduled_notification_cancelled', {
      id,
    });
    
    console.log('Scheduled notification cancelled:', id);
  } catch (error) {
    console.error('Failed to cancel scheduled notification:', error);
    
    // Log analytics event
    await logEvent('scheduled_notification_cancellation_error', {
      id,
      error: error.message,
    });
    
    throw error;
  }
};

// Cancel all scheduled notifications
export const cancelAllScheduledNotifications = async (): Promise<void> => {
  try {
    await cancelAllLocalNotifications();
    
    // Log analytics event
    await logEvent('all_scheduled_notifications_cancelled');
    
    console.log('All scheduled notifications cancelled');
  } catch (error) {
    console.error('Failed to cancel all scheduled notifications:', error);
    
    // Log analytics event
    await logEvent('all_scheduled_notifications_cancellation_error', {
      error: error.message,
    });
    
    throw error;
  }
};

// Schedule recurring notification
export const scheduleRecurringNotification = async (
  notification: ScheduledNotification,
): Promise<void> => {
  try {
    if (!notification.recurring || !notification.recurringInterval) {
      throw new Error('Recurring notification must have recurring interval');
    }
    
    // Schedule initial notification
    await scheduleNotification(notification);
    
    // Calculate next notification date based on recurring interval
    let nextDate = new Date(notification.date);
    
    switch (notification.recurringInterval) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    
    // Schedule next notification
    const nextNotification: ScheduledNotification = {
      ...notification,
      date: nextDate,
    };
    
    await scheduleNotification(nextNotification);
    
    // Log analytics event
    await logEvent('recurring_notification_scheduled', {
      id: notification.id,
      recurringInterval: notification.recurringInterval,
    });
    
    console.log('Recurring notification scheduled:', notification);
  } catch (error) {
    console.error('Failed to schedule recurring notification:', error);
    
    // Log analytics event
    await logEvent('recurring_notification_scheduling_error', {
      id: notification.id,
      recurringInterval: notification.recurringInterval,
      error: error.message,
    });
    
    throw error;
  }
};
```

### 8. Testing and Debugging

#### Enable Debug Mode
Create a file `src/services/pushNotificationsDebug.ts`:

```typescript
import { logEvent } from './analytics';

// Enable debug mode for push notifications
export const enablePushNotificationsDebugMode = async () => {
  try {
    // Note: This is a placeholder for any platform-specific debug setup
    console.log('Push notifications debug mode enabled');
    
    // Log analytics event
    await logEvent('push_notifications_debug_mode_enabled');
  } catch (error) {
    console.error('Failed to enable push notifications debug mode:', error);
  }
};

// Test push notification
export const testPushNotification = async () => {
  try {
    // This is a placeholder for testing push notifications
    console.log('Testing push notification...');
    
    // Log analytics event
    await logEvent('test_push_notification');
  } catch (error) {
    console.error('Failed to test push notification:', error);
  }
};
```

### 9. Best Practices and Optimization

#### Push Notifications Best Practices
1. **Request permission at the right time**: Ask for notification permission after showing value
2. **Personalize notifications**: Use user data to personalize notification content
3. **Provide clear value**: Ensure notifications provide clear value to users
4. **Respect user preferences**: Allow users to customize notification preferences
5. **Send notifications at appropriate times**: Avoid sending notifications late at night

#### Performance Optimization
1. **Batch notifications**: Group related notifications together
2. **Use appropriate priority**: Set appropriate priority for different types of notifications
3. **Optimize images**: Use optimized images for notifications
4. **Limit notification frequency**: Avoid sending too many notifications
5. **Use collapse key**: Use collapse key to replace similar notifications

#### User Experience Guidelines
1. **Provide clear context**: Make sure notifications provide clear context
2. **Allow easy dismissal**: Allow users to easily dismiss notifications
3. **Provide actionable content**: Make notifications actionable when possible
4. **Respect user attention**: Don't abuse notifications to get user attention
5. **Handle notification responses**: Properly handle user responses to notifications

## Troubleshooting

### Common Issues

#### Notifications Not Received
1. Check if notification permission is granted
2. Verify FCM token is registered with backend
3. Ensure device is connected to internet
4. Check if app is in foreground or background

#### Notifications Not Displayed in Foreground
1. Verify foreground notification handler is implemented
2. Check if local notification display is working
3. Ensure notification content is properly formatted
4. Check if notification priority is set correctly

#### Token Registration Failing
1. Check if Firebase is properly configured
2. Verify internet connectivity
3. Ensure app has proper permissions
4. Check if Firebase project is correctly set up

### Debugging Tools
1. **Firebase Console**: Use Firebase Console to send test notifications
2. **Device Logs**: Check device logs for notification-related errors
3. **Network Inspector**: Monitor network requests for token registration
4. **Background App Refresh**: Ensure background app refresh is enabled

## Conclusion
This guide provides a comprehensive implementation of push notifications in your React Native application. By following these steps, you'll be able to effectively engage users with timely and relevant notifications.

Remember to:
- Always follow platform guidelines for push notifications
- Provide clear value to users with each notification
- Test thoroughly across different devices and platforms
- Handle edge cases gracefully
- Comply with privacy regulations and platform policies