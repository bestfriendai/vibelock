import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, TextInput, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../providers/ThemeProvider";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

// Emoji categories with popular emojis
const EMOJI_CATEGORIES = {
  recent: ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "✨"],
  smileys: [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "😋",
    "😛",
    "😜",
    "🤪",
    "😝",
    "🤑",
    "🤗",
    "🤭",
    "🤫",
    "🤔",
    "🤐",
    "🤨",
    "😐",
    "😑",
    "😶",
    "😏",
    "😒",
    "🙄",
    "😬",
    "🤥",
    "😔",
    "😪",
    "🤤",
    "😴",
    "😷",
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🤧",
  ],
  hearts: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💟",
    "♥️",
  ],
  gestures: [
    "👍",
    "👎",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👏",
    "🙌",
    "🤲",
    "🤝",
    "🙏",
    "✍️",
    "💪",
    "🦾",
    "🦿",
  ],
  objects: [
    "🔥",
    "💯",
    "✨",
    "🎉",
    "🎊",
    "💥",
    "💫",
    "⭐",
    "🌟",
    "⚡",
    "💎",
    "🏆",
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎖️",
    "🏵️",
    "🎗️",
    "🎫",
  ],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ visible, onClose, onEmojiSelect }) => {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const handleEmojiSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEmojiSelect(emoji);
    onClose();
  };

  const handleCategorySelect = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  };

  const getFilteredEmojis = () => {
    const emojis = EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || [];

    if (!searchQuery) return emojis;

    // Simple search - in a real app, you'd use a more sophisticated emoji search
    return emojis.filter((emoji) => {
      // This is a simplified search - you could add emoji names/keywords
      return true; // For now, return all emojis when searching
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "recent":
        return "time-outline";
      case "smileys":
        return "happy-outline";
      case "hearts":
        return "heart-outline";
      case "gestures":
        return "hand-left-outline";
      case "objects":
        return "star-outline";
      default:
        return "happy-outline";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between p-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <Text className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            Choose Reaction
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="p-4">
          <View className="flex-row items-center px-3 py-2 rounded-lg" style={{ backgroundColor: colors.surface[700] }}>
            <Ionicons name="search" size={20} color={colors.text.muted} />
            <TextInput
              className="flex-1 ml-2 text-base"
              style={{ color: colors.text.primary }}
              placeholder="Search emojis..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Tabs */}
        <View className="flex-row px-4 pb-2 border-b" style={{ borderBottomColor: colors.border }}>
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Pressable
              key={category}
              onPress={() => handleCategorySelect(category)}
              className="flex-1 items-center py-2"
            >
              <Ionicons
                name={getCategoryIcon(category) as any}
                size={24}
                color={selectedCategory === category ? colors.brand.red : colors.text.muted}
              />
            </Pressable>
          ))}
        </View>

        {/* Emoji Grid */}
        <ScrollView className="flex-1 p-4">
          <View className="flex-row flex-wrap">
            {getFilteredEmojis().map((emoji, index) => (
              <Pressable
                key={`${emoji}-${index}`}
                onPress={() => handleEmojiSelect(emoji)}
                className="w-12 h-12 items-center justify-center m-1 rounded-lg"
                style={{ backgroundColor: colors.surface[700] }}
              >
                <Text className="text-2xl">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default EmojiPicker;
