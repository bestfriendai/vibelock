import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Review } from "../types";
import { RootStackParamList } from "../navigation/AppNavigator";
import useReviewsStore from "../state/reviewsStore";
import { useTheme } from "../providers/ThemeProvider";
import { socialSharingService } from "../services/socialSharingService";

interface ReviewCardProps {
  review: Review;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReviewCard({ review }: ReviewCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { likeReview } = useReviewsStore();
  const { theme, colors, isDarkMode } = useTheme();

  const handlePersonPress = () => {
    navigation.navigate("PersonProfile", {
      firstName: review.reviewedPersonName,
      location: review.reviewedPersonLocation,
    });
  };

  const handleLike = () => {
    likeReview(review.id);
  };

  const handleShare = () => {
    socialSharingService.showShareOptions(review);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <View
      className="rounded-2xl p-6 mb-4 border"
      style={{
        backgroundColor: colors.surface[800],
        borderColor: colors.border
      }}
    >
      {/* Header */}
      <Pressable onPress={handlePersonPress} className="mb-4">
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.brand.red }}
          >
            <Text className="text-white font-bold text-lg">
              {review.reviewedPersonName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text
              className="text-lg font-semibold"
              style={{ color: colors.text.primary }}
            >
              {review.reviewedPersonName}
            </Text>
            <Text
              className="text-sm"
              style={{ color: colors.text.secondary }}
            >
              {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
            </Text>
          </View>
          <Text
            className="text-sm"
            style={{ color: colors.text.muted }}
          >
            {formatDate(review.createdAt)}
          </Text>
        </View>
      </Pressable>

      {/* Review Text */}
      <Text
        className="mb-4 leading-6 text-base"
        style={{ color: colors.text.primary }}
      >
        {truncateText(review.reviewText)}
      </Text>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-4 border-t" style={{ borderColor: colors.border }}>
        <Pressable
          onPress={handleShare}
          className="flex-row items-center px-3 py-2 rounded-full"
          style={{ backgroundColor: colors.surface[700] }}
        >
          <Ionicons name="share-outline" size={16} color={colors.text.muted} />
          <Text className="text-sm ml-1 font-medium" style={{ color: colors.text.muted }}>
            Share
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLike}
          className="flex-row items-center px-3 py-2 rounded-full"
          style={{ backgroundColor: colors.brand.red + '20' }}
        >
          <Ionicons name="heart" size={16} color={colors.brand.red} />
          <Text className="text-sm ml-1 font-medium" style={{ color: colors.brand.red }}>
            {review.likeCount}
          </Text>
        </Pressable>
      </View>

      {/* Status Badge */}
      {review.status === "pending" && (
        <View className="absolute top-4 right-4">
          <View className="bg-yellow-500/20 border border-yellow-500/30 px-2 py-1 rounded-full">
            <Text className="text-yellow-400 text-xs font-medium">Pending</Text>
          </View>
        </View>
      )}
    </View>
  );
}
