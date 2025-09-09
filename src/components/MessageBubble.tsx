import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { ChatMessage } from "../types";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  message: ChatMessage;
  onReply?: (message: ChatMessage) => void;
  onReact?: (messageId: string, reaction: string) => void;
  onLongPress?: (message: ChatMessage) => void;
}

const reactions = ["❤️", "👍", "😂", "😮", "😢", "😡"];

// Normalize various timestamp representations to a Date
function toDateSafe(value: any): Date {
  try {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
    if (typeof value === "number") {
      // Treat values < 1e12 as seconds (Firestore), otherwise ms
      return new Date(value < 1e12 ? value * 1000 : value);
    }
    if (typeof value === "string") return new Date(value);
    return new Date();
  } catch {
    return new Date();
  }
}

export default function MessageBubble({ message, onReply, onReact, onLongPress }: Props) {
  const { colors } = useTheme();
  const isOwn = message.isOwn;
  const isSystem =
    message.messageType === "system" || message.messageType === "join" || message.messageType === "leave";
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const reactionScale = useSharedValue(0);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      reactionScale.value = 0;
    };
  }, []);

  const handleLongPress = () => {
    scale.value = withSpring(0.95, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 100 });
    });

    if (onLongPress) {
      onLongPress(message);
    } else {
      // Show default context menu
      Alert.alert("Message Options", "", [
        { text: "Reply", onPress: () => onReply?.(message) },
        { text: "React", onPress: () => toggleReactions() },
        { text: "Copy", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const toggleReactions = () => {
    setShowReactions(!showReactions);
    reactionScale.value = withTiming(showReactions ? 0 : 1, { duration: 200 });
  };

  const handleReaction = (reaction: string) => {
    setSelectedReaction(reaction);
    onReact?.(message.id, reaction);
    toggleReactions();
  };

  const formatTime = (value: any) => {
    const date = toDateSafe(value);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const reactionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reactionScale.value }],
    opacity: reactionScale.value,
  }));

  if (isSystem) {
    return (
      <View className="items-center my-1">
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: colors.surface[800] + '80' }}
        >
          <Text className="text-xs" style={{ color: colors.text.muted }}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`w-full my-0.5 ${isOwn ? "items-end" : "items-start"}`}>
      {/* Reply indicator */}
      {message.replyTo && (
        <View className={`max-w-[70%] mb-0.5 ${isOwn ? "items-end" : "items-start"}`}>
          <View
            className="rounded-lg px-2 py-1 border-l-2"
            style={{
              backgroundColor: colors.surface[600] + '80',
              borderLeftColor: colors.brand.red + '80'
            }}
          >
            <Text className="text-xs" style={{ color: colors.text.muted }}>Replying to message</Text>
          </View>
        </View>
      )}

      {/* Sender name for group chats */}
      {!isOwn && (
        <Text
          className="text-xs mb-0.5 ml-1 font-medium"
          style={{ color: colors.text.secondary }}
        >
          {message.senderName}
        </Text>
      )}

      <Animated.View style={animatedStyle}>
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={800}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Message from ${message.senderName}: ${message.content}`}
          accessibilityHint="Long press for message options"
          className="max-w-[80%] rounded-2xl px-3 py-2 relative"
          style={{
            backgroundColor: isOwn ? colors.brand.red : colors.surface[700]
          }}
        >
          <Text
            className="text-base leading-5"
            style={{
              color: isOwn ? '#FFFFFF' : colors.text.primary
            }}
          >
            {message.content}
          </Text>

          {/* Message status and timestamp */}
          <View className="flex-row items-center justify-between mt-1">
            <Text
              className="text-[10px]"
              style={{
                color: isOwn ? 'rgba(255,255,255,0.7)' : colors.text.muted
              }}
            >
              {formatTime(message.timestamp)}
            </Text>

            {/* Message status indicators for own messages */}
            {isOwn && (
              <View className="flex-row items-center ml-2">
                {message.isRead ? (
                  <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.7)" />
                ) : (
                  <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.5)" />
                )}
              </View>
            )}
          </View>

          {/* Selected reaction */}
          {selectedReaction && (
            <View
              className="absolute -bottom-2 -right-1 rounded-full px-1.5 py-0.5 border"
              style={{
                backgroundColor: colors.surface[800],
                borderColor: colors.surface[600]
              }}
            >
              <Text className="text-xs" style={{ color: colors.text.primary }}>{selectedReaction}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Reaction picker */}
      {showReactions && (
        <Animated.View
          style={[reactionAnimatedStyle]}
          className={`flex-row bg-surface-800 rounded-full px-2 py-1 mt-1 border border-surface-600 ${isOwn ? "mr-4" : "ml-4"}`}
        >
          {reactions.map((reaction) => (
            <Pressable key={reaction} onPress={() => handleReaction(reaction)} className="px-1.5 py-1">
              <Text className="text-lg">{reaction}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
