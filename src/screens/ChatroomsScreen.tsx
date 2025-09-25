import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, FlatList, RefreshControl, Pressable } from "react-native";
import Fuse from "fuse.js";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useChatStore from "../state/chatStore";
import useAuthStore from "../state/authStore";
import { useAuthState } from "../utils/authUtils";
import { useTheme } from "../providers/ThemeProvider";
import SegmentedTabs from "../components/SegmentedTabs";
import EnhancedChatRoomCard from "../components/EnhancedChatRoomCard";
import EmptyState from "../components/EmptyState";
import { STRINGS } from "../constants/strings";
import { ChatRoom } from "../types";
import { useNavigation } from "@react-navigation/native";
import { startTimer } from "../utils/performance";
import OfflineBanner from "../components/OfflineBanner";
import { useOffline } from "../hooks/useOffline";
import type { RootStackNavigationProp } from "../navigation/AppNavigator";

export default function ChatroomsScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { colors } = useTheme();
  const {
    chatRooms,
    loadChatRooms,
    isLoading,
    onlineUsers,
    setRoomCategoryFilter,
    typingUsers,
    error,
    connectionStatus,
  } = useChatStore();
  const { user, canAccessChat, needsSignIn } = useAuthState();
  const { setTestUser } = useAuthStore();
  const [category, setCategory] = useState<"all" | "men" | "women" | "lgbtq+">(user?.genderPreference || "all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreRooms, setHasMoreRooms] = useState(true);
  const { isOnline, retryWithBackoff } = useOffline();

  // Debug logging for authentication state
  useEffect(() => {
    // Additional auth store debugging
    const authState = useAuthStore.getState();
  }, [user, canAccessChat, needsSignIn, chatRooms.length, isLoading, error, connectionStatus]);

  useEffect(() => {
    const done = startTimer("chatrooms:initialLoad");
    retryWithBackoff(loadChatRooms)
      .then(() => {})
      .catch((error) => {
        console.error("❌ ChatroomsScreen: loadChatRooms failed:", error);
      })
      .finally(done);
  }, [loadChatRooms, retryWithBackoff]);

  useEffect(() => {
    setRoomCategoryFilter(category);
    const done = startTimer(`chatrooms:category:${category}`);
    retryWithBackoff(loadChatRooms).finally(done);
  }, [category, setRoomCategoryFilter, loadChatRooms]);

  // Debounce search input for performance
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fuse = useMemo(
    () =>
      new Fuse(chatRooms, {
        keys: ["name", "description"],
        threshold: 0.3, // Fuzzy match tolerance
      }),
    [chatRooms],
  );

  const filtered = useMemo(() => {
    if (!debouncedQuery) return chatRooms;
    return fuse.search(debouncedQuery).map((result) => result.item);
  }, [debouncedQuery, fuse, chatRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    const done = startTimer("chatrooms:pullToRefresh");
    try {
      await retryWithBackoff(loadChatRooms);
    } finally {
      done();
    }
    setRefreshing(false);
  };

  const openRoom = (room: ChatRoom) => {
    // Navigate to the parent stack's ChatRoom screen
    navigation.getParent()?.navigate("ChatRoom", { roomId: room.id });
  };

  // Development bypass for testing (remove in production)
  const isDevelopment = __DEV__;
  const allowDevAccess = false; // Always false in production

  // Guest mode protection (with development bypass)
  if ((!canAccessChat || needsSignIn) && !allowDevAccess) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center px-6">
          <View className="rounded-2xl p-8 w-full max-w-sm" style={{ backgroundColor: colors.surface[800] }}>
            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${colors.brand.red}20` }}
              >
                <Text className="text-2xl" style={{ color: colors.brand.red }}>
                  💬
                </Text>
              </View>
              <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.text.primary }}>
                Join Chat Rooms
              </Text>
              <Text className="text-center" style={{ color: colors.text.secondary }}>
                Create an account to join community discussions and connect with others in your area.
              </Text>
            </View>

            <View className="space-y-3">
              <Pressable
                className="rounded-lg py-4 items-center"
                style={{ backgroundColor: colors.brand.red }}
                onPress={() => {
                  // Navigate to sign up
                }}
              >
                <Text className="text-white font-semibold text-lg">Sign Up</Text>
              </Pressable>

              <Pressable
                className="rounded-lg py-4 items-center"
                style={{ backgroundColor: colors.surface[700] }}
                onPress={() => {
                  // Navigate to sign in
                }}
              >
                <Text className="font-semibold text-lg" style={{ color: colors.text.primary }}>
                  Sign In
                </Text>
              </Pressable>

              {/* Development debug button */}
              {__DEV__ && (
                <Pressable
                  className="rounded-lg py-2 items-center mt-4"
                  style={{ backgroundColor: colors.brand.red + "20", borderWidth: 1, borderColor: colors.brand.red }}
                  onPress={() => {
                    setTestUser();
                  }}
                >
                  <Text className="font-semibold text-sm" style={{ color: colors.brand.red }}>
                    🧪 DEV: Create Test User
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Debug logging for render state
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <OfflineBanner onRetry={loadChatRooms} />
      {/* Header */}
      <View
        className="px-6 py-6"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
          backgroundColor: colors.background,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
            Chat Rooms
          </Text>
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{
                backgroundColor:
                  connectionStatus === "connected" && isOnline
                    ? "#22c55e"
                    : connectionStatus === "connecting"
                      ? "#f59e0b"
                      : "#ef4444",
              }}
              accessibilityLabel={`Connection status: ${connectionStatus}`}
            />
            <Text className="text-xs" style={{ color: colors.text.muted }}>
              {connectionStatus}
            </Text>
          </View>
        </View>
        <View
          className="mt-6 rounded-xl px-4 py-3 flex-row items-center"
          style={{ backgroundColor: colors.surface[700] }}
        >
          <Ionicons name="search" size={16} color={colors.text.muted} />
          <TextInput
            className="flex-1 ml-2"
            style={{ color: colors.text.primary }}
            placeholder="Search rooms"
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View className="px-0 mt-6">
          <SegmentedTabs
            tabs={[
              { key: "all", label: "All" },
              { key: "men", label: "Men" },
              { key: "women", label: "Women" },
              { key: "lgbtq+", label: "LGBTQ+" },
            ]}
            value={category}
            onChange={(val) => setCategory(val as any)}
          />
        </View>
      </View>

      {/* Error bar */}
      {!!error && (
        <View className="mx-6 mt-3 bg-surface-800 border border-surface-700 rounded-xl p-3">
          <Text className="text-text-primary text-sm font-medium">Something went wrong</Text>
          <Text className="text-text-secondary text-xs mt-1">{error}</Text>
          <View className="flex-row justify-end mt-2">
            <Pressable
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Retry loading chat rooms"
              accessibilityHint="Tap to reload the list of chat rooms"
              onPress={loadChatRooms}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: colors.brand.red }}
            >
              <Text className="text-black text-xs font-semibold">Retry</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        accessible={true}
        accessibilityRole="list"
        accessibilityLabel="List of available chat rooms"
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={21}
        getItemLayout={(data, index) => ({ length: 100, offset: 100 * index, index })} // If fixed height
        onEndReached={() => {
          if (hasMoreRooms && !refreshing) {
            setPage((prev) => prev + 1);
            loadChatRooms();
          }
        }}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item }) => (
          <EnhancedChatRoomCard
            room={item}
            onPress={openRoom}
            onlineCount={(onlineUsers as any)[item.id]?.length || 0}
            unreadCount={item.unreadCount || 0}
            isTyping={typingUsers.some((t) => t.chatRoomId === item.id)}
            typingUsers={typingUsers.filter((t) => t.chatRoomId === item.id).map((t) => t.userName)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isLoading ? (
            <View className="px-6 py-8">
              {[...Array(6)].map((_, i) => (
                <View key={i} className="mb-4">
                  <View className="h-16 rounded-xl" style={{ backgroundColor: colors.surface[800] }} />
                </View>
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={debouncedQuery ? "No matching rooms" : "No chat rooms available"}
              description={debouncedQuery ? "Try adjusting your search" : "Create or join a room to start chatting"}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
