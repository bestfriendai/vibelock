import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import useChatStore from "../state/chatStore";
import useAuthStore from "../state/authStore";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ChatRoomList">;

interface ChatRoomListItem {
  id: string;
  name: string;
  type: "private" | "group";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  participants?: number;
}

export const ChatRoomListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { chatRooms, loadChatRooms } = useChatStore();

  // Transform global ChatRoom type to navigation-compatible type
  const displayChatRooms: ChatRoomListItem[] = chatRooms.map((room) => ({
    id: room.id,
    name: room.name,
    type: room.type === "local" ? "private" : "group", // Map global types to navigation types
    lastMessage: room.lastMessage?.content,
    lastMessageTime: room.lastActivity ? new Date(room.lastActivity).toLocaleTimeString() : undefined,
    unreadCount: room.unreadCount,
    participants: room.memberCount,
  }));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  const navigateToChatRoom = (room: ChatRoomListItem) => {
    navigation.navigate("ChatRoom", {
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
    });
  };

  const renderChatRoom = ({ item }: { item: ChatRoomListItem }) => (
    <TouchableOpacity
      onPress={() => navigateToChatRoom(item)}
      className="flex-row items-center p-4 border-b border-gray-800"
    >
      <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center mr-3">
        <Ionicons name={item.type === "group" ? "people" : "person"} size={24} color="white" />
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-white font-semibold text-base">{item.name}</Text>
          {item.lastMessageTime && <Text className="text-gray-400 text-xs">{item.lastMessageTime}</Text>}
        </View>

        {item.lastMessage && (
          <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>

      {item.unreadCount && item.unreadCount > 0 && (
        <View className="bg-blue-500 rounded-full px-2 py-1 ml-2">
          <Text className="text-white text-xs font-bold">{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate("CreateChatRoom")} className="p-2">
          <Ionicons name="create-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayChatRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-8">
            <Ionicons name="chatbubbles-outline" size={64} color="#666" />
            <Text className="text-gray-400 text-center mt-4">No conversations yet. Start a new chat!</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("CreateChatRoom")}
              className="mt-4 bg-blue-500 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">Start Chat</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};
