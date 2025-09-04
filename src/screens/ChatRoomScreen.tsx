import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import useChatStore from "../state/chatStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";

export type ChatRoomRouteProp = RouteProp<RootStackParamList, "ChatRoom">;

export default function ChatRoomScreen() {
  const { params } = useRoute<ChatRoomRouteProp>();
  const { roomId } = params;

  const { 
    currentChatRoom,
    messages,
    joinChatRoom,
    leaveChatRoom,
    sendMessage,
    setTyping,
    typingUsers
  } = useChatStore();

  const listRef = useRef<FlashList<any>>(null);

  useEffect(() => {
    joinChatRoom(roomId);
    return () => leaveChatRoom(roomId);
  }, [roomId]);

  const roomMessages = messages[roomId] || [];

  const onSend = (text: string) => {
    sendMessage(roomId, text);
    // scroll to bottom after send
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Room header inside content for now; navigator header shows default title */}
      <View className="px-4 py-3 border-b border-border bg-surface-800">
        <Text className="text-text-primary text-lg font-bold">
          {currentChatRoom?.name || "Chat"}
        </Text>
        <Text className="text-text-secondary text-xs">
          {currentChatRoom?.onlineCount || 0} online
        </Text>
      </View>

      <FlashList
        ref={listRef}
        data={roomMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        estimatedItemSize={64}
        contentContainerStyle={{ padding: 12 }}
      />

      {/* Typing indicator */}
      {typingUsers.filter(t => t.chatRoomId === roomId).length > 0 && (
        <View className="px-4 pb-1">
          <Text className="text-text-muted text-xs">
            {typingUsers.filter(t => t.chatRoomId === roomId).slice(0,2).map(t => t.userName).join(", ")}
            {typingUsers.filter(t => t.chatRoomId === roomId).length > 2 ? " and others" : ""} typing...
          </Text>
        </View>
      )}

      <ChatInput 
        onSend={onSend}
        onTyping={(v) => setTyping(roomId, v)}
      />
    </SafeAreaView>
  );
}
