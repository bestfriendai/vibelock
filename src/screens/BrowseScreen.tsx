import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useReviewsStore from "../state/reviewsStore";
import useAuthStore from "../state/authStore";

// We'll create this component next
import ReviewCard from "../components/ReviewCard";

export default function BrowseScreen() {
  const { user } = useAuthStore();
  const { 
    reviews, 
    isLoading, 
    filters, 
    loadReviews, 
    setFilters 
  } = useReviewsStore();
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReviews(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews(true);
    setRefreshing(false);
  };

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "men", label: "Men" },
    { key: "women", label: "Women" },
    { key: "lgbtq+", label: "LGBTQ+" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">LockerRoom</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1">
                {user?.location.city}, {user?.location.state} • 50mi
              </Text>
            </View>
          </View>
          <Pressable className="p-2">
            <Ionicons name="notifications-outline" size={24} color="#374151" />
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          <View className="flex-row space-x-3">
            {filterTabs.map((tab) => (
              <Pressable
                key={tab.key}
                className={`px-4 py-2 rounded-full ${
                  filters.category === tab.key
                    ? "bg-red-500"
                    : "bg-gray-100"
                }`}
                onPress={() => setFilters({ category: tab.key as any })}
              >
                <Text
                  className={`font-medium ${
                    filters.category === tab.key
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Reviews Feed */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 py-4 space-y-4">
          {reviews.length === 0 && !isLoading ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-lg font-medium mt-4">
                No reviews yet
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Be the first to share your dating experience
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          )}

          {isLoading && (
            <View className="items-center py-8">
              <Text className="text-gray-500">Loading reviews...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}