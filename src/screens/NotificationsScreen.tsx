import React, { useEffect, useCallback, useState } from "react";
import { View, Text, Pressable, RefreshControl, Platform, PermissionsAndroid } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "../components/EmptyState";
import { STRINGS } from "../constants/strings";
import useNotificationStore from "../state/notificationStore";
import useAuthStore from "../state/authStore";

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { notifications, unreadCount, isLoading, initialize, loadNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // On Android 13+ request POST_NOTIFICATIONS permission when viewing Notifications
    const requestNotifPermission = async () => {
      try {
        if (Platform.OS === "android" && Platform.Version >= 33) {
          await PermissionsAndroid.request("android.permission.POST_NOTIFICATIONS");
        }
      } catch (e) {
        // Ignore errors
      }
    };

    // Combine both initialization and loading notifications
    const initializeAndLoad = async () => {
      await initialize();
      if (user?.id) {
        await loadNotifications(user.id);
      }
    };

    requestNotifPermission();
    initializeAndLoad();
  }, [initialize, user?.id, loadNotifications]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await loadNotifications(user.id);
    setRefreshing(false);
  }, [user?.id, loadNotifications]);

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="px-6 py-6 border-b border-border bg-surface-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-text-primary text-2xl font-bold">Notifications</Text>
          {unreadCount > 0 && (
            <Pressable
              className="bg-brand-red rounded-full px-3 py-1"
              onPress={() => user?.id && markAllAsRead(user.id)}
            >
              <Text className="text-black text-sm font-semibold">Mark all read</Text>
            </Pressable>
          )}
        </View>
        <Text className="text-text-secondary text-sm mt-1">{unreadCount} unread</Text>
      </View>

      <FlashList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => markAsRead(item.id)}
            className={`px-4 py-4 border-b border-surface-700 ${item.isRead ? "bg-surface-900" : "bg-surface-800"}`}
          >
            <View className="flex-row items-start">
              <View className="w-8 items-center mt-1">
                {item.type === "new_comment" && <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" />}
                {item.type === "new_message" && <Ionicons name="mail-unread-outline" size={18} color="#9CA3AF" />}
                {item.type === "new_review" && <Ionicons name="star-outline" size={18} color="#9CA3AF" />}
                {item.type === "safety_alert" && <Ionicons name="warning-outline" size={18} color="#F59E0B" />}
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-medium">{item.title}</Text>
                {!!item.body && (
                  <Text className="text-text-secondary mt-1" numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
                <Text className="text-text-muted text-xs mt-1">{item.createdAt.toLocaleString()}</Text>
              </View>
              {!item.isRead && <View className="w-2 h-2 bg-brand-red rounded-full mt-2" />}
            </View>
          </Pressable>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9CA3AF" />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={STRINGS.EMPTY_STATES.NOTIFICATIONS.icon}
              title={STRINGS.EMPTY_STATES.NOTIFICATIONS.title}
              description={STRINGS.EMPTY_STATES.NOTIFICATIONS.description}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
