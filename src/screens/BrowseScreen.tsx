import React, { useEffect, useState } from "react";
import {
  View,
  Text
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import useReviewsStore from "../state/reviewsStore";
import useAuthStore from "../state/authStore";

import StaggeredGrid from "../components/StaggeredGrid";
import ReportModal from "../components/ReportModal";
import SegmentedTabs from "../components/SegmentedTabs";
import LocationSelector from "../components/LocationSelector";
import DistanceFilter from "../components/DistanceFilter";
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

  // Reload when filters change (category, radius)
  useEffect(() => {
    loadReviews(true);
  }, [filters.category, filters.radius]);

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
      {/* Header with Black Background */}
      <View className="bg-black px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-surface-700 items-center justify-center mr-3">
              <Text className="text-text-primary text-lg font-bold">LRT</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary">Locker Room Talk</Text>
          </View>
          <View className="bg-surface-700 px-3 py-1.5 rounded-full">
            <Text className="text-text-primary text-sm font-medium">Guest</Text>
          </View>
        </View>

        {/* Location + Radius */}
        <View className="flex-row items-center justify-between mt-4">
          <LocationSelector
            currentLocation={{
              city: user?.location.city || "Washington",
              state: user?.location.state || "DC",
              fullName: `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`
            }}
            onLocationChange={(location) => {
              // Update user location in auth store
              const { updateUserLocation } = useAuthStore.getState();
              updateUserLocation({
                city: location.city,
                state: location.state
              });
            }}
          />
          <DistanceFilter
            currentDistance={filters.radius || 50}
            onDistanceChange={(distance) => setFilters({ radius: distance === -1 ? undefined : distance })}
          />
        </View>

        {/* Category Filter Tabs */}
        <View className="mt-4">
          <SegmentedTabs
            tabs={[
              { key: "all", label: "All" },
              { key: "men", label: "Men" },
              { key: "women", label: "Women" },
              { key: "lgbtq+", label: "LGBTQ+" }
            ]}
            value={filters.category}
            onChange={(category) => setFilters({ category: category as "all" | "men" | "women" | "lgbtq+" })}
          />
        </View>
      </View>

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