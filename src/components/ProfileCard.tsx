import React, { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { BrowseStackParamList } from "../navigation/AppNavigator";
import { Review } from "../types";

interface Props {
  review: Review;
  cardHeight?: number;
  onReport?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

type Nav = NativeStackNavigationProp<BrowseStackParamList>;

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 48) / 2; // Account for padding and gap

export default function ProfileCard({ review, cardHeight = 280, onReport, onLike, isLiked = false }: Props) {
  const navigation = useNavigation<Nav>();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const reportScale = useSharedValue(1);

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
    const serializedReview = {
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
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

        {/* Report Button */}
        <Animated.View style={[animatedReportStyle, { position: "absolute", top: 12, right: 12 }]}>
          <Pressable onPress={handleReport} className="bg-black/50 rounded-full p-2" hitSlop={8}>
            <Ionicons name="flag" size={16} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        {/* Heart/Like Button */}
        <Animated.View style={[animatedHeartStyle, { position: "absolute", top: 12, left: 12 }]}>
          <Pressable onPress={handleLike} className="bg-black/50 rounded-full p-2" hitSlop={8}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={16} color={isLiked ? "#FFFFFF" : "#FFFFFF"} />
          </Pressable>
        </Animated.View>

        {/* Content */}
        <View className="absolute bottom-0 left-0 right-0 p-4">
          {/* Name */}
          <Text className="text-white font-bold text-xl">{review.reviewedPersonName || "Unknown"}</Text>
          {/* Location */}
          {review.reviewedPersonLocation && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={12} color="#FFFFFF" />
              <Text className="text-white/80 text-xs ml-1">
                {review.reviewedPersonLocation.city || "Unknown"}, {review.reviewedPersonLocation.state || "Unknown"}
              </Text>
            </View>
          )}

          {/* Like Count */}
          {review.likeCount > 0 && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="heart" size={12} color="#FFFFFF" />
              <Text className="text-white/70 text-xs ml-1">{review.likeCount}</Text>
            </View>
          )}
        </View>

        {/* Sentiment Overlay */}
        {review.sentiment && (
          <View className="absolute bottom-3 right-3 bg-black/50 rounded-full px-2 py-1 flex-row items-center">
            <Ionicons name="flag" size={12} color={review.sentiment === "green" ? "#22C55E" : "#FFFFFF"} />
            <Text className="text-white text-xs ml-1">{review.sentiment === "green" ? "Green" : "Red"}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
