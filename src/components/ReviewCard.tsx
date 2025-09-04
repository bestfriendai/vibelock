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

const FLAG_LABELS: Record<string, string> = {
  // Green flags
  good_communicator: "Good Communicator",
  respectful: "Respectful",
  fun: "Fun",
  reliable: "Reliable",
  honest: "Honest",
  kind: "Kind",
  ambitious: "Ambitious",
  good_listener: "Good Listener",
  
  // Red flags
  poor_communication: "Poor Communication",
  disrespectful: "Disrespectful",
  unreliable: "Unreliable",
  fake: "Fake",
  rude: "Rude",
  controlling: "Controlling",
  dishonest: "Dishonest",
  inconsistent: "Inconsistent",
};

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
            <Text className="text-white font-bold text-lg">
              {review.reviewedPersonName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-text-primary">
              {review.reviewedPersonName}
            </Text>
            <Text className="text-text-secondary text-sm">
              {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
            </Text>
          </View>
          <Text className="text-text-muted text-sm">
            {formatDate(review.createdAt)}
          </Text>
        </View>
      </Pressable>

      {/* Flags */}
      {(review.greenFlags.length > 0 || review.redFlags.length > 0) && (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {review.greenFlags.slice(0, 3).map((flag) => (
            <View key={flag} className="bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-full">
              <Text className="text-green-400 text-xs font-medium">
                {FLAG_LABELS[flag] || flag}
              </Text>
            </View>
          ))}
          {review.redFlags.slice(0, 3).map((flag) => (
            <View key={flag} className="bg-brand-red/20 border border-brand-red/30 px-3 py-1.5 rounded-full">
              <Text className="text-brand-red text-xs font-medium">
                {FLAG_LABELS[flag] || flag}
              </Text>
            </View>
          ))}
          {(review.greenFlags.length + review.redFlags.length) > 3 && (
            <View className="bg-surface-700 border border-surface-600 px-3 py-1.5 rounded-full">
              <Text className="text-text-secondary text-xs font-medium">
                +{(review.greenFlags.length + review.redFlags.length) - 3} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Review Text */}
      <Text className="text-text-primary mb-4 leading-6 text-base">
        {truncateText(review.reviewText)}
      </Text>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-4 border-t border-surface-700">
        <View className="flex-row items-center space-x-6">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text className="text-text-secondary text-sm font-medium ml-1">
              {review.greenFlags.length}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="warning" size={16} color="#FFFFFF" />
            <Text className="text-text-secondary text-sm font-medium ml-1">
              {review.redFlags.length}
            </Text>
          </View>
        </View>

        <Pressable 
          onPress={handleLike}
          className="flex-row items-center bg-brand-red/10 px-3 py-2 rounded-full"
        >
          <Ionicons 
            name="heart" 
            size={16} 
            color="#FFFFFF" 
          />
          <Text className="text-brand-red text-sm ml-1 font-medium">
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