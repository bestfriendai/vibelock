import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, FlatList, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useChatStore from "../state/chatStore";
import SegmentedTabs from "../components/SegmentedTabs";
import ChatRoomCard from "../components/ChatRoomCard";
import { ChatRoom } from "../types";
import { useNavigation } from "@react-navigation/native";

export default function ChatroomsScreen() {
  const navigation = useNavigation<any>();
  const { chatRooms, loadChatRooms, isLoading, onlineUsers, setRoomCategoryFilter } = useChatStore();
  const { user, isGuestMode } = require("../state/authStore").default.getState();
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

  // Guest mode protection
  if (isGuestMode) {
    return (
      <SafeAreaView className="flex-1 bg-surface-900">
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-surface-800 rounded-2xl p-8 w-full max-w-sm">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-brand-red/20 rounded-full items-center justify-center mb-4">
                <Text className="text-brand-red text-2xl">💬</Text>
              </View>
              <Text className="text-2xl font-bold text-text-primary mb-2 text-center">
                Join Chat Rooms
              </Text>
              <Text className="text-text-secondary text-center">
                Create an account to join community discussions and connect with others in your area.
              </Text>
            </View>
            
            <View className="space-y-3">
              <Pressable 
                className="bg-brand-red rounded-lg py-4 items-center"
                onPress={() => {
                  // Navigate to sign up
                }}
              >
                <Text className="text-white font-semibold text-lg">Sign Up</Text>
              </Pressable>
              
              <Pressable 
                className="bg-surface-700 rounded-lg py-4 items-center"
                onPress={() => {
                  // Navigate to sign in
                }}
              >
                <Text className="text-text-primary font-semibold text-lg">Sign In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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

        <View className="px-4 mt-3">
          <SegmentedTabs
            tabs={[
              { key: "all", label: "All" },
              { key: "men", label: "Men" },
              { key: "women", label: "Women" },
              { key: "lgbtq+", label: "LGBTQ+" }
            ]}
            value={category}
            onChange={(val) => setCategory(val as any)}
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
