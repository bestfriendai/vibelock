import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useReviewsStore from "../state/reviewsStore";
import useAuthStore from "../state/authStore";

import StaggeredGrid from "../components/StaggeredGrid";
import ReportModal from "../components/ReportModal";
import { Review } from "../types";

export default function BrowseScreen() {
  const { user } = useAuthStore();
  const { 
    reviews, 
    isLoading, 
    filters, 
    loadReviews, 
    setFilters,
    likeReview
  } = useReviewsStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [likedReviews, setLikedReviews] = useState(new Set<string>());

  useEffect(() => {
    loadReviews(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews(true);
    setRefreshing(false);
  };

  const handleReport = (review: Review) => {
    setSelectedReview(review);
    setShowReportModal(true);
  };

  const handleLike = (review: Review) => {
    const newLikedReviews = new Set(likedReviews);
    if (likedReviews.has(review.id)) {
      newLikedReviews.delete(review.id);
    } else {
      newLikedReviews.add(review.id);
      likeReview(review.id);
    }
    setLikedReviews(newLikedReviews);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#FF8A80", "#FFAB91"]}
        className="px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
              <Text className="text-white text-lg font-bold">🫖</Text>
            </View>
            <Text className="text-2xl font-bold text-white">TeaOnHer</Text>
          </View>
          <View className="bg-white/20 px-3 py-1.5 rounded-full">
            <Text className="text-white text-sm font-medium">Guest</Text>
          </View>
        </View>

        {/* Location + Radius */}
        <View className="flex-row items-center justify-between mt-4">
          <Pressable className="flex-row items-center bg-white/20 px-3 py-2 rounded-full">
            <Ionicons name="location-outline" size={16} color="white" />
            <Text className="text-white text-sm ml-1 font-medium">
              {user?.location.city || "Oxon Hill"}, {user?.location.state || "MD"} (50mi)
            </Text>
            <Ionicons name="chevron-down" size={16} color="white" className="ml-1" />
          </Pressable>
          <Pressable 
            className="bg-white/20 px-3 py-2 rounded-full"
            onPress={() => {
              const order = [10, 25, 50];
              const curr = filters.radius || 50;
              const idx = order.indexOf(curr);
              const next = order[(idx + 1) % order.length];
              setFilters({ radius: next });
            }}
          >
            <Text className="text-white text-sm font-medium">{filters.radius || 50}mi</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Staggered Grid */}
      <StaggeredGrid
        data={reviews}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onReport={handleReport}
        onLike={handleLike}
        likedReviews={likedReviews}
      />

      {/* Report Modal */}
      {selectedReview && (
        <ReportModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReview(null);
          }}
          itemId={selectedReview.id}
          itemType="review"
          itemName={`Review of ${selectedReview.reviewedPersonName}`}
        />
      )}

      {/* Empty State */}
      {!isLoading && reviews.length === 0 && (
        <View className="absolute inset-0 items-center justify-center">
          <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
          <Text className="text-text-secondary text-xl font-medium mt-4">No reviews yet</Text>
          <Text className="text-text-muted text-center mt-2 px-8">
            Be the first to share your dating experience in your area
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}