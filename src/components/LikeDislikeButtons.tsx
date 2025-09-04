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
    <View className="flex-row space-x-4 justify-center">
      {/* Like Button */}
      <Animated.View style={likeAnimatedStyle}>
        <Pressable
          onPress={handleLike}
          disabled={disabled}
          className={`flex-row items-center px-6 py-3 rounded-full border-2 ${
            isLiked 
              ? "bg-green-500 border-green-500" 
              : "bg-green-50 border-green-200"
          } ${disabled ? "opacity-50" : ""}`}
        >
          <Ionicons 
            name={isLiked ? "thumbs-up" : "thumbs-up-outline"} 
            size={18} 
            color={isLiked ? "#FFFFFF" : "#22C55E"} 
          />
          <Text 
            className={`ml-2 font-semibold ${
              isLiked ? "text-white" : "text-green-600"
            }`}
          >
            Like
          </Text>
          {likeCount > 0 && (
            <View className={`ml-2 px-2 py-0.5 rounded-full ${
              isLiked ? "bg-white/20" : "bg-green-100"
            }`}>
              <Text 
                className={`text-xs font-bold ${
                  isLiked ? "text-white" : "text-green-700"
                }`}
              >
                {likeCount}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Dislike Button */}
      <Animated.View style={dislikeAnimatedStyle}>
        <Pressable
          onPress={handleDislike}
          disabled={disabled}
          className={`flex-row items-center px-6 py-3 rounded-full border-2 ${
            isDisliked 
              ? "bg-red-500 border-red-500" 
              : "bg-red-50 border-red-200"
          } ${disabled ? "opacity-50" : ""}`}
        >
          <Ionicons 
            name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} 
            size={18} 
            color={isDisliked ? "#FFFFFF" : "#EF4444"} 
          />
          <Text 
            className={`ml-2 font-semibold ${
              isDisliked ? "text-white" : "text-red-600"
            }`}
          >
            Dislike
          </Text>
          {dislikeCount > 0 && (
            <View className={`ml-2 px-2 py-0.5 rounded-full ${
              isDisliked ? "bg-white/20" : "bg-red-100"
            }`}>
              <Text 
                className={`text-xs font-bold ${
                  isDisliked ? "text-white" : "text-red-700"
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