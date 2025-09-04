import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import ReportModal from "../components/ReportModal";

type PersonProfileRouteProp = RouteProp<RootStackParamList, "PersonProfile">;

export default function PersonProfileScreen() {
  const route = useRoute<PersonProfileRouteProp>();
  const navigation = useNavigation();
  const { firstName, location } = route.params;
  const [showReportModal, setShowReportModal] = useState(false);

  // Mock data for now
  const mockReviews = [
    {
      id: "1",
      greenFlags: ["good_communicator", "respectful"],
      redFlags: [],
      reviewText: "Had a great time! Very respectful and easy to talk to.",
      likeCount: 12,
      createdAt: "2024-01-15"
    },
    {
      id: "2",
      greenFlags: ["reliable"],
      redFlags: ["poor_communication"],
      reviewText: "Nice person but communication could be better.",
      likeCount: 8,
      createdAt: "2024-01-10"
    }
  ];

  const totalGreenFlags = mockReviews.reduce((sum, review) => sum + review.greenFlags.length, 0);
  const totalRedFlags = mockReviews.reduce((sum, review) => sum + review.redFlags.length, 0);

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className="bg-surface-800 px-4 py-6 border-b border-gray-200">
          <View className="items-center">
            <View className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">{firstName}</Text>
            <Text className="text-gray-600 mt-1">
              {location.city}, {location.state}
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row justify-around mt-6 pt-6 border-t border-gray-100">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900">
                {mockReviews.length}
              </Text>
              <Text className="text-gray-600 text-sm">Reviews</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">
                {totalGreenFlags}
              </Text>
              <Text className="text-gray-600 text-sm">Green Flags</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-red-600">
                {totalRedFlags}
              </Text>
              <Text className="text-gray-600 text-sm">Red Flags</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 mt-6">
            <Pressable className="flex-1 bg-red-500 rounded-lg py-3 items-center">
              <Text className="text-white font-semibold">Write Review</Text>
            </Pressable>
            <Pressable 
              className="px-4 py-3 border border-gray-300 rounded-lg items-center"
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="flag-outline" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Reviews */}
        <View className="px-4 py-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Reviews ({mockReviews.length})
          </Text>

          {mockReviews.map((review) => (
            <View key={review.id} className="bg-surface-800 rounded-lg p-4 mb-4">
              {/* Flags */}
              <View className="flex-row flex-wrap gap-2 mb-3">
                {review.greenFlags.map((flag) => (
                  <View key={flag} className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-green-700 text-xs font-medium">
                      {flag.replace("_", " ")}
                    </Text>
                  </View>
                ))}
                {review.redFlags.map((flag) => (
                  <View key={flag} className="bg-red-100 px-2 py-1 rounded-full">
                    <Text className="text-red-700 text-xs font-medium">
                      {flag.replace("_", " ")}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Review Text */}
              <Text className="text-gray-900 mb-3">{review.reviewText}</Text>

              {/* Footer */}
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-500 text-sm">{review.createdAt}</Text>
                <View className="flex-row items-center">
                  <Ionicons name="heart-outline" size={16} color="#6B7280" />
                  <Text className="text-gray-500 text-sm ml-1">
                    {review.likeCount}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        itemId={`profile_${firstName}_${location.city}_${location.state}`}
        itemType="profile"
        itemName={`${firstName} from ${location.city}, ${location.state}`}
      />
    </SafeAreaView>
  );
}