import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import * as Clipboard from "expo-clipboard";
import useChatStore from "../state/chatStore";
import { useAuthState } from "../utils/authUtils";
import type { ChatRoomRouteProp, RootStackNavigationProp } from "../navigation/AppNavigator";
import EnhancedMessageBubble from "../components/EnhancedMessageBubble";
import EnhancedMessageInput from "../components/EnhancedMessageInput";
import SmartChatFeatures from "../components/SmartChatFeatures";
import EmojiPicker from "../components/EmojiPicker";
import MessageActionsModal from "../components/MessageActionsModal";
import { ChatMessage } from "../types";
import { useTheme } from "../providers/ThemeProvider";
import { notificationService } from "../services/notificationService";
import OfflineBanner from "../components/OfflineBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import { useScrollManager } from "../utils/scrollUtils";

// ChatRoomRouteProp is now exported from AppNavigator for consistency

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

  // Validate roomId parameter
  if (!roomId) {
    console.error("ChatRoomScreen: Missing roomId parameter");
    navigation.goBack();
    return null;
  }

  const [showMemberList, setShowMemberList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const mountedRef = useRef(true);

  const {
    messages,
    members,
    joinChatRoom,
    leaveChatRoom,
    sendMessage,
    setTyping,
    typingUsers,
    loadOlderMessages,
    isLoading,
    error,
    connectionStatus,
  } = useChatStore();

  const listRef = useRef<any>(null);
  const FlashListAny: any = FlashList;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isActionsModalVisible, setIsActionsModalVisible] = useState(false);
  const hasAutoScrolledRef = useRef(false);

  // Create ScrollManager instance
  const scrollManager = useScrollManager();

  // Set ref for ScrollManager
  useEffect(() => {
    scrollManager.setRef(listRef.current);
  }, [listRef.current]);

  useEffect(() => {
    if (canAccessChat && !needsSignIn && user) {
      joinChatRoom(roomId);
    }
    return () => {
      mountedRef.current = false;
      // ScrollManager handles cleanup automatically
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

  // Store now guarantees ascending (oldest -> newest)
  const roomMessages = messages[roomId] || [];
  const roomMembers = members[roomId] || [];

  // Ensure we start at the bottom (newest message visible) once on initial load
  useEffect(() => {
    if (!hasAutoScrolledRef.current && roomMessages.length > 0 && listRef.current) {
      scrollManager.scrollToIndex(Math.max(0, roomMessages.length - 1), { animated: false });
      hasAutoScrolledRef.current = true;
    }
  }, [roomMessages.length]);

  const onSend = (text: string) => {
    sendMessage(roomId, text, replyingTo?.id);
    setReplyingTo(null);

    // Use ScrollManager's safe scroll with built-in delay
    scrollManager.safeScrollToEnd();
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
  // Guard against guest access or missing user data (after all hooks declared)
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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1">
        {/* Navigation header already shows "Chat". Remove in-screen title. */}

        {/* Smart Chat Features */}
        <SmartChatFeatures
          roomId={roomId}
          members={members[roomId] || []}
          onlineUsers={members[roomId]?.filter((member: any) => member.isOnline) || []}
          typingUsers={typingUsers || []}
          connectionStatus={connectionStatus === "error" ? "disconnected" : connectionStatus}
          onToggleNotifications={() => {
            useChatStore.getState().toggleNotifications(roomId);
            setIsSubscribed(!isSubscribed);
          }}
          isNotificationsEnabled={isSubscribed}
        />

        <FlashListAny
          ref={listRef}
          // Normal list with oldest->newest; anchor at bottom
          data={roomMessages}
          keyExtractor={(item: ChatMessage) => item.id}
          renderItem={({ item, index }: { item: ChatMessage; index: number }) => {
            if (!item || !item.id || !user) {
              return null;
            }
            return (
              <EnhancedMessageBubble
                message={item}
                isOwn={item.senderId === user.id}
                // With oldest-first data, chronological previous = index - 1
                previousMessage={index > 0 ? roomMessages[index - 1] : undefined}
                nextMessage={index < roomMessages.length - 1 ? roomMessages[index + 1] : undefined}
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
            paddingTop: 8,
            paddingBottom: 16,
            backgroundColor: colors.background,
          }}
          estimatedItemSize={72}
          showsVerticalScrollIndicator={false}
          // Keep bottom anchored when new messages arrive
          maintainVisibleContentPosition={{ minIndexForVisible: 1, autoscrollToTopThreshold: 20 }}
          // Show "Load older" at the top for normal list
          ListHeaderComponent={
            roomMessages.length > 0 ? (
              <View className="items-center py-1">
                <Pressable
                  onPress={handleLoadOlderMessages}
                  disabled={isLoadingOlderMessages}
                  className={`bg-surface-700 rounded-full px-2.5 py-1 ${isLoadingOlderMessages ? "opacity-50" : ""}`}
                  accessibilityRole="button"
                  accessibilityLabel={isLoadingOlderMessages ? "Loading older messages" : "Load older messages"}
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

      {/* Global overlays: offline + loading + error */}
      <OfflineBanner onRetry={() => useChatStore.getState().loadMessages?.(roomId)} />

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <LoadingSpinner size="large" color={colors.brand.red} text="Loading messages" />
        </View>
      )}

      {!!error && (
        <View className="absolute bottom-24 left-4 right-4 bg-surface-800 border border-surface-700 rounded-xl p-3">
          <Text className="text-text-primary text-sm font-medium">Unable to complete action</Text>
          <Text className="text-text-secondary text-xs mt-1">{error}</Text>
          <View className="flex-row justify-end mt-2">
            <Pressable
              onPress={() => useChatStore.getState().clearError?.()}
              className="px-3 py-1 rounded-lg bg-surface-700 mr-2"
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <Text className="text-text-primary text-xs">Dismiss</Text>
            </Pressable>
            <Pressable
              onPress={() => useChatStore.getState().loadMessages?.(roomId)}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: colors.brand.red }}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text className="text-black text-xs font-semibold">Retry</Text>
            </Pressable>
          </View>
        </View>
      )}

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
          try {
            if (selectedMessage?.content) {
              Clipboard.setStringAsync(selectedMessage.content);
            }
          } catch (e) {
            console.warn("Failed to copy message:", e);
          } finally {
            setIsActionsModalVisible(false);
          }
        }}
        onDelete={async () => {
          try {
            if (selectedMessage?.id) {
              await useChatStore.getState().deleteMessage?.(roomId, selectedMessage.id);
            }
          } catch (e) {
            console.warn("Failed to delete message:", e);
          } finally {
            setIsActionsModalVisible(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
