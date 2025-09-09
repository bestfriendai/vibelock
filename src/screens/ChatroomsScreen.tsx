import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, FlatList, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useChatStore from "../state/chatStore";
import { useAuthState } from "../utils/authUtils";
import { useTheme } from "../providers/ThemeProvider";
import SegmentedTabs from "../components/SegmentedTabs";
import ChatRoomCard from "../components/ChatRoomCard";
import { ChatRoom } from "../types";
import { useNavigation } from "@react-navigation/native";

export default function ChatroomsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { chatRooms, loadChatRooms, isLoading, onlineUsers, setRoomCategoryFilter } = useChatStore();
  const { user, canAccessChat, needsSignIn } = useAuthState();
  const [category, setCategory] = useState<"all" | "men" | "women" | "lgbtq+">(user?.genderPreference || "all");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, []);

  useEffect(() => {
    setRoomCategoryFilter(category);
    loadChatRooms();
  }, [category]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const rooms = Array.isArray(chatRooms) ? chatRooms : [];
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r && r.name && r.description && (r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)),
    );
  }, [query, chatRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  const openRoom = (room: ChatRoom) => {
    navigation.navigate("ChatRoom", { roomId: room.id });
  };

  // Guest mode protection
  if (!canAccessChat || needsSignIn) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center px-6">
          <View
            className="rounded-2xl p-8 w-full max-w-sm"
            style={{ backgroundColor: colors.surface[800] }}
          >
            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${colors.brand.red}20` }}
              >
                <Text className="text-2xl" style={{ color: colors.brand.red }}>💬</Text>
              </View>
              <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.text.primary }}>Join Chat Rooms</Text>
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
                <Text className="font-semibold text-lg" style={{ color: colors.text.primary }}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="px-6 py-6"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>Chat Rooms</Text>
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item }) => <ChatRoomCard room={item} onPress={openRoom} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text className="text-text-secondary text-lg font-medium mt-4">No chat rooms found</Text>
              <Text className="text-text-muted text-center mt-2">Try adjusting your search</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
