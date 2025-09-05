import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import useChatStore from "../state/chatStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import { ChatMessage } from "../types";

export type ChatRoomRouteProp = RouteProp<RootStackParamList, "ChatRoom">;

function toDateSafe(value: any): Date {
  try {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate();
    if (typeof value === "number") return new Date(value < 1e12 ? value * 1000 : value);
    if (typeof value === "string") return new Date(value);
    return new Date();
  } catch {
    return new Date();
  }
}

export default function ChatRoomScreen() {
  const { params } = useRoute<ChatRoomRouteProp>();

  const { roomId } = params;
  const [showMemberList, setShowMemberList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const { currentChatRoom, messages, members, joinChatRoom, leaveChatRoom, sendMessage, setTyping, typingUsers } =
    useChatStore();

  const listRef = useRef<FlashList<any>>(null);

  useEffect(() => {
    joinChatRoom(roomId);
    return () => leaveChatRoom(roomId);
  }, [roomId]);

  const roomMessages = messages[roomId] || [];
  const roomMembers = members[roomId] || [];

  const onSend = (text: string) => {
    sendMessage(roomId, text);
    setReplyingTo(null);
    // scroll to bottom after send
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleReact = (messageId: string, reaction: string) => {
    // Handle message reaction
    console.log(`React to message ${messageId} with ${reaction}`);
  };

  const scrollToBottom = () => {
    listRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Enhanced Room Header */}
      <View className="px-4 py-3 border-b border-border bg-surface-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text-primary text-lg font-bold">{currentChatRoom?.name || "Chat"}</Text>
            <Text className="text-text-secondary text-xs">
              {currentChatRoom?.onlineCount || 0} online • {roomMembers.length} members
            </Text>
          </View>

          <View className="flex-row items-center space-x-3">
            <Pressable onPress={() => setShowMemberList(true)} className="p-2 rounded-full bg-surface-700">
              <Ionicons name="people" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable onPress={scrollToBottom} className="p-2 rounded-full bg-surface-700">
              <Ionicons name="arrow-down" size={18} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>
      </View>

      <FlashList
        ref={listRef}
        data={roomMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} onReply={handleReply} onReact={handleReact} />}
        estimatedItemSize={64}
        contentContainerStyle={{ padding: 12 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {typingUsers.filter((t) => t.chatRoomId === roomId).length > 0 && (
        <View className="px-4 pb-1">
          <View className="flex-row items-center">
            <View className="flex-row space-x-1 mr-2">
              <View className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
              <View className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
              <View className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
            </View>
            <Text className="text-text-muted text-xs">
              {typingUsers
                .filter((t) => t.chatRoomId === roomId)
                .slice(0, 2)
                .map((t) => t.userName)
                .join(", ")}
              {typingUsers.filter((t) => t.chatRoomId === roomId).length > 2 ? " and others" : ""} typing...
            </Text>
          </View>
        </View>
      )}

      <ChatInput
        onSend={onSend}
        onTyping={(v) => setTyping(roomId, v)}
        replyingTo={
          replyingTo
            ? {
                id: replyingTo.id,
                content: replyingTo.content,
                senderName: replyingTo.senderName,
              }
            : null
        }
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Member List Modal */}
      <Modal
        visible={showMemberList}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMemberList(false)}
      >
        <SafeAreaView className="flex-1 bg-surface-900">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-text-primary text-lg font-bold">Members ({roomMembers.length})</Text>
            <Pressable onPress={() => setShowMemberList(false)} className="p-2">
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          <FlashList
            data={roomMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="flex-row items-center px-4 py-3 border-b border-surface-700">
                <View className="w-10 h-10 bg-brand-red rounded-full items-center justify-center mr-3">
                  <Text className="text-black font-bold">{item.userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary font-medium">{item.userName}</Text>
                  <Text className="text-text-muted text-xs">
                    {item.isOnline ? "Online" : `Last seen ${toDateSafe(item.lastSeen).toLocaleDateString()}`}
                  </Text>
                </View>
                {item.isOnline && <View className="w-2 h-2 bg-green-500 rounded-full" />}
              </View>
            )}
            estimatedItemSize={56}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Ionicons name="people-outline" size={48} color="#6B7280" />
                <Text className="text-text-secondary text-lg font-medium mt-4">No members found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
