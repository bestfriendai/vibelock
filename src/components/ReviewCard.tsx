import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Review } from "../types";
import { RootStackParamList } from "../navigation/AppNavigator";
import useReviewsStore from "../state/reviewsStore";

interface ReviewCardProps {
  review: Review;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReviewCard({ review }: ReviewCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { likeReview } = useReviewsStore();

  const handlePersonPress = () => {
    navigation.navigate("PersonProfile", {
      firstName: review.reviewedPersonName,
      location: review.reviewedPersonLocation,
    });
  };

  const handleLike = () => {
    likeReview(review.id);
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
    <View className="bg-surface-800 rounded-2xl p-6 mb-4 border border-surface-700">
      {/* Header */}
      <Pressable onPress={handlePersonPress} className="mb-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-brand-red rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">{review.reviewedPersonName.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-text-primary">{review.reviewedPersonName}</Text>
            <Text className="text-text-secondary text-sm">
              {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
            </Text>
          </View>
          <Text className="text-text-muted text-sm">{formatDate(review.createdAt)}</Text>
        </View>
      </Pressable>

      {/* Review Text */}
      <Text className="text-text-primary mb-4 leading-6 text-base">{truncateText(review.reviewText)}</Text>

      {/* Footer */}
      <View className="flex-row items-center justify-end pt-4 border-t border-surface-700">
        <Pressable onPress={handleLike} className="flex-row items-center bg-brand-red/10 px-3 py-2 rounded-full">
          <Ionicons name="heart" size={16} color="#FFFFFF" />
          <Text className="text-brand-red text-sm ml-1 font-medium">{review.likeCount}</Text>
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
