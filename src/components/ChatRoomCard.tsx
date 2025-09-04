import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChatRoom } from "../types";

interface Props {
  room: ChatRoom;
  onPress?: (room: ChatRoom) => void;
}

const typeColors: Record<ChatRoom["type"], string> = {
  local: "bg-emerald-500/20 text-emerald-400",
  global: "bg-sky-500/20 text-sky-400",
  topic: "bg-purple-500/20 text-purple-400",
};

export default function ChatRoomCard({ room, onPress }: Props) {
  const unread = 0; // placeholder, compute in parent if needed
  const badgeCls = typeColors[room.type];

  return (
    <Pressable
      onPress={() => onPress?.(room)}
      className="bg-surface-800 border border-border rounded-2xl p-4 mb-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-text-primary text-lg font-bold mr-2" numberOfLines={1}>
              {room.name}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${badgeCls}`}>
              <Text className="text-xs font-semibold capitalize">{room.type}</Text>
            </View>
          </View>
          {room.description ? (
            <Text className="text-text-secondary text-sm mt-1" numberOfLines={2}>
              {room.description}
            </Text>
          ) : null}
          {room.lastMessage ? (
            <Text className="text-text-muted text-xs mt-2" numberOfLines={1}>
              {room.lastMessage.senderName}: {room.lastMessage.content}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={16} color="#9CA3AF" />
            <Text className="text-text-secondary text-sm ml-1">{room.onlineCount}/{room.memberCount}</Text>
          </View>
          {unread > 0 && (
            <View className="mt-2 bg-brand-red rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-semibold">{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
