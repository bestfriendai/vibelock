import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, FadeIn } from "react-native-reanimated";
import { BrowseStackParamList } from "../navigation/AppNavigator";
import { Review } from "../types";
import { shareService } from "../services/shareService";
import { useResponsiveScreen } from "../utils/responsive";

interface Props {
  review: Review;
  cardHeight?: number;
  onReport?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

type Nav = NativeStackNavigationProp<BrowseStackParamList>;

export default function ProfileCard({ review, cardHeight = 280, onReport, onLike, isLiked = false }: Props) {
  const navigation = useNavigation<Nav>();
  const [imageLoaded, setImageLoaded] = useState(false);
  const screenData = useResponsiveScreen();
  const { cardWidth } = screenData.responsive;

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const reportScale = useSharedValue(1);
  const shareScale = useSharedValue(1);

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const animatedReportStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reportScale.value }],
  }));

  const animatedShareStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  // Safety check: ensure review exists and has required properties
  if (!review || !review.id || !review.reviewedPersonName) {
    return null;
  }

  const handlePress = () => {
    // Add press animation
    scale.value = withSpring(0.98, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 100 });
    });

    // Navigate to review detail with serialized data
    // Serialize dates defensively in case persisted data has strings/undefined
    const toIso = (value: any) => {
      try {
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "string") {
          const d = new Date(value);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
      } catch {}
      return new Date().toISOString();
    };

    const serializedReview = {
      ...review,
      createdAt: toIso((review as any).createdAt),
      updatedAt: toIso((review as any).updatedAt),
    };

    navigation.navigate("ReviewDetail", {
      review: serializedReview,
    });
  };

  const handleReport = (e: any) => {
    e.stopPropagation();
    reportScale.value = withSpring(0.8, { duration: 100 }, () => {
      reportScale.value = withSpring(1, { duration: 100 });
    });
    onReport?.();
  };

  const handleLike = (e: any) => {
    e.stopPropagation();
    heartScale.value = withSpring(0.7, { duration: 100 }, () => {
      heartScale.value = withSpring(1.2, { duration: 150 }, () => {
        heartScale.value = withSpring(1, { duration: 100 });
      });
    });
    onLike?.();
  };

  const handleShare = async (e: any) => {
    e.stopPropagation();
    shareScale.value = withSpring(0.8, { duration: 100 }, () => {
      shareScale.value = withSpring(1, { duration: 100 });
    });
    
    try {
      await shareService.shareReview(review);
    } catch (error) {
      // Log the error for diagnostics
      console.error('Failed to share review:', error);
      
      // You could show a toast or alert here if you have a toast service
      // For now, we'll just ensure the animation completes even on error
    }
  };

  return (
    <Animated.View style={[animatedCardStyle, { width: cardWidth, height: cardHeight }]}>
      <Pressable onPress={handlePress} className="overflow-hidden rounded-2xl mb-4 flex-1">
        {/* Profile Image */}
        <Image
          source={{
            uri:
              review.profilePhoto || `https://picsum.photos/${Math.floor(cardWidth)}/${cardHeight}?random=${review.id}`,
          }}
          style={{ width: cardWidth, height: cardHeight }}
          contentFit="cover"
          transition={300}
          onLoad={() => setImageLoaded(true)}
          placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />

        {/* Loading overlay */}
        {!imageLoaded && (
          <View className="absolute inset-0 bg-surface-800 items-center justify-center">
            <View className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: cardHeight * 0.6,
          }}
        />

        {/* Action Buttons - Top Right */}
        <View className="absolute top-3 right-3 flex-col space-y-2">
          {/* Share Button */}
          <Animated.View style={animatedShareStyle}>
            <Pressable onPress={handleShare} className="bg-black/60 rounded-full p-2.5" hitSlop={8}>
              <Ionicons name="share-outline" size={16} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          {/* Report Button */}
          <Animated.View style={animatedReportStyle}>
            <Pressable onPress={handleReport} className="bg-black/60 rounded-full p-2.5" hitSlop={8}>
              <Ionicons name="flag" size={16} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </View>

        {/* Heart/Like Button - Top Left */}
        <Animated.View style={[animatedHeartStyle, { position: "absolute", top: 12, left: 12 }]}>
          <Pressable onPress={handleLike} className="bg-black/60 rounded-full p-2.5" hitSlop={8}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={16} color={isLiked ? "#EF4444" : "#FFFFFF"} />
          </Pressable>
        </Animated.View>

        {/* Content */}
        <View className="absolute bottom-0 left-0 right-0 p-4 pb-12">
          {/* Name */}
          <Text className="text-white font-bold text-xl mb-1">{review.reviewedPersonName || "Unknown"}</Text>

          {/* Location */}
          {review.reviewedPersonLocation && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="location" size={12} color="#FFFFFF" />
              <Text className="text-white/80 text-xs ml-1">
                {review.reviewedPersonLocation.city || "Unknown"}, {review.reviewedPersonLocation.state || "Unknown"}
              </Text>
            </View>
          )}

          {/* Review Preview Text */}
          {review.reviewText && (
            <Text className="text-white/90 text-sm mb-3 leading-5" numberOfLines={2} ellipsizeMode="tail">
              {review.reviewText}
            </Text>
          )}

          {/* Stats Row */}
          <View className="flex-row items-center">
            {/* Like Count */}
            {review.likeCount > 0 && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="heart" size={12} color="#EF4444" />
                <Text className="text-white/80 text-xs ml-1">{review.likeCount}</Text>
              </View>
            )}

            {/* Comment indicator (placeholder for future feature) */}
            <View className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={12} color="#FFFFFF" />
              <Text className="text-white/80 text-xs ml-1">0</Text>
            </View>
          </View>
        </View>

        {/* Bottom Indicators Row */}
        <View className="absolute bottom-3 left-3 right-3 flex-row items-end justify-between">
          {/* Flag Count Indicators - Left Side */}
          {(review.greenFlags?.length > 0 || review.redFlags?.length > 0) && (
            <View className="flex-row space-x-3">
              {review.greenFlags?.length > 0 && (
                <View className="bg-green-500/20 border border-green-500/40 rounded-full px-2 py-1 flex-row items-center">
                  <Ionicons name="leaf" size={10} color="#22C55E" />
                  <Text className="text-green-400 text-xs font-medium ml-1">{review.greenFlags.length}</Text>
                </View>
              )}
              {review.redFlags?.length > 0 && (
                <View className="bg-red-500/20 border border-red-500/40 rounded-full px-2 py-1 flex-row items-center">
                  <Ionicons name="alert-circle" size={10} color="#EF4444" />
                  <Text className="text-red-400 text-xs font-medium ml-1">{review.redFlags.length}</Text>
                </View>
              )}
            </View>
          )}

          {/* Sentiment Chip - Right Side */}
          {review.sentiment && (
            <View>
              {review.sentiment === "green" ? (
                <View className="bg-green-500/90 rounded-full px-3 py-1.5 flex-row items-center shadow-lg">
                  <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                  <Text className="text-white text-xs font-semibold ml-1">GREEN FLAG</Text>
                </View>
              ) : (
                <View className="bg-red-500/90 rounded-full px-3 py-1.5 flex-row items-center shadow-lg">
                  <Ionicons name="warning" size={12} color="#FFFFFF" />
                  <Text className="text-white text-xs font-semibold ml-1">RED FLAG</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
