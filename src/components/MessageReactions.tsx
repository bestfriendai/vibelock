import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../providers/ThemeProvider";
import useAuthStore from "../state/authStore";

const { width: screenWidth } = Dimensions.get("window");

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReact: (messageId: string, emoji: string) => void;
  onShowReactionPicker: (messageId: string) => void;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥"];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onReact,
  onShowReactionPicker,
}) => {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const handleReaction = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(messageId, emoji);
    setShowQuickReactions(false);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowQuickReactions(true);
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1.05);
  };

  const closeQuickReactions = () => {
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withSpring(1);
    setTimeout(() => setShowQuickReactions(false), 150);
  };

  const quickReactionsStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Derive hasReacted for current user if not provided by parent
  const enrichedReactions = useMemo(() => {
    const userId = user?.id;
    return reactions.map((r) => ({
      ...r,
      hasReacted: r.hasReacted ?? (userId ? r.users.includes(userId) : false),
    }));
  }, [reactions, user?.id]);

  return (
    <View>
      {/* Existing Reactions */}
      {enrichedReactions.length > 0 && (
        <View className="flex-row flex-wrap mt-1">
          {enrichedReactions.map((reaction, index) => (
            <Pressable
              key={`${reaction.emoji}-${index}`}
              onPress={() => handleReaction(reaction.emoji)}
              className="flex-row items-center mr-1 mb-1 px-2 py-1 rounded-full"
              style={{
                backgroundColor: reaction.hasReacted ? colors.brand.red + "20" : colors.surface[700],
                borderWidth: reaction.hasReacted ? 1 : 0,
                borderColor: reaction.hasReacted ? colors.brand.red : "transparent",
              }}
            >
              <Text className="text-sm">{reaction.emoji}</Text>
              {reaction.count > 1 && (
                <Text className="text-xs ml-1 font-medium" style={{ color: colors.text.primary }}>
                  {reaction.count}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Add Reaction Button */}
      <Pressable
        onLongPress={handleLongPress}
        onPress={() => onShowReactionPicker(messageId)}
        className="mt-1"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text className="text-xs" style={{ color: colors.text.muted }}>
          + React
        </Text>
      </Pressable>

      {/* Quick Reactions Modal */}
      <Modal visible={showQuickReactions} transparent animationType="none" onRequestClose={closeQuickReactions}>
        <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={closeQuickReactions}>
          <Animated.View
            style={[
              quickReactionsStyle,
              {
                backgroundColor: colors.surface[800],
                borderRadius: 25,
                paddingHorizontal: 16,
                paddingVertical: 12,
                maxWidth: screenWidth - 40,
              },
            ]}
          >
            <View className="flex-row items-center">
              {QUICK_REACTIONS.map((emoji, index) => (
                <Pressable
                  key={emoji}
                  onPress={() => handleReaction(emoji)}
                  className="w-12 h-12 items-center justify-center mx-1 rounded-full"
                  style={{ backgroundColor: colors.surface[700] }}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </Pressable>
              ))}

              {/* More Reactions Button */}
              <Pressable
                onPress={() => {
                  closeQuickReactions();
                  onShowReactionPicker(messageId);
                }}
                className="w-12 h-12 items-center justify-center mx-1 rounded-full"
                style={{ backgroundColor: colors.surface[600] }}
              >
                <Text className="text-lg font-bold" style={{ color: colors.text.primary }}>
                  +
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MessageReactions;
