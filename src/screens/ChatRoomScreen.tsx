import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { KeyboardToolbar } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import useChatStore from "../state/chatStore";
import { useAuthState } from "../utils/authUtils";
import { RootStackParamList, RootStackNavigationProp } from "../navigation/AppNavigator";
import EnhancedMessageBubble from "../components/EnhancedMessageBubble";
import EnhancedMessageInput from "../components/EnhancedMessageInput";
import SmartChatFeatures from "../components/SmartChatFeatures";
import EmojiPicker from "../components/EmojiPicker";
import MessageActionsModal from "../components/MessageActionsModal";
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
  const navigation = useNavigation<RootStackNavigationProp>();
  const { canAccessChat, needsSignIn, user } = useAuthState();
  const { colors } = useTheme();

  const { roomId } = params;
  const [showMemberList, setShowMemberList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

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
  } = useChatStore();

  const listRef = useRef<FlashListRef<any>>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isActionsModalVisible, setIsActionsModalVisible] = useState(false);

  useEffect(() => {
    if (canAccessChat && !needsSignIn && user) {
      joinChatRoom(roomId);
    }
    return () => {
      mountedRef.current = false;
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (canAccessChat && !needsSignIn && user) {
        leaveChatRoom(roomId);
      }
    };
  }, [roomId, canAccessChat, needsSignIn, user, joinChatRoom, leaveChatRoom]);

  useEffect(() => {
    if (canAccessChat && !needsSignIn && user) {
      notificationService
        .getChatRoomSubscription(roomId)
        .then((result) => {
          if (mountedRef.current) {
            setIsSubscribed(result);
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setIsSubscribed(false);
          }
        });
    }
  }, [roomId, canAccessChat, needsSignIn, user]);

  // Guard against guest access or missing user data
  if (!canAccessChat || needsSignIn || !user) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="chatbubbles-outline" size={64} color="#6B7280" />
          <Text className="text-text-primary text-xl font-bold mt-4 text-center">Sign In Required</Text>
          <Text className="text-text-secondary text-center mt-2 leading-6">
            You need to sign in to join chat rooms and participate in conversations.
          </Text>
          <Pressable onPress={() => navigation.navigate("SignIn")} className="bg-brand-red rounded-xl px-6 py-3 mt-6">
            <Text className="text-black font-semibold text-base">Sign In</Text>
          </Pressable>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"))}
            className="mt-4"
          >
            <Text className="text-text-muted text-base">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const roomMessages = messages[roomId] || [];
  const roomMembers = members[roomId] || [];

  const onSend = (text: string) => {
    sendMessage(roomId, text);
    setReplyingTo(null);

    // Clear any existing scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // FIXED: For inverted FlashList, scroll to index 0 (newest message at bottom)
    scrollTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && listRef.current && roomMessages.length > 0) {
        listRef.current.scrollToIndex({ index: 0, animated: true });
      }
      scrollTimeoutRef.current = null;
    }, 100);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleReact = (messageId: string, reaction: string) => {
    useChatStore.getState().reactToMessage(roomId, messageId, reaction);
  };

  const handleLongPress = (message: ChatMessage) => {
    setSelectedMessage(message);
    setIsActionsModalVisible(true);
  };

  const handleShowReactionPicker = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (selectedMessageId) {
      handleReact(selectedMessageId, emoji);
    }
    setShowEmojiPicker(false);
    setSelectedMessageId(null);
  };

  const handleSendVoice = async (audioUri: string, duration: number) => {
    useChatStore.getState().sendVoiceMessage(roomId, audioUri, duration);
  };

  const handleSendMedia = async (media: any) => {
    useChatStore.getState().sendMediaMessage(roomId, media.uri, media.type);
  };

  const handleLoadOlderMessages = async () => {
    if (isLoadingOlderMessages) return;

    setIsLoadingOlderMessages(true);
    try {
      await loadOlderMessages(roomId);
    } catch (error) {
      console.warn("Failed to load older messages:", error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1">
        {/* Simple iMessage-style header */}
        <View
          className="px-4 py-2 border-b"
          style={{
            backgroundColor: colors.surface[800],
            borderColor: colors.border.default,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"))}
              className="mr-3"
            >
              <Ionicons name="chevron-back" size={24} color={colors.brand.red} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-center" style={{ color: colors.text.primary }}>
                {currentChatRoom?.name || "Anonymous Chat"}
              </Text>
            </View>
            <View className="w-6" />
          </View>
        </View>

        {/* Smart Chat Features */}
        <SmartChatFeatures
          roomId={roomId}
          members={members[roomId] || []}
          onlineUsers={members[roomId]?.filter((member: any) => member.isOnline) || []}
          typingUsers={typingUsers || []}
          connectionStatus="connected"
          onToggleNotifications={() => {
            useChatStore.getState().toggleNotifications(roomId);
            setIsSubscribed(!isSubscribed);
          }}
          isNotificationsEnabled={isSubscribed}
        />

        <FlashList<ChatMessage>
          ref={listRef}
          data={roomMessages}
          estimatedItemSize={60 as unknown as never}
          keyExtractor={(item: any) => item.id}
          inverted
          renderItem={({ item, index }) => {
            if (!item || !item.id || !user) {
              return null;
            }
            return (
              <EnhancedMessageBubble
                message={item}
                isOwn={item.senderId === user.id}
                previousMessage={roomMessages[index - 1]}
                nextMessage={roomMessages[index + 1]}
                reactions={item.reactions}
                onReply={handleReply}
                onReact={handleReact}
                onLongPress={handleLongPress}
                onShowReactionPicker={handleShowReactionPicker}
              />
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4, // Further reduced top padding for compact header
            paddingBottom: 16,
            backgroundColor: colors.background,
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

        {/* Typing indicator - Enhanced service provides active typing users */}
        {typingUsers.length > 0 && (
          <View className="px-4 py-1">
            <View className="flex-row items-center">
              <View className="flex-row space-x-1 mr-2">
                <View className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
                <View className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
                <View className="w-1 h-1 bg-text-muted rounded-full animate-pulse" />
              </View>
              <Text className="text-text-muted text-xs">
                {typingUsers
                  .slice(0, 2)
                  .map((t: any) => t.userName)
                  .join(", ")}
                {typingUsers.length > 2 ? " and others" : ""} typing...
              </Text>
            </View>
          </View>
        )}

        <EnhancedMessageInput
          onSend={onSend}
          onSendVoice={handleSendVoice}
          onSendMedia={handleSendMedia}
          onTyping={(isTyping: boolean) => setTyping(roomId, isTyping)}
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
          placeholder="Message..."
          maxLength={1000}
        />
      </View>

      <KeyboardToolbar
        content={
          <View
            className="flex-row items-center justify-around px-4 py-2"
            style={{ backgroundColor: colors.surface[700] }}
          >
            <Pressable className="flex-1 items-center py-2">
              <Ionicons name="camera" size={24} color={colors.text.muted} />
              <Text className="text-xs mt-1" style={{ color: colors.text.muted }}>
                Camera
              </Text>
            </Pressable>
            <Pressable className="flex-1 items-center py-2">
              <Ionicons name="images" size={24} color={colors.text.muted} />
              <Text className="text-xs mt-1" style={{ color: colors.text.muted }}>
                Gallery
              </Text>
            </Pressable>
            <Pressable className="flex-1 items-center py-2">
              <Ionicons name="happy" size={24} color={colors.text.muted} />
              <Text className="text-xs mt-1" style={{ color: colors.text.muted }}>
                Emoji
              </Text>
            </Pressable>
            <Pressable className="flex-1 items-center py-2">
              <Ionicons name="mic" size={24} color={colors.text.muted} />
              <Text className="text-xs mt-1" style={{ color: colors.text.muted }}>
                Voice
              </Text>
            </Pressable>
          </View>
        }
      />

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

          <FlashList<any>
            data={roomMembers}
            estimatedItemSize={50 as unknown as never}
            keyExtractor={(item: any) => item.id}
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
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Ionicons name="people-outline" size={48} color="#6B7280" />
                <Text className="text-text-secondary text-lg font-medium mt-4">No members found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Emoji Picker Modal */}
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
      <MessageActionsModal
        visible={isActionsModalVisible}
        onClose={() => setIsActionsModalVisible(false)}
        onReply={() => {
          if (selectedMessage) {
            handleReply(selectedMessage);
          }
          setIsActionsModalVisible(false);
        }}
        onCopy={() => {
          // TODO: Implement copy
          setIsActionsModalVisible(false);
        }}
        onDelete={() => {
          // TODO: Implement delete
          setIsActionsModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
