import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Image } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "../types";
import { useTheme } from "../providers/ThemeProvider";
import { formatTime } from "../utils/dateUtils";
import SwipeToReply from "./SwipeToReply";
import MessageReactions from "./MessageReactions";
import VoiceMessage from "./VoiceMessage";
import useAuthStore from "../state/authStore";

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  previousMessage?: ChatMessage;
  nextMessage?: ChatMessage;
  reactions?: Reaction[];
  onReply?: (message: ChatMessage) => void;
  onReact?: (messageId: string, reaction: string) => void;
  onLongPress?: (message: ChatMessage) => void;
  onShowReactionPicker?: (messageId: string) => void;
  // Optional pre-calculated grouping metadata for performance optimization
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  groupId?: string;
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const EnhancedMessageBubble = React.forwardRef<View, Props>(
  (
    {
      message,
      isOwn,
      previousMessage,
      nextMessage,
      reactions = [],
      onReply,
      onReact,
      onLongPress,
      onShowReactionPicker,
      // Optional pre-calculated grouping metadata
      isFirstInGroup: preCalculatedIsFirst,
      isLastInGroup: preCalculatedIsLast,
      groupId,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const [showReactions, setShowReactions] = useState(false);
    const [showTimestamp, setShowTimestamp] = useState(false);

    // Animation values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);
    const reactionScale = useSharedValue(0);

    // Optimized grouping logic: use pre-calculated values when available, fallback to calculation
    const isFirstInGroup = preCalculatedIsFirst !== undefined
      ? preCalculatedIsFirst
      : (() => {
          // Fallback calculation for backward compatibility
          const prevTime = previousMessage ? new Date(previousMessage.timestamp).getTime() : 0;
          const thisTime = new Date(message.timestamp).getTime();
          const looseThreshold = 5 * 60 * 1000; // 5 minutes
          const sameSenderAsPrev = !!previousMessage && previousMessage.senderId === message.senderId;
          const closeToPrev = sameSenderAsPrev && thisTime - prevTime <= looseThreshold;
          return !sameSenderAsPrev || !closeToPrev;
        })();

    const isLastInGroup = preCalculatedIsLast !== undefined
      ? preCalculatedIsLast
      : (() => {
          // Fallback calculation for backward compatibility
          const nextTime = nextMessage ? new Date(nextMessage.timestamp).getTime() : 0;
          const thisTime = new Date(message.timestamp).getTime();
          const looseThreshold = 5 * 60 * 1000; // 5 minutes
          const sameSenderAsNext = !!nextMessage && nextMessage.senderId === message.senderId;
          const closeToNext = sameSenderAsNext && nextTime - thisTime <= looseThreshold;
          return !sameSenderAsNext || !closeToNext;
        })();

    // Calculate if we should show sender name (for non-own messages)
    const sameSenderAsPrev = !!previousMessage && previousMessage.senderId === message.senderId;
    const showSenderName = !isOwn && (isFirstInGroup || (!sameSenderAsPrev && !!previousMessage));

    // Entry animation
    useEffect(() => {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }, [opacity, translateY]);

    // Bubble styling with improved grouping and tails
    const getBubbleStyle = () => {
      const baseRadius = 20;
      const connectorRadius = 6;

      if (isOwn) {
        if (isFirstInGroup && isLastInGroup) {
          return { borderRadius: baseRadius };
        } else if (isFirstInGroup) {
          return {
            borderTopLeftRadius: baseRadius,
            borderTopRightRadius: baseRadius,
            borderBottomLeftRadius: baseRadius,
            borderBottomRightRadius: connectorRadius,
          };
        } else if (isLastInGroup) {
          return {
            borderTopLeftRadius: baseRadius,
            borderTopRightRadius: connectorRadius,
            borderBottomLeftRadius: baseRadius,
            borderBottomRightRadius: baseRadius,
          };
        } else {
          return {
            borderTopLeftRadius: baseRadius,
            borderTopRightRadius: connectorRadius,
            borderBottomLeftRadius: baseRadius,
            borderBottomRightRadius: connectorRadius,
          };
        }
      } else {
        if (isFirstInGroup && isLastInGroup) {
          return { borderRadius: baseRadius };
        } else if (isFirstInGroup) {
          return {
            borderTopLeftRadius: baseRadius,
            borderTopRightRadius: baseRadius,
            borderBottomLeftRadius: connectorRadius,
            borderBottomRightRadius: baseRadius,
          };
        } else if (isLastInGroup) {
          return {
            borderTopLeftRadius: connectorRadius,
            borderTopRightRadius: baseRadius,
            borderBottomLeftRadius: baseRadius,
            borderBottomRightRadius: baseRadius,
          };
        } else {
          return {
            borderTopLeftRadius: connectorRadius,
            borderTopRightRadius: baseRadius,
            borderBottomLeftRadius: connectorRadius,
            borderBottomRightRadius: baseRadius,
          };
        }
      }
    };

    const handlePress = () => {
      setShowTimestamp(!showTimestamp);
    };

    const handleLongPress = () => {
      scale.value = withSpring(0.95, { damping: 15 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15 });
      }, 100);

      setShowReactions(true);
      reactionScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      onLongPress?.(message);
    };

    const handleReaction = (emoji: string) => {
      onReact?.(message.id, emoji);
      setShowReactions(false);
      reactionScale.value = withTiming(0, { duration: 200 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
      opacity: opacity.value,
    }));

    const reactionAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: reactionScale.value }],
      opacity: reactionScale.value,
    }));

    const handleReply = () => {
      onReply?.(message);
    };

    const formatFileSize = (bytes: number) => {
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
    };

    const renderMessageContent = () => {
      switch (message.messageType) {
        case "voice":
          return (
            <VoiceMessage
              audioUri={message.audioUri}
              duration={message.audioDuration}
              isPlaying={false}
              onPlay={() => {}}
              onPause={() => {}}
            />
          );

        case "image":
          return (
            <View>
              <Image
                source={{ uri: message.imageUri }}
                style={{
                  width: 200,
                  height: 150,
                  borderRadius: 12,
                  marginBottom: 4,
                }}
                resizeMode="cover"
              />
              {message.content && (
                <Text
                  className="text-base leading-5"
                  style={{
                    color: isOwn ? "#FFFFFF" : colors.text.primary,
                  }}
                >
                  {message.content}
                </Text>
              )}
            </View>
          );

        case "document":
          return (
            <View className="flex-row items-center p-2">
              <Ionicons name="document" size={24} color={isOwn ? "#FFFFFF" : colors.text.primary} />
              <View className="ml-2 flex-1">
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isOwn ? "#FFFFFF" : colors.text.primary,
                  }}
                >
                  {message.fileName || "Document"}
                </Text>
                {message.fileSize && (
                  <Text
                    className="text-xs"
                    style={{
                      color: isOwn ? "rgba(255,255,255,0.7)" : colors.text.muted,
                    }}
                  >
                    {formatFileSize(message.fileSize)}
                  </Text>
                )}
              </View>
            </View>
          );

        default:
          return (
            <Text
              className="text-base leading-5"
              style={{
                color: isOwn ? "#FFFFFF" : colors.text.primary,
              }}
            >
              {message.content}
            </Text>
          );
      }
    };

    return (
      <SwipeToReply onReply={handleReply} isOwnMessage={isOwn}>
        <View className={`mb-1 ${isOwn ? "items-end" : "items-start"}`}>
          {/* Sender name */}
          {showSenderName && (
            <Text className="text-xs mb-1 mx-3 font-medium" style={{ color: colors.text.secondary }}>
              {message.senderName}
            </Text>
          )}
          {/* Avatar for first in group (group chats) */}
          {!isOwn && isFirstInGroup && message.senderAvatar && (
            <Image
              source={{ uri: message.senderAvatar }}
              style={{ width: 26, height: 26, borderRadius: 13, marginLeft: 6, marginBottom: 4 }}
            />
          )}

          <Animated.View style={animatedStyle}>
            <Pressable
              onPress={handlePress}
              onLongPress={handleLongPress}
              delayLongPress={500}
              className="max-w-[75%] px-4 py-3 relative"
              style={[
                getBubbleStyle(),
                {
                  backgroundColor: isOwn ? colors.brand.red : colors.surface[700],
                  marginBottom: isLastInGroup ? 10 : 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                },
              ]}
            >
              {/* Message content */}
              {renderMessageContent()}

              {/* Message status indicators */}
              {isOwn && (
                <View className="flex-row items-center justify-end mt-1">
                  <Text className="text-xs mr-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {formatTime(message.timestamp)}
                  </Text>
                  {(() => {
                    const status = message.status || (message.isRead ? "read" : undefined);
                    const icon =
                      status === "read"
                        ? "checkmark-done"
                        : status === "delivered" || status === "sent"
                          ? "checkmark"
                          : status === "pending"
                            ? "time"
                            : status === "failed"
                              ? "alert"
                              : message.isRead
                                ? "checkmark-done"
                                : "checkmark";
                    const color = status === "failed" ? colors.status.error : "rgba(255,255,255,0.7)";
                    return <Ionicons name={icon as any} size={12} color={color} />;
                  })()}
                </View>
              )}
            </Pressable>

            {/* Timestamp (shown on tap) */}
            {showTimestamp && !isOwn && (
              <Text className="text-xs mt-1 mx-3" style={{ color: colors.text.muted }}>
                {formatTime(message.timestamp)}
              </Text>
            )}

            {/* Existing reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <MessageReactions
                messageId={message.id}
                reactions={(message.reactions || []).map((r) => ({
                  ...r,
                  hasReacted: user ? r.users.includes(user.id) : false,
                }))}
                onReact={onReact || (() => {})}
                onShowReactionPicker={onShowReactionPicker || (() => {})}
              />
            )}
          </Animated.View>

          {/* Reaction picker */}
          {showReactions && (
            <Animated.View
              style={[
                reactionAnimatedStyle,
                {
                  position: "absolute",
                  top: -50,
                  [isOwn ? "right" : "left"]: 0,
                  backgroundColor: colors.surface[800],
                  borderRadius: 25,
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  flexDirection: "row",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  zIndex: 1000,
                },
              ]}
            >
              {REACTIONS.map((emoji, index) => (
                <Pressable key={emoji} onPress={() => handleReaction(emoji)} className="p-2">
                  <Text className="text-lg">{emoji}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  setShowReactions(false);
                  reactionScale.value = withTiming(0, { duration: 200 });
                }}
                className="p-2"
              >
                <Ionicons name="close" size={16} color={colors.text.muted} />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SwipeToReply>
    );
  },
);

EnhancedMessageBubble.displayName = "EnhancedMessageBubble";

export default EnhancedMessageBubble;
