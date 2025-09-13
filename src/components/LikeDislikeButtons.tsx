import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  onLike: () => void;
  onDislike: () => void;
  isLiked?: boolean;
  isDisliked?: boolean;
  likeCount?: number;
  dislikeCount?: number;
  disabled?: boolean;
}

const LikeDislikeButtons = React.forwardRef<View, Props>(
  (
    { onLike, onDislike, isLiked = false, isDisliked = false, likeCount = 0, dislikeCount = 0, disabled = false },
    ref,
  ) => {
    const { colors } = useTheme();
    const likeScale = useSharedValue(1);
    const dislikeScale = useSharedValue(1);

    const handleLike = () => {
      if (disabled) return;

      // Animate button press
      likeScale.value = withSequence(withTiming(0.9, { duration: 100 }), withSpring(1, { duration: 200 }));

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      onLike();
    };

    const handleDislike = () => {
      if (disabled) return;

      // Animate button press
      dislikeScale.value = withSequence(withTiming(0.9, { duration: 100 }), withSpring(1, { duration: 200 }));

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      onDislike();
    };

    const likeAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: likeScale.value }],
    }));

    const dislikeAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: dislikeScale.value }],
    }));

    return (
      <View ref={ref} className="flex-row space-x-3 justify-center">
        {/* Like Button */}
        <Animated.View style={likeAnimatedStyle} className="flex-1">
          <Pressable
            onPress={handleLike}
            disabled={disabled}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? `Unlike review (${likeCount} likes)` : `Like review (${likeCount} likes)`}
            accessibilityState={{ selected: isLiked }}
            accessibilityHint={isLiked ? "Double tap to remove your like" : "Double tap to like this review"}
            className="flex-row items-center justify-center px-4 py-3 rounded-xl"
            style={{
              backgroundColor: isLiked ? colors.accent.green : colors.accent.green + "10",
              borderWidth: 1,
              borderColor: isLiked ? colors.accent.green : colors.accent.green + "30",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? "#FFFFFF" : colors.accent.green}
            />
            <Text className="ml-2 font-semibold" style={{ color: isLiked ? "#FFFFFF" : colors.accent.green }}>
              Like
            </Text>
            {likeCount > 0 && (
              <View
                className="ml-2 px-2 py-1 rounded-full"
                style={{ backgroundColor: isLiked ? "#FFFFFF20" : colors.accent.green + "20" }}
              >
                <Text className="text-xs font-bold" style={{ color: isLiked ? "#FFFFFF" : colors.accent.green }}>
                  {likeCount}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Dislike Button */}
        <Animated.View style={dislikeAnimatedStyle} className="flex-1">
          <Pressable
            onPress={handleDislike}
            disabled={disabled}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={
              isDisliked ? `Remove dislike (${dislikeCount} dislikes)` : `Dislike review (${dislikeCount} dislikes)`
            }
            accessibilityState={{ selected: isDisliked }}
            accessibilityHint={isDisliked ? "Double tap to remove your dislike" : "Double tap to dislike this review"}
            className="flex-row items-center justify-center px-4 py-3 rounded-xl"
            style={{
              backgroundColor: isDisliked ? colors.text.primary : colors.text.primary + "10",
              borderWidth: 1,
              borderColor: isDisliked ? colors.text.primary : colors.text.primary + "30",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Ionicons
              name={isDisliked ? "thumbs-down" : "thumbs-down-outline"}
              size={18}
              color={isDisliked ? colors.surface[900] : colors.text.primary}
            />
            <Text
              className="ml-2 font-semibold"
              style={{ color: isDisliked ? colors.surface[900] : colors.text.primary }}
            >
              Dislike
            </Text>
            {dislikeCount > 0 && (
              <View
                className="ml-2 px-2 py-1 rounded-full"
                style={{ backgroundColor: isDisliked ? colors.surface[900] + "20" : colors.text.primary + "20" }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: isDisliked ? colors.surface[900] : colors.text.primary }}
                >
                  {dislikeCount}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
    );
  },
);

LikeDislikeButtons.displayName = "LikeDislikeButtons";

export default LikeDislikeButtons;
