import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming
} from "react-native-reanimated";

interface Props {
  onLike: () => void;
  onDislike: () => void;
  isLiked?: boolean;
  isDisliked?: boolean;
  likeCount?: number;
  dislikeCount?: number;
  disabled?: boolean;
}

export default function LikeDislikeButtons({
  onLike,
  onDislike,
  isLiked = false,
  isDisliked = false,
  likeCount = 0,
  dislikeCount = 0,
  disabled = false
}: Props) {
  const likeScale = useSharedValue(1);
  const dislikeScale = useSharedValue(1);

  const handleLike = () => {
    if (disabled) return;
    
    // Animate button press
    likeScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { duration: 200 })
    );
    
    onLike();
  };

  const handleDislike = () => {
    if (disabled) return;
    
    // Animate button press
    dislikeScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { duration: 200 })
    );
    
    onDislike();
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const dislikeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dislikeScale.value }],
  }));

  return (
    <View className="flex-row space-x-3 justify-center">
      {/* Like Button */}
      <Animated.View style={likeAnimatedStyle} className="flex-1">
        <Pressable
          onPress={handleLike}
          disabled={disabled}
          className={`flex-row items-center justify-center px-4 py-3 rounded-xl border ${
            isLiked 
              ? "bg-green-500 border-green-500" 
              : "bg-green-500/10 border-green-500/30"
          } ${disabled ? "opacity-50" : ""}`}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={18} 
            color={isLiked ? "#FFFFFF" : "#22C55E"} 
          />
          <Text 
            className={`ml-2 font-semibold ${
              isLiked ? "text-white" : "text-green-400"
            }`}
          >
            Like
          </Text>
          {likeCount > 0 && (
            <View className={`ml-2 px-2 py-0.5 rounded-full ${
              isLiked ? "bg-white/20" : "bg-green-500/20"
            }`}>
              <Text 
                className={`text-xs font-bold ${
                  isLiked ? "text-white" : "text-green-400"
                }`}
              >
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
          className={`flex-row items-center justify-center px-4 py-3 rounded-xl border ${
            isDisliked 
              ? "bg-brand-red border-brand-red" 
              : "bg-brand-red/10 border-brand-red/30"
          } ${disabled ? "opacity-50" : ""}`}
        >
          <Ionicons 
            name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} 
            size={18} 
            color={isDisliked ? "#FFFFFF" : "#FF6B6B"} 
          />
          <Text 
            className={`ml-2 font-semibold ${
              isDisliked ? "text-white" : "text-brand-red"
            }`}
          >
            Dislike
          </Text>
          {dislikeCount > 0 && (
            <View className={`ml-2 px-2 py-0.5 rounded-full ${
              isDisliked ? "bg-white/20" : "bg-brand-red/20"
            }`}>
              <Text 
                className={`text-xs font-bold ${
                  isDisliked ? "text-white" : "text-brand-red"
                }`}
              >
                {dislikeCount}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}