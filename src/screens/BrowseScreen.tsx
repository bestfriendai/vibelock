import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import useReviewsStore from "../state/reviewsStore";
import useAuthStore from "../state/authStore";
import { useTheme } from "../providers/ThemeProvider";
import { locationService, LocationData } from "../services/locationService";

import StaggeredGrid from "../components/StaggeredGrid";
import ReportModal from "../components/ReportModal";
import SegmentedTabs from "../components/SegmentedTabs";
import LocationSelector from "../components/LocationSelector";
import DistanceFilter from "../components/DistanceFilter";
import { Review } from "../types";

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUserLocation } = useAuthStore();
  const { theme, colors, isDarkMode } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
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

  // Initialize location detection
  useEffect(() => {
    const initializeLocation = async () => {
      if (user?.location?.city && user?.location?.state) {
        // Use existing user location, preserving college information if available
        setCurrentLocation({
          city: user.location.city,
          state: user.location.state,
          fullName: user.location.fullName || `${user.location.city}, ${user.location.state}`,
          coordinates: user.location.coordinates,
          type: user.location.type,
          institutionType: user.location.institutionType,
        });
        return;
      }

      // Detect location if not available
      setLocationLoading(true);
      setLocationError(null);

      try {
        const result = await locationService.detectLocation();
        if (result.success && result.location) {
          setCurrentLocation(result.location);

          // Update user location in auth store
          await updateUserLocation({
            city: result.location.city,
            state: result.location.state,
            coordinates: result.location.coordinates,
            type: result.location.type,
            fullName: result.location.fullName,
            institutionType: result.location.institutionType,
          });

          console.log(`📍 Location detected via ${result.source}:`, result.location.fullName);
        } else {
          setLocationError(result.error || 'Location detection failed');
        }
      } catch (error) {
        console.error('Location initialization failed:', error);
        setLocationError('Failed to detect location');
      } finally {
        setLocationLoading(false);
      }
    };

    initializeLocation();
  }, [user?.location, updateUserLocation]);

  // Memoize the initial load function to prevent infinite re-renders
  const loadInitialData = useCallback(async () => {
    try {
      await loadReviews(true);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  }, [loadReviews]);

  useEffect(() => {
    // Only load if we don't have reviews already
    if (reviews.length === 0) {
      loadInitialData();
    }
  }, [reviews.length, loadInitialData]);

  // Memoize the filter-based load function
  const loadWithFilters = useCallback(async () => {
    try {
      await loadReviews(true);
    } catch (error) {
      console.error("Error loading reviews with filters:", error);
    }
  }, [loadReviews]);

  // Reload when filters change (category, radius) or user location changes
  useEffect(() => {
    loadWithFilters();
  }, [filters.category, filters.radius, user?.location.city, user?.location.state, loadWithFilters]);

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
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={['bottom']}
    >
      {/* Header with compact spacing and safe top padding */}
      <View
        className="px-6"
        style={{
          backgroundColor: colors.surface[800],
          paddingTop: Math.max(insets.top + 2, 2),
          paddingBottom: 8
        }}
      >
        {/* Title only (logo and guest pill removed) */}
        <Text
          className="text-3xl font-extrabold"
          style={{ color: colors.text.primary }}
        >
          Locker Room Talk
        </Text>

        {/* Location + Radius */}
        <View className="flex-row items-center justify-between mt-3">
          {locationLoading ? (
            <View className="flex-row items-center">
              <View className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin mr-2" />
              <Text style={{ color: colors.text.secondary }} className="text-sm">
                Detecting location...
              </Text>
            </View>
          ) : locationError ? (
            <Pressable
              onPress={async () => {
                setLocationLoading(true);
                setLocationError(null);
                try {
                  const result = await locationService.detectLocation();
                  if (result.success && result.location) {
                    setCurrentLocation(result.location);
                    await updateUserLocation({
                      city: result.location.city,
                      state: result.location.state,
                      coordinates: result.location.coordinates,
                      type: result.location.type,
                      fullName: result.location.fullName,
                      institutionType: result.location.institutionType,
                    });
                  } else {
                    setLocationError(result.error || 'Location detection failed');
                  }
                } catch (error) {
                  setLocationError('Failed to detect location');
                } finally {
                  setLocationLoading(false);
                }
              }}
              className="flex-row items-center"
            >
              <Ionicons name="refresh" size={16} color={colors.brand.red} />
              <Text style={{ color: colors.brand.red }} className="text-sm ml-1">
                Retry location detection
              </Text>
            </Pressable>
          ) : (
            <LocationSelector
              key={`${currentLocation?.city}-${currentLocation?.state}`}
              currentLocation={currentLocation || {
                city: "Unknown",
                state: "",
                fullName: "Location unavailable",
                coordinates: undefined,
              }}
              onLocationChange={async (location) => {
                console.log('🌍 Location change requested:', location);
                try {
                  setCurrentLocation(location);

                  // Immediately reload reviews with new location (no waiting for auth store update)
                  await loadReviews(true, {
                    city: location.city,
                    state: location.state,
                    coordinates: location.coordinates,
                  });

                  // Update user location in auth store (async, for persistence)
                  updateUserLocation({
                    city: location.city,
                    state: location.state,
                    coordinates: location.coordinates,
                    type: location.type,
                    fullName: location.fullName,
                    institutionType: location.institutionType,
                  }).catch((error) => {
                    console.error('❌ Failed to update user location in auth store:', error);
                  });

                  console.log('✅ Location updated and reviews reloaded');
                } catch (error) {
                  console.error('❌ Failed to update location:', error);
                }
              }}
            />
          )}
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
          <Text className="text-center mt-2" style={{ color: colors.text.secondary }}>{error}</Text>
          <Text className="text-center mt-2" style={{ color: colors.text.muted }}>Pull down to try again</Text>
        </View>
      ) : !isLoading && Array.isArray(reviews) && reviews.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-medium mt-4" style={{ color: colors.text.secondary }}>No reviews yet</Text>
          <Text className="text-center mt-2 px-8" style={{ color: colors.text.muted }}>
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
