import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { MessageEditModal } from "../components/MessageEditModal";
import { ForwardMessageModal } from "../components/ForwardMessageModal";
import { canEditMessage } from "../utils/messageUtils";
import { ChatMessage } from "../types";
import { useTheme } from "../providers/ThemeProvider";
import { notificationService } from "../services/notificationService";
import OfflineBanner from "../components/OfflineBanner";
import ReliableOfflineBanner from "../components/ReliableOfflineBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import NetworkDebugOverlay from "../components/NetworkDebugOverlay";
import { useScrollManager } from "../utils/scrollUtils";
import { getCachedOptimizedMessageList, MessageWithGrouping, getMessageHeightEstimate } from "../utils/chatUtils";
import { calculateDisplayDimensions } from "../utils/mediaUtils";
import { performanceMonitor } from "../utils/performance";
import { monitorScrollPerformance } from "../utils/performanceUtils";
import { usePerformanceOptimization } from "../hooks/usePerformanceOptimization";
import PerformanceDashboard from "../components/PerformanceDashboard";
import MediaViewer from "../components/MediaViewer";
import { messagePaginationManager } from "../services/messagePaginationService";

// ChatRoomRouteProp is now exported from AppNavigator for consistency

function toDateSafe(value: any): Date {
  try {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate();
    if (typeof value === "number") return new Date(value < 1e12 ? value * 1000 : value);
    if (typeof value === "string") return new Date(value);
    return new Date();
  } catch (error) {
    return new Date();
  }
}

export default function ChatRoomScreen() {
  const { params } = useRoute<ChatRoomRouteProp>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { canAccessChat, needsSignIn, user } = useAuthState();
  const { colors } = useTheme();

  // Extract roomId early and validate
  const { roomId } = params;

  // All hooks must be declared before any early returns
  const [showMemberList, setShowMemberList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isActionsModalVisible, setIsActionsModalVisible] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const mountedRef = useRef(true);
  const listRef = useRef<any>(null);
  const hasAutoScrolledRef = useRef(false);
  const isNearBottomRef = useRef(true); // Track if user is near bottom
  const lastMessageCountRef = useRef(0);
  const lastLoadTimeRef = useRef(0); // Debounce infinite scroll
  const viewableItemsRef = useRef<Set<string>>(new Set());
  const performanceStartRef = useRef(Date.now());

  // Cleanup refs for proper resource management
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  const FlashListAny: any = FlashList;
  const scrollManager = useScrollManager();

  // Component-wide cleanup effect
  useEffect(() => {
    return () => {
      // Ensure all timeouts are cleared
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }

      // Clear notification cleanup
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
        notificationCleanupRef.current = null;
      }

      // Reset refs
      mountedRef.current = false;
      hasAutoScrolledRef.current = false;
      isNearBottomRef.current = true;
      lastMessageCountRef.current = 0;
      lastLoadTimeRef.current = 0;

      // Clear viewable items tracking
      viewableItemsRef.current.clear();
    };
  }, []); // Empty dependency array - runs only on unmount

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

  // Handle invalid roomId case
  useEffect(() => {
    if (!roomId) {
      console.error("ChatRoomScreen: Missing roomId parameter");
      navigation.goBack();
    }
  }, [roomId, navigation]);

  // Set ref for ScrollManager - update whenever listRef changes
  useEffect(() => {
    scrollManager.setRef(listRef);
  }, [scrollManager]);

  useEffect(() => {
    performanceMonitor.recordMetric("chatroom:enter", {
      roomId,
      canAccessChat,
      needsSignIn,
      hasUser: !!user,
      userId: user?.id?.slice(-8),
      connectionStatus,
    });

    if (roomId && canAccessChat && !needsSignIn && user) {
      // Reset pagination state when entering a new room
      setHasMoreMessages(true);
      joinChatRoom(roomId);
    }
    return () => {
      // Leave chat room
      if (roomId && canAccessChat && !needsSignIn && user) {
        leaveChatRoom(roomId);
      }
    };
  }, [roomId, canAccessChat, needsSignIn, user, joinChatRoom, leaveChatRoom]);

  useEffect(() => {
    if (roomId && canAccessChat && !needsSignIn && user) {
      // Check notification subscription status
      const checkSubscription = async () => {
        try {
          const result = await notificationService.getChatRoomSubscription(roomId);
          if (mountedRef.current) {
            setIsSubscribed(result);
          }
        } catch (error) {
          if (mountedRef.current) {
            setIsSubscribed(false);
          }
        }
      };

      checkSubscription();
    }

    // Store cleanup function if needed (for future notification listeners)
    return () => {
      // Currently no active subscription to clean up, but placeholder for future
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
        notificationCleanupRef.current = null;
      }
    };
  }, [roomId, canAccessChat, needsSignIn, user]);

  // Store now guarantees ascending (oldest -> newest) - memoized for performance
  const roomMessages = useMemo(() => (roomId ? messages[roomId] || [] : []), [roomId, messages]);
  const roomMembers = useMemo(() => (roomId ? members[roomId] || [] : []), [roomId, members]);

  // Optimized message grouping with caching to prevent re-renders
  const optimizedMessages = useMemo(() => {
    if (!roomId || roomMessages.length === 0) return [];

    // Create a hash for cache invalidation based on message content
    const messagesHash = `${roomMessages.length}_${roomMessages[0]?.id || ""}_${roomMessages[roomMessages.length - 1]?.id || ""}`;

    return getCachedOptimizedMessageList(roomId, roomMessages, messagesHash);
  }, [roomId, roomMessages]);

  // Use performance optimization hook (must be after optimizedMessages)
  usePerformanceOptimization({
    componentName: `ChatRoomScreen_${roomId}`,
    enableMonitoring: true,
    enableMemoryTracking: true,
    enableAutoOptimization: true,
    thresholds: {
      renderTime: 16,
      memoryUsage: 0.8,
      fps: 30,
    },
  });

  // Track performance for large message lists and enable optimized mode
  useEffect(() => {
    if (optimizedMessages.length > 100) {
      performanceMonitor.recordMetric("largeMessageList", {
        messageCount: optimizedMessages.length,
        renderTime: Date.now() - performanceStartRef.current,
      });
      // Enable optimized mode when messages exceed 100
      useChatStore.getState().enableOptimizedMode(roomId);
    }
  }, [optimizedMessages.length, roomId]);

  // Smart auto-scroll: only scroll to bottom when user is near bottom
  useEffect(() => {
    if (roomId && optimizedMessages.length > 0 && listRef.current) {
      const currentMessageCount = optimizedMessages.length;
      const previousMessageCount = lastMessageCountRef.current;

      if (!hasAutoScrolledRef.current) {
        // Initial load - always scroll to bottom
        // Clear any existing timeout
        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
        }
        autoScrollTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && listRef.current) {
            try {
              // Try scrolling to the last message index
              const lastIndex = optimizedMessages.length - 1;
              if (lastIndex >= 0) {
                listRef.current.scrollToIndex({ index: lastIndex, animated: false });
              } else {
                listRef.current.scrollToEnd({ animated: false });
              }
            } catch (error) {
              scrollManager.scrollToEnd({ animated: false });
            }
            hasAutoScrolledRef.current = true;
            isNearBottomRef.current = true;
          }
          autoScrollTimeoutRef.current = null;
        }, 200);
      } else if (currentMessageCount > previousMessageCount) {
        // New messages arrived - only scroll if user is near bottom
        if (isNearBottomRef.current) {
          // Clear any existing timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          scrollTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && listRef.current) {
              try {
                // Try scrolling to the last message index
                const lastIndex = optimizedMessages.length - 1;
                if (lastIndex >= 0) {
                  listRef.current.scrollToIndex({ index: lastIndex, animated: true });
                } else {
                  listRef.current.scrollToEnd({ animated: true });
                }
              } catch (error) {
                scrollManager.scrollToEnd({ animated: true });
              }
            }
            scrollTimeoutRef.current = null;
          }, 50);
        }
      }

      lastMessageCountRef.current = currentMessageCount;
    }

    // Cleanup function for this useEffect
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }
    };
  }, [roomId, optimizedMessages.length, scrollManager]);

  const onSend = (text: string) => {
    sendMessage(roomId, text, replyingTo?.id);
    setReplyingTo(null);

    // Use ScrollManager's safe scroll with built-in delay
    scrollManager.safeScrollToEnd();
  };

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
  }, []);

  const handleScrollToMessage = useCallback(
    (messageId: string, messageRoomId: string) => {
      if (messageRoomId !== roomId) {
        // Navigate to the correct room first
        navigation.navigate("ChatRoom", { roomId: messageRoomId });
        return;
      }

      // Find the message index
      const messages = useChatStore.getState().messages[roomId] || [];
      const index = messages.findIndex((m) => m.id === messageId);

      if (index !== -1 && listRef.current) {
        listRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5, // Center the message
        });

        // Highlight the message briefly
        setTimeout(() => {
          // This would trigger a visual highlight effect
          // You might want to add a highlighted state to the message
        }, 500);
      }
    },
    [roomId, navigation],
  );

  const handleReact = useCallback(
    (messageId: string, reaction: string) => {
      useChatStore.getState().reactToMessage(roomId, messageId, reaction);
    },
    [roomId],
  );

  const handleLongPress = useCallback((message: ChatMessage) => {
    setSelectedMessage(message);
    setIsActionsModalVisible(true);
  }, []);

  const handleShowReactionPicker = useCallback((messageId: string) => {
    setSelectedMessageId(messageId);
    setShowEmojiPicker(true);
  }, []);

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

  const handleMediaPress = useCallback(
    (message: ChatMessage) => {
      // Collect all media in the current room for gallery view
      const allMedia = optimizedMessages
        .filter((item) => item.message.messageType === "image" || item.message.messageType === "video")
        .map((item, idx) => ({
          uri: item.message.mediaUrl || item.message.content,
          type: item.message.messageType,
          id: item.message.id,
          ...item.message.media,
        }));

      const currentIndex = allMedia.findIndex((m) => m.id === message.id);
      setSelectedMedia(allMedia);
      setSelectedMediaIndex(currentIndex >= 0 ? currentIndex : 0);
      setShowMediaViewer(true);
    },
    [optimizedMessages],
  );

  const handleLoadOlderMessages = async () => {
    if (isLoadingOlderMessages || !hasMoreMessages) return;

    setIsLoadingOlderMessages(true);
    try {
      const result = await loadOlderMessages(roomId);

      // Update hasMoreMessages based on the result
      if (!result.hasMore) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  // Track scroll position with throttling and preload pagination
  const handleScroll = useMemo(
    () =>
      monitorScrollPerformance((event: any) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        const distanceFromTop = contentOffset.y;

        // Consider "near bottom" if within 100 pixels of the bottom
        const nearBottomThreshold = 100;
        const isNearBottom = distanceFromBottom <= nearBottomThreshold;

        // Only update state if the value actually changes
        if (isNearBottomRef.current !== isNearBottom) {
          isNearBottomRef.current = isNearBottom;
          setShowScrollToBottom(!isNearBottom && optimizedMessages.length > 0);
        }

        // Preload next batch when near top (within 200 pixels)
        if (distanceFromTop < 200 && hasMoreMessages && !isLoadingOlderMessages) {
          messagePaginationManager.preloadNextBatch(roomId).catch(console.warn);
        }
      }),
    [optimizedMessages.length, hasMoreMessages, isLoadingOlderMessages, roomId],
  );

  // Handle scroll to bottom button press
  const handleScrollToBottomPress = () => {
    scrollManager.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
    isNearBottomRef.current = true;
  };

  // Optimized item layout override for FlashList
  const overrideItemLayout = useCallback((layout: any, item: MessageWithGrouping) => {
    const message = item.message;
    // Use the consistent height estimation utility
    const estimatedHeight = getMessageHeightEstimate(message);
    // Only set the size, not the offset (FlashList handles that)
    layout.size = estimatedHeight;
  }, []);

  // Optimized render function using pre-calculated grouping metadata
  const renderMessage = useCallback(
    ({ item, index }: { item: MessageWithGrouping; index: number }) => {
      if (!item?.message || !item.message.id || !user) {
        return null;
      }

      const message = item.message;
      const previousMessage = index > 0 ? optimizedMessages[index - 1]?.message : undefined;
      const nextMessage = index < optimizedMessages.length - 1 ? optimizedMessages[index + 1]?.message : undefined;

      return (
        <EnhancedMessageBubble
          message={message}
          isOwn={message.senderId === user.id}
          previousMessage={previousMessage}
          nextMessage={nextMessage}
          reactions={message.reactions}
          onReply={handleReply}
          onReact={handleReact}
          onLongPress={handleLongPress}
          onShowReactionPicker={handleShowReactionPicker}
          onMediaPress={handleMediaPress}
          // Pass pre-calculated grouping metadata to avoid recalculation
          isFirstInGroup={item.isFirstInGroup}
          isLastInGroup={item.isLastInGroup}
          groupId={item.groupId}
          isVisible={viewableItemsRef.current.has(message.id)}
        />
      );
    },
    [user, optimizedMessages, handleReply, handleReact, handleLongPress, handleShowReactionPicker, handleMediaPress],
  );

  // Memoized content container style for better performance
  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: colors.background,
    }),
    [colors.background],
  );
  // Guard against missing roomId, guest access or missing user data (after all hooks declared)
  if (!roomId || !canAccessChat || needsSignIn || !user) {
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
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 bg-black">
        {/* Navigation header already shows "Chat". Remove in-screen title. */}

        {/* Smart Chat Features */}
        <SmartChatFeatures
          typingUsers={typingUsers || []}
          connectionStatus={connectionStatus}
          errorMessage={error || undefined}
          onToggleNotifications={() => {
            useChatStore.getState().toggleNotifications(roomId);
            setIsSubscribed(!isSubscribed);
          }}
          isNotificationsEnabled={isSubscribed}
          roomId={roomId}
          onMessageSelect={handleScrollToMessage}
        />

        <FlashListAny
          accessible={true}
          accessibilityRole="list"
          accessibilityLabel="Chat conversation messages"
          accessibilityLiveRegion="polite"
          ref={listRef}
          // Optimized list with pre-calculated grouping metadata
          data={optimizedMessages}
          keyExtractor={(item: MessageWithGrouping) => item.message.id}
          renderItem={renderMessage}
          contentContainerStyle={contentContainerStyle}
          estimatedItemSize={80} // Better estimate for chat messages with padding
          showsVerticalScrollIndicator={false}
          // Performance optimizations for large message lists
          removeClippedSubviews={true}
          maxToRenderPerBatch={optimizedMessages.length > 100 ? 15 : 10}
          updateCellsBatchingPeriod={optimizedMessages.length > 100 ? 30 : 50}
          windowSize={optimizedMessages.length > 100 ? 15 : 21}
          initialNumToRender={20}
          // Advanced optimization props
          getItemType={(item: MessageWithGrouping) => {
            const message = item.message;
            // Use messageType instead of type for consistency
            if (message.messageType === "image" || message.messageType === "video") return "media";
            if (message.messageType === "voice") return "voice";
            if (message.messageType === "document") return "document";
            return "text";
          }}
          // Use overrideItemLayout instead of getItemLayout for FlashList
          overrideItemLayout={optimizedMessages.length > 100 ? overrideItemLayout : undefined}
          keyboardDismissMode="on-drag"
          // Only disable auto layout when we provide an override
          disableAutoLayout={optimizedMessages.length > 100 && !!overrideItemLayout}
          // Track viewable items for performance monitoring
          onViewableItemsChanged={({ viewableItems }: any) => {
            const newViewableIds = new Set(
              viewableItems.map((item: any) => item.item.message.id).filter((id: any) => typeof id === "string"),
            ) as Set<string>;
            viewableItemsRef.current = newViewableIds;

            if (optimizedMessages.length > 100) {
              performanceMonitor.recordMetric("visibleMessages", {
                count: viewableItems.length,
                totalMessages: optimizedMessages.length,
              });
            }
          }}
          viewabilityConfig={{
            viewAreaCoveragePercentThreshold: 50,
            minimumViewTime: 200,
          }}
          // Track scroll position for smart auto-scroll
          onScroll={handleScroll}
          scrollEventThrottle={16} // 60fps scroll events
          // Maintain scroll position when loading older messages - disabled for debugging
          // maintainVisibleContentPosition={{
          //   minIndexForVisible: 1, // Keep at least 1 message visible
          //   autoscrollToTopThreshold: 50, // Smaller threshold for better control
          // }}
          // Infinite scroll: Load older messages when scrolling to top
          onStartReached={() => {
            const now = Date.now();
            const timeSinceLastLoad = now - lastLoadTimeRef.current;

            if (
              !isLoadingOlderMessages &&
              hasMoreMessages &&
              optimizedMessages.length > 10 &&
              timeSinceLastLoad > 1000
            ) {
              lastLoadTimeRef.current = now;
              handleLoadOlderMessages();
            }
          }}
          onStartReachedThreshold={0.1} // Smaller threshold to prevent premature loading
          // Show "Load older" at the top for normal list
          ListHeaderComponent={
            optimizedMessages.length > 0 && hasMoreMessages ? (
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
            ) : optimizedMessages.length > 0 && !hasMoreMessages ? (
              <View className="items-center py-1">
                <Text className="text-text-muted text-xs font-medium">No more messages</Text>
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

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <View className="absolute bottom-20 right-4 z-10">
            <Pressable
              onPress={handleScrollToBottomPress}
              className="bg-brand-red rounded-full w-12 h-12 items-center justify-center shadow-lg"
              accessibilityRole="button"
              accessibilityLabel="Scroll to bottom"
            >
              <Ionicons name="chevron-down" size={24} color="black" />
            </Pressable>
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

      {/* Global overlays: offline + loading + error + debug */}
      <ReliableOfflineBanner onRetry={() => useChatStore.getState().loadMessages?.(roomId)} useReliableCheck={true} />
      <NetworkDebugOverlay />
      {__DEV__ && <PerformanceDashboard />}

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
        message={selectedMessage || undefined}
        canEdit={selectedMessage && user ? canEditMessage(selectedMessage, user.id) : false}
        canForward={true}
        onReply={() => {
          if (selectedMessage) {
            handleReply(selectedMessage);
          }
          setIsActionsModalVisible(false);
        }}
        onEdit={() => {
          if (selectedMessage) {
            setEditingMessage(selectedMessage);
            setShowEditModal(true);
          }
          setIsActionsModalVisible(false);
        }}
        onForward={() => {
          if (selectedMessage) {
            setForwardingMessage(selectedMessage);
            setShowForwardModal(true);
          }
          setIsActionsModalVisible(false);
        }}
        onCopy={() => {
          try {
            if (selectedMessage?.content) {
              Clipboard.setStringAsync(selectedMessage.content);
            }
          } catch (error) {
          } finally {
            setIsActionsModalVisible(false);
          }
        }}
        onDelete={async () => {
          try {
            if (selectedMessage?.id) {
              await useChatStore.getState().deleteMessage?.(roomId, selectedMessage.id);
            }
          } catch (error) {
          } finally {
            setIsActionsModalVisible(false);
          }
        }}
      />

      <MessageEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMessage(null);
        }}
        message={editingMessage}
        onSave={async (newContent) => {
          if (editingMessage) {
            await useChatStore.getState().editMessage(roomId, editingMessage.id, newContent);
          }
        }}
      />

      <ForwardMessageModal
        visible={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
        message={forwardingMessage}
        onForward={async (targetRoomId, comment) => {
          if (forwardingMessage) {
            await useChatStore.getState().forwardMessage(forwardingMessage, targetRoomId, comment);
          }
        }}
      />

      {/* Media Viewer */}
      <MediaViewer
        visible={showMediaViewer}
        media={selectedMedia}
        initialIndex={selectedMediaIndex}
        onClose={() => {
          setShowMediaViewer(false);
          setSelectedMedia([]);
        }}
      />
    </SafeAreaView>
  );
}
