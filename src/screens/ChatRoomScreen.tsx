import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import useChatStore from "../state/chatStore";
import { useAuthState } from "../utils/authUtils";
import { RootStackParamList } from "../navigation/AppNavigator";
import IMessageBubble from "../components/iMessageBubble";
import IMessageInput from "../components/iMessageInput";
import { ChatMessage } from "../types";
import { useTheme } from "../providers/ThemeProvider";
import { notificationService } from "../services/notificationService";

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
  const navigation = useNavigation<any>();
  const { canAccessChat, needsSignIn, user } = useAuthState();
  const { theme, colors, isDarkMode } = useTheme();

  const { roomId } = params;
  const [showMemberList, setShowMemberList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isNotificationToggling, setIsNotificationToggling] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const mountedRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentChatRoom,
    messages,
    members,
    joinChatRoom,
    leaveChatRoom,
    sendMessage,
    setTyping,
    typingUsers,
    loadOlderMessages,
    isLoading
  } = useChatStore();

  // Guard against guest access or missing user data
  if (!canAccessChat || needsSignIn || !user) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="chatbubbles-outline" size={64} color="#6B7280" />
          <Text className="text-text-primary text-xl font-bold mt-4 text-center">
            Sign In Required
          </Text>
          <Text className="text-text-secondary text-center mt-2 leading-6">
            You need to sign in to join chat rooms and participate in conversations.
          </Text>
          <Pressable
            onPress={() => navigation.navigate("SignIn")}
            className="bg-brand-red rounded-xl px-6 py-3 mt-6"
          >
            <Text className="text-black font-semibold text-base">Sign In</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.goBack()}
            className="mt-4"
          >
            <Text className="text-text-muted text-base">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const listRef = useRef<FlashList<any>>(null);

  useEffect(() => {
    joinChatRoom(roomId);
    return () => {
      mountedRef.current = false;
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      leaveChatRoom(roomId);
    };
  }, [roomId]);

  useEffect(() => {
    notificationService.getChatRoomSubscription(roomId)
      .then(result => {
        if (mountedRef.current) {
          setIsSubscribed(result);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setIsSubscribed(false);
        }
      });
  }, [roomId]);


  const roomMessages = messages[roomId] || [];
  const roomMembers = members[roomId] || [];

  const onSend = (text: string) => {
    sendMessage(roomId, text);
    setReplyingTo(null);

    // Clear any existing scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // scroll to bottom after send
    scrollTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && listRef.current && roomMessages.length > 0) {
        listRef.current.scrollToIndex({ index: roomMessages.length - 1, animated: true });
      }
      scrollTimeoutRef.current = null;
    }, 100);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleReact = (messageId: string, reaction: string) => {
    // Handle message reaction
    console.log(`React to message ${messageId} with ${reaction}`);
  };

  const scrollToBottom = () => {
    if (listRef.current && roomMessages.length > 0) {
      listRef.current.scrollToIndex({ index: roomMessages.length - 1, animated: true });
    }
  };

  const handleLoadOlderMessages = async () => {
    if (isLoadingOlderMessages) return;

    setIsLoadingOlderMessages(true);
    try {
      await loadOlderMessages(roomId);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Simple iMessage-style header */}
        <View
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: colors.surface[800],
            borderColor: colors.border
          }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => navigation.goBack()}
              className="mr-3"
            >
              <Ionicons name="chevron-back" size={24} color={colors.brand.red} />
            </Pressable>
            <View className="flex-1">
              <Text
                className="text-lg font-semibold text-center"
                style={{ color: colors.text.primary }}
              >
                {currentChatRoom?.name || "Anonymous Chat"}
              </Text>
            </View>
            <View className="w-6" />
          </View>
        </View>

        <FlashList
          ref={listRef}
          data={roomMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            if (!item || !item.id || !user) {
              return null;
            }
            return (
              <IMessageBubble
                message={item}
                isOwn={item.senderId === user.id}
                previousMessage={roomMessages[index - 1]}
                nextMessage={roomMessages[index + 1]}
                onReply={handleReply}
                onReact={handleReact}
              />
            );
          }}
          estimatedItemSize={60}
          inverted // This fixes the scroll behavior
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 16,
            backgroundColor: colors.background
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            roomMessages.length > 0 ? (
              <View className="items-center py-1">
                <Pressable
                  onPress={handleLoadOlderMessages}
                  disabled={isLoadingOlderMessages}
                  className={`bg-surface-700 rounded-full px-2.5 py-1 ${isLoadingOlderMessages ? "opacity-50" : ""}`}
                >
                  <Text className="text-text-secondary text-xs font-medium">
                    {isLoadingOlderMessages ? "Loading..." : "Load older messages"}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />

        {/* Typing indicator */}
        {typingUsers.filter((t) => t.chatRoomId === roomId).length > 0 && (
          <View className="px-4 py-1">
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

        <IMessageInput
          onSend={onSend}
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
      </KeyboardAvoidingView>

      {/* Member List Modal */}
      <Modal
        visible={showMemberList}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMemberList(false)}
      >
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border sm:px-6">
            <Text className="text-text-primary text-lg font-bold">Members ({roomMembers.length})</Text>
            <Pressable onPress={() => setShowMemberList(false)} className="p-2">
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          <FlashList
            data={roomMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="flex-row items-center px-4 py-3 border-b border-surface-700 sm:px-6 sm:py-4">
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
