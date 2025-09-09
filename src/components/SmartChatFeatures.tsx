import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import { ChatMember } from "../types";

interface Props {
  roomId: string;
  members: ChatMember[];
  onlineUsers: ChatMember[];
  typingUsers: { userName: string }[];
  connectionStatus: "connected" | "connecting" | "disconnected";
  onMentionUser?: (userName: string) => void;
  onSearchMessages?: (query: string) => void;
  onToggleNotifications?: () => void;
  isNotificationsEnabled?: boolean;
}

export default function SmartChatFeatures({
  roomId,
  members,
  onlineUsers,
  typingUsers,
  connectionStatus,
  onMentionUser,
  onSearchMessages,
  onToggleNotifications,
  isNotificationsEnabled = true,
}: Props) {
  const { colors } = useTheme();
  const [showMemberList, setShowMemberList] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const memberListScale = useSharedValue(0);
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

  const memberListAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: memberListScale.value }],
    opacity: memberListScale.value,
  }));

  const connectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: connectionOpacity.value,
  }));

  const typingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: typingOpacity.value,
  }));

  const openMemberList = () => {
    setShowMemberList(true);
    memberListScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const closeMemberList = () => {
    memberListScale.value = withTiming(0, { duration: 200 }, () => {
      setShowMemberList(false);
    });
  };

  const formatTypingUsers = () => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0].userName} is typing...`;
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }
    return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return colors.status.success;
      case "connecting":
        return colors.status.warning;
      case "disconnected":
        return colors.status.error;
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
        return "Disconnected";
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
          <Text className="text-white text-xs text-center font-medium">
            {getConnectionStatusText()}
          </Text>
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
              <View
                className="w-1 h-1 rounded-full mr-1 animate-pulse"
                style={{ backgroundColor: colors.brand.red }}
              />
              <View
                className="w-1 h-1 rounded-full mr-1 animate-pulse"
                style={{ backgroundColor: colors.brand.red }}
              />
              <View
                className="w-1 h-1 rounded-full animate-pulse"
                style={{ backgroundColor: colors.brand.red }}
              />
            </View>
            <Text
              className="text-xs italic"
              style={{ color: colors.text.secondary }}
            >
              {formatTypingUsers()}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Compact Header Actions - Only show online status */}
      <View
        className="flex-row items-center justify-between px-4 py-1"
        style={{
          backgroundColor: colors.surface[800],
        }}
      >
        <View className="flex-row items-center">
          {/* Online count - compact */}
          <View className="flex-row items-center">
            <View className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
            <Text className="text-xs" style={{ color: colors.text.muted }}>
              {onlineUsers.length} online
            </Text>
          </View>
        </View>

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
            className="p-1 mr-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isNotificationsEnabled ? "notifications" : "notifications-off"}
              size={18}
              color={isNotificationsEnabled ? colors.text.primary : colors.text.muted}
            />
          </Pressable>

          {/* Members button - compact */}
          <Pressable
            onPress={openMemberList}
            className="p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="people" size={18} color={colors.text.primary} />
          </Pressable>
        </View>
      </View>

      {/* Member List Modal */}
      <Modal
        visible={showMemberList}
        transparent
        animationType="fade"
        onRequestClose={closeMemberList}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <Animated.View
            style={[
              memberListAnimatedStyle,
              {
                backgroundColor: colors.surface[800],
                borderRadius: 16,
                maxHeight: "70%",
                width: "90%",
                maxWidth: 400,
              },
            ]}
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between p-4 border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <Text className="text-lg font-bold" style={{ color: colors.text.primary }}>
                Members
              </Text>
              <Pressable onPress={closeMemberList} className="p-2">
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>

            {/* Member list */}
            <ScrollView className="max-h-96">
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => {
                    onMentionUser?.(member.userName);
                    closeMemberList();
                  }}
                  className="flex-row items-center p-4 border-b"
                  style={{ borderBottomColor: colors.border + "40" }}
                >
                  {/* Avatar */}
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: colors.brand.red }}
                  >
                    <Text className="text-white font-bold">
                      {member.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* User info */}
                  <View className="flex-1">
                    <Text className="font-medium" style={{ color: colors.text.primary }}>
                      {member.userName}
                    </Text>
                    <Text className="text-xs" style={{ color: colors.text.muted }}>
                      {member.isOnline ? "Online" : "Offline"}
                    </Text>
                  </View>

                  {/* Online indicator */}
                  {member.isOnline && (
                    <View className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: colors.surface[800] }}
          >
            <Text className="text-lg font-bold mb-4" style={{ color: colors.text.primary }}>
              Search Messages
            </Text>

            <Text className="text-sm mb-4" style={{ color: colors.text.secondary }}>
              Coming soon! Message search functionality will be available in the next update.
            </Text>

            <Pressable
              onPress={() => setShowSearchModal(false)}
              className="rounded-xl py-3 items-center"
              style={{ backgroundColor: colors.brand.red }}
            >
              <Text className="text-white font-semibold">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
