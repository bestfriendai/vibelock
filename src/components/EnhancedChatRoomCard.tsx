import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ChatRoom } from "../types";
import { useTheme } from "../providers/ThemeProvider";
import { formatTime, formatRelativeTime } from "../utils/dateUtils";

interface Props {
  room: ChatRoom;
  onPress?: (room: ChatRoom) => void;
  onlineCount?: number;
  unreadCount?: number;
  isTyping?: boolean;
  typingUsers?: string[];
}

const { width: screenWidth } = Dimensions.get("window");

const typeConfig = {
  local: {
    icon: "location" as const,
    color: "#10B981", // emerald-500
    bgColor: "rgba(16, 185, 129, 0.1)",
    label: "Local",
  },
  global: {
    icon: "globe" as const,
    color: "#3B82F6", // blue-500
    bgColor: "rgba(59, 130, 246, 0.1)",
    label: "Global",
  },
  topic: {
    icon: "chatbubbles" as const,
    color: "#8B5CF6", // violet-500
    bgColor: "rgba(139, 92, 246, 0.1)",
    label: "Topic",
  },
};

export default function EnhancedChatRoomCard({
  room,
  onPress,
  onlineCount = 0,
  unreadCount = 0,
  isTyping = false,
  typingUsers = [],
}: Props) {
  const { colors, isDarkMode } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const typingDots = useSharedValue(0);

  const config = typeConfig[room.type] || typeConfig.topic;

  // Entry animation
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  // Typing animation
  useEffect(() => {
    if (isTyping) {
      typingDots.value = withTiming(1, { duration: 1000 }, () => {
        typingDots.value = withTiming(0, { duration: 1000 });
      });
    }
  }, [isTyping]);

  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    onPress?.(room);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const typingAnimatedStyle = useAnimatedStyle(() => {
    const dotOpacity = interpolate(typingDots.value, [0, 0.5, 1], [0.3, 1, 0.3]);
    return {
      opacity: dotOpacity,
    };
  });

  const formatLastActivity = () => {
    if (!room.lastActivity) return "";
    return formatRelativeTime(new Date(room.lastActivity));
  };

  const getTypingText = () => {
    if (!isTyping || typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="rounded-2xl p-4 mb-3"
        style={{
          backgroundColor: colors.surface[800],
          borderWidth: 1,
          borderColor: unreadCount > 0 ? colors.brand.red + "40" : colors.border.default,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Header Row */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 flex-row items-center">
            {/* Room Type Icon */}
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: config.bgColor }}
            >
              <Ionicons name={config.icon} size={16} color={config.color} />
            </View>

            {/* Room Name */}
            <View className="flex-1">
              <Text className="text-lg font-bold" style={{ color: colors.text.primary }} numberOfLines={1}>
                {room.name}
              </Text>

              {/* Type Badge */}
              <View className="flex-row items-center mt-1">
                <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: config.bgColor }}>
                  <Text className="text-xs font-semibold" style={{ color: config.color }}>
                    {config.label}
                  </Text>
                </View>

                {/* Online indicator */}
                {onlineCount > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                    <Text className="text-xs" style={{ color: colors.text.muted }}>
                      {onlineCount} online
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Right side indicators */}
          <View className="items-end">
            {/* Unread badge */}
            {unreadCount > 0 && (
              <View className="rounded-full px-2 py-1 mb-1" style={{ backgroundColor: colors.brand.red }}>
                <Text className="text-white text-xs font-bold">{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}

            {/* Last activity */}
            <Text className="text-xs" style={{ color: colors.text.muted }}>
              {formatLastActivity()}
            </Text>
          </View>
        </View>

        {/* Description */}
        {room.description && (
          <Text className="text-sm mb-3 leading-5" style={{ color: colors.text.secondary }} numberOfLines={2}>
            {room.description}
          </Text>
        )}

        {/* Last Message or Typing Indicator */}
        <View className="min-h-[20px]">
          {isTyping ? (
            <Animated.View style={typingAnimatedStyle} className="flex-row items-center">
              <View className="flex-row items-center mr-2">
                <View className="w-1 h-1 rounded-full mr-1" style={{ backgroundColor: colors.brand.red }} />
                <View className="w-1 h-1 rounded-full mr-1" style={{ backgroundColor: colors.brand.red }} />
                <View className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.brand.red }} />
              </View>
              <Text className="text-xs italic" style={{ color: colors.brand.red }}>
                {getTypingText()}
              </Text>
            </Animated.View>
          ) : room.lastMessage ? (
            <View className="flex-row items-center">
              <Text className="text-xs font-medium mr-1" style={{ color: colors.text.secondary }}>
                {room.lastMessage.senderName}:
              </Text>
              <Text className="text-xs flex-1" style={{ color: colors.text.muted }} numberOfLines={1}>
                {room.lastMessage.content}
              </Text>
            </View>
          ) : (
            <Text className="text-xs italic" style={{ color: colors.text.muted }}>
              No messages yet
            </Text>
          )}
        </View>

        {/* Category footer (member count removed as requested) */}
        {room.category && room.category !== "all" && (
          <View
            className="flex-row justify-end mt-3 pt-3 border-t border-opacity-20"
            style={{ borderColor: colors.border.default }}
          >
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.surface[700] }}>
              <Text className="text-xs capitalize" style={{ color: colors.text.muted }}>
                {room.category}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
