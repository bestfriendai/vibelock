import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import { MessageSearchModal } from "./MessageSearchModal";

interface Props {
  typingUsers: { userName: string }[];
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  onToggleNotifications?: () => void;
  isNotificationsEnabled?: boolean;
  errorMessage?: string;
  roomId?: string;
  onMessageSelect?: (messageId: string, roomId: string) => void;
}

export default function SmartChatFeatures({
  typingUsers,
  connectionStatus,
  onToggleNotifications,
  isNotificationsEnabled = true,
  errorMessage,
  roomId,
  onMessageSelect,
}: Props) {
  const { colors } = useTheme();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const connectionOpacity = useSharedValue(1);
  const typingOpacity = useSharedValue(0);

  useEffect(() => {
    connectionOpacity.value = withTiming(connectionStatus === "connected" ? 0 : 1, {
      duration: 300,
    });
  }, [connectionStatus]);

  useEffect(() => {
    typingOpacity.value = withTiming(typingUsers.length > 0 ? 1 : 0, {
      duration: 300,
    });
  }, [typingUsers.length]);

  const connectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: connectionOpacity.value,
  }));

  const typingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: typingOpacity.value,
  }));

  const formatTypingUsers = () => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]?.userName} is typing...`;
    if (typingUsers.length === 2) {
      return `${typingUsers[0]?.userName} and ${typingUsers[1]?.userName} are typing...`;
    }
    return `${typingUsers[0]?.userName} and ${typingUsers.length - 1} others are typing...`;
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return colors.status.success;
      case "connecting":
        return colors.status.warning;
      case "disconnected":
        return colors.status.error;
      case "error":
        return colors.brand.red;
      default:
        return colors.text.muted;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "No internet connection";
      case "error":
        return errorMessage || "Authentication required";
      default:
        return "Unknown";
    }
  };

  const shouldRender = connectionStatus !== "connected" || typingUsers.length > 0;

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {/* Connection Status Bar - Only show when not connected */}
      {connectionStatus !== "connected" && (
        <Animated.View
          style={[
            connectionAnimatedStyle,
            {
              backgroundColor: getConnectionStatusColor(),
              paddingVertical: 1,
              paddingHorizontal: 16,
            },
          ]}
        >
          <Text className="text-white text-xs text-center font-medium">{getConnectionStatusText()}</Text>
        </Animated.View>
      )}

      {/* Typing Indicator - Compact version */}
      {typingUsers.length > 0 && (
        <Animated.View
          style={[
            typingAnimatedStyle,
            {
              backgroundColor: colors.surface[800],
              paddingVertical: 2,
              paddingHorizontal: 16,
            },
          ]}
        >
          <View className="flex-row items-center">
            <View className="flex-row items-center mr-2">
              <View className="w-1 h-1 rounded-full mr-1 animate-pulse" style={{ backgroundColor: colors.brand.red }} />
              <View className="w-1 h-1 rounded-full mr-1 animate-pulse" style={{ backgroundColor: colors.brand.red }} />
              <View className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: colors.brand.red }} />
            </View>
            <Text className="text-xs italic" style={{ color: colors.text.secondary }}>
              {formatTypingUsers()}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Compact Header Actions - No online status or member count per user preferences */}
      <View
        className="flex-row items-center justify-end px-4 py-1"
        style={{
          backgroundColor: colors.surface[800],
        }}
      >
        <View className="flex-row items-center">
          {/* Search button - compact */}
          <Pressable
            onPress={() => setShowSearchModal(true)}
            className="p-1 mr-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search" size={18} color={colors.text.primary} />
          </Pressable>

          {/* Notifications toggle - compact */}
          <Pressable
            onPress={() => {
              if (onToggleNotifications) {
                onToggleNotifications();
              }
            }}
            className="p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isNotificationsEnabled ? "notifications" : "notifications-off"}
              size={18}
              color={isNotificationsEnabled ? colors.text.primary : colors.text.muted}
            />
          </Pressable>
        </View>
      </View>



      {/* Message Search Modal */}
      <MessageSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        roomId={roomId}
        onMessageSelect={(messageId, roomId) => {
          if (onMessageSelect) {
            onMessageSelect(messageId, roomId);
          }
          setShowSearchModal(false);
        }}
      />
    </>
  );
}
