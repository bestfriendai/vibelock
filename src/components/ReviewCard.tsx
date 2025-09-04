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
    <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <Pressable onPress={handlePersonPress} className="mb-3">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-red-500 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {review.reviewedPersonName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {review.reviewedPersonName}
            </Text>
            <Text className="text-gray-600 text-sm">
              {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
            </Text>
          </View>
          <Text className="text-gray-500 text-sm">
            {formatDate(review.createdAt)}
          </Text>
        </View>
      </Pressable>

      {/* Flags */}
      {(review.greenFlags.length > 0 || review.redFlags.length > 0) && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {review.greenFlags.slice(0, 3).map((flag) => (
            <View key={flag} className="bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-green-700 text-xs font-medium">
                {FLAG_LABELS[flag] || flag}
              </Text>
            </View>
          ))}
          {review.redFlags.slice(0, 3).map((flag) => (
            <View key={flag} className="bg-red-100 px-2 py-1 rounded-full">
              <Text className="text-red-700 text-xs font-medium">
                {FLAG_LABELS[flag] || flag}
              </Text>
            </View>
          ))}
          {(review.greenFlags.length + review.redFlags.length) > 3 && (
            <View className="bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-gray-600 text-xs font-medium">
                +{(review.greenFlags.length + review.redFlags.length) - 3} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Review Text */}
      <Text className="text-gray-900 mb-3 leading-5">
        {truncateText(review.reviewText)}
      </Text>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <View className="flex-row items-center space-x-4">
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-1" />
            <Text className="text-gray-600 text-sm font-medium">
              {review.greenFlags.length}
            </Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-red-500 rounded-full mr-1" />
            <Text className="text-gray-600 text-sm font-medium">
              {review.redFlags.length}
            </Text>
          </View>
        </View>

        <Pressable 
          onPress={handleLike}
          className="flex-row items-center"
        >
          <Ionicons 
            name="heart-outline" 
            size={16} 
            color="#6B7280" 
          />
          <Text className="text-gray-600 text-sm ml-1 font-medium">
            {review.likeCount}
          </Text>
        </Pressable>
      </View>

      {/* Status Badge */}
      {review.status === "pending" && (
        <View className="absolute top-2 right-2">
          <View className="bg-yellow-100 px-2 py-1 rounded-full">
            <Text className="text-yellow-700 text-xs font-medium">Pending</Text>
          </View>
        </View>
      )}
    </View>
  );
}