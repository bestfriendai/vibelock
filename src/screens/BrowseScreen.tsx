import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const { user, updateUserLocation } = useAuthStore();
  const {
    reviews = [], // Provide default empty array
    isLoading = false,
    filters = { category: "all", radius: 50, sortBy: "recent" }, // Provide default filters
    loadReviews,
    setFilters,
    likeReview,
    error,
  } = useReviewsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [likedReviews, setLikedReviews] = useState(new Set<string>());

  useEffect(() => {
    // Only load if we don't have reviews already
    if (reviews.length === 0) {
      const loadData = async () => {
        try {
          await loadReviews(true);
        } catch (error) {
          console.error("Error loading reviews:", error);
        }
      };
      loadData();
    }
  }, [loadReviews, reviews.length]);

  // Reload when filters change (category, radius) or user location changes
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadReviews(true);
      } catch (error) {
        console.error("Error loading reviews with filters:", error);
      }
    };
    loadData();
  }, [filters.category, filters.radius, user?.location.city, user?.location.state, loadReviews]);

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
    <SafeAreaView className="flex-1 bg-surface-900" edges={['bottom']}>
      {/* Header with compact spacing and safe top padding */}
      <View
        className="bg-black px-6"
        style={{ paddingTop: Math.max(insets.top + 2, 2), paddingBottom: 8 }}
      >
        {/* Title only (logo and guest pill removed) */}
        <Text className="text-3xl font-extrabold text-text-primary">Locker Room Talk</Text>

        {/* Location + Radius */}
        <View className="flex-row items-center justify-between mt-3">
          <LocationSelector
            key={`${user?.location.city}-${user?.location.state}`}
            currentLocation={{
              city: user?.location.city || "Washington",
              state: user?.location.state || "DC",
              fullName: `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`,
              coordinates: user?.location.coordinates,
            }}
            onLocationChange={async (location) => {
              console.log('🌍 Location change requested:', location);
              try {
                // Update user location in auth store
                await updateUserLocation({
                  city: location.city,
                  state: location.state,
                  coordinates: location.coordinates,
                });
                console.log('✅ Location updated successfully');

                // Reload reviews with new location
                loadReviews(true);
              } catch (error) {
                console.error('❌ Failed to update location:', error);
              }
            }}
          />
          <DistanceFilter
            currentDistance={filters.radius || 50}
            onDistanceChange={(distance) => setFilters({ radius: distance === -1 ? undefined : distance })}
          />
        </View>

        {/* Category Filter Tabs */}
        <View className="mt-3 pb-1">
          <SegmentedTabs
            tabs={[
              { key: "all", label: "All" },
              { key: "men", label: "Men" },
              { key: "women", label: "Women" },
              { key: "lgbtq+", label: "LGBTQ+" },
            ]}
            value={filters.category}
            onChange={(category) => setFilters({ category: category as "all" | "men" | "women" | "lgbtq+" })}
          />
        </View>
      </View>

      {/* Content Area */}
      {error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-red-400 text-xl font-medium mt-4 text-center">Error Loading Reviews</Text>
          <Text className="text-text-secondary text-center mt-2">{error}</Text>
          <Text className="text-text-muted text-center mt-2">Pull down to try again</Text>
        </View>
      ) : !isLoading && Array.isArray(reviews) && reviews.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
          <Text className="text-text-secondary text-xl font-medium mt-4">No reviews yet</Text>
          <Text className="text-text-muted text-center mt-2 px-8">
            Be the first to share your dating experience in your area
          </Text>
        </View>
      ) : (
        <StaggeredGrid
          data={reviews}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onReport={handleReport}
          onLike={handleLike}
          likedReviews={likedReviews}
        />
      )}

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
    </SafeAreaView>
  );
}
