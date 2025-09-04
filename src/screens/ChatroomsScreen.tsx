import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useChatStore from "../state/chatStore";
import ChatRoomCard from "../components/ChatRoomCard";
import { ChatRoom } from "../types";
import { useNavigation } from "@react-navigation/native";

export default function ChatroomsScreen() {
  const navigation = useNavigation<any>();
  const { chatRooms, loadChatRooms, isLoading, onlineUsers } = useChatStore();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return chatRooms;
    return chatRooms.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [query, chatRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  const openRoom = (room: ChatRoom) => {
    navigation.navigate("ChatRoom", { roomId: room.id });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="px-4 py-4 border-b border-border bg-surface-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-text-primary text-2xl font-bold">Chat Rooms</Text>
          <View className="flex-row items-center">
            <Ionicons name="wifi" size={16} color="#9CA3AF" />
            <Text className="text-text-secondary text-sm ml-1">{onlineUsers.length} online</Text>
          </View>
        </View>
        <View className="mt-3 bg-surface-700 rounded-xl px-3 py-2 flex-row items-center">
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-text-primary"
            placeholder="Search rooms"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <ChatRoomCard room={item} onPress={openRoom} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!isLoading ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
            <Text className="text-text-secondary text-lg font-medium mt-4">No chat rooms found</Text>
            <Text className="text-text-muted text-center mt-2">Try adjusting your search</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}
