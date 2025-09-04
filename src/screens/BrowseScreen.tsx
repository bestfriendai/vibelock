import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  FlatList
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useReviewsStore from "../state/reviewsStore";
import useAuthStore from "../state/authStore";

import SegmentedTabs from "../components/SegmentedTabs";
import ReviewGridCard from "../components/ReviewGridCard";

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
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="bg-surface-800 px-4 py-3 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-surface-600 items-center justify-center mr-3">
              <Text className="text-text-primary font-semibold">D</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary">LockerRoom</Text>
          </View>
          <Pressable className="p-2">
            <Ionicons name="notifications-outline" size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Location + Radius */}
        <View className="flex-row items-center mt-3 space-x-3">
          <Pressable className="flex-row items-center bg-surface-700 px-3 py-2 rounded-full">
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text className="text-text-secondary text-sm ml-1">
              {user?.location.city}, {user?.location.state}
            </Text>
          </Pressable>
          <Pressable 
            className="bg-surface-700 px-3 py-2 rounded-full"
            onPress={() => {
              const order = [10, 25, 50];
              const curr = filters.radius || 50;
              const idx = order.indexOf(curr);
              const next = order[(idx + 1) % order.length];
              setFilters({ radius: next });
            }}
          >
            <Text className="text-text-secondary text-sm">{filters.radius || 50}mi</Text>
          </Pressable>
        </View>

        {/* Segmented Tabs */}
        <View className="mt-3">
          <SegmentedTabs
            tabs={filterTabs}
            value={filters.category}
            onChange={(key) => setFilters({ category: key as any })}
          />
        </View>
      </View>

      {/* Reviews Grid */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        renderItem={({ item }) => <ReviewGridCard review={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!isLoading ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
            <Text className="text-text-secondary text-lg font-medium mt-4">No reviews yet</Text>
            <Text className="text-text-muted text-center mt-2">Be the first to share your dating experience</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}