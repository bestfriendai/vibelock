import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, InteractionManager } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BrowseStackParamList } from "../navigation/AppNavigator";
import { startTimer } from "../utils/performance";

import useReviewsStore from "../state/reviewsStore";
import useAuthStore from "../state/authStore";
import { useTheme } from "../providers/ThemeProvider";
import { locationService, LocationData } from "../services/locationService";

import StaggeredGrid from "../components/StaggeredGrid";
import ReportModal from "../components/ReportModal";
import SegmentedTabs from "../components/SegmentedTabs";
import LocationSelector from "../components/LocationSelector";
import DistanceFilter from "../components/DistanceFilter";
import EmptyState from "../components/EmptyState";
import { STRINGS } from "../constants/strings";
import { Review } from "../types";

type Props = NativeStackScreenProps<BrowseStackParamList, "Browse">;

export default function BrowseScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user, updateUserLocation } = useAuthStore();
  const { colors } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    user?.location
      ? {
          city: user.location.city,
          state: user.location.state || "",
          fullName: user.location.fullName || `${user.location.city}, ${user.location.state || ""}`,
          coordinates: user.location.coordinates,
          type: user.location.type,
          institutionType: user.location.institutionType,
        }
      : null,
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
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
    const loadAll = async () => {
      await loadReviews(true);
    };
    loadAll();
  }, [user?.location]);

  const onRefresh = async () => {
    setRefreshing(true);
    const done = startTimer("browse:pullToRefresh");
    try {
      await loadReviews(true);
    } finally {
      done();
    }
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={["bottom"]}>
      {/* Header with compact spacing and safe top padding */}
      <View
        className="px-6"
        style={{
          backgroundColor: colors.surface[800],
          paddingTop: Math.max(insets.top + 2, 2),
          paddingBottom: 8,
        }}
      >
        {/* Title only (logo and guest pill removed) */}
        <Text className="text-3xl font-extrabold" style={{ color: colors.text.primary }}>
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
                  if (result?.success && result?.location) {
                    setCurrentLocation(result.location);
                    await updateUserLocation({
                      city: result.location.city,
                      state: result.location.state,
                      coordinates: result.location.coordinates || undefined,
                      type: result.location.type || undefined,
                      fullName: result.location.fullName || `${result.location.city}, ${result.location.state}`,
                      institutionType: result.location.institutionType || undefined,
                    });
                  } else {
                    setLocationError(result.error || "Location detection failed");
                  }
                } catch (error) {
                  setLocationError("Failed to detect location");
                } finally {
                  setLocationLoading(false);
                }
              }}
              className="flex-row items-center"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Retry location detection"
              accessibilityHint="Double tap to detect your current location"
            >
              <Ionicons name="refresh" size={16} color={colors.brand.red} />
              <Text style={{ color: colors.brand.red }} className="text-sm ml-1">
                Retry location detection
              </Text>
            </Pressable>
          ) : (
            <LocationSelector
              key={`${currentLocation?.city}-${currentLocation?.state}`}
              currentLocation={
                currentLocation ||
                (user?.location
                  ? {
                      city: user.location.city,
                      state: user.location.state || "",
                      fullName: user.location.fullName || `${user.location.city}, ${user.location.state || ""}`,
                      coordinates: user.location.coordinates,
                    }
                  : {
                      city: "",
                      state: "",
                      fullName: "Detecting location...",
                      coordinates: undefined,
                    })
              }
              onLocationChange={async (location) => {
                if (__DEV__) {
                }
                try {
                  setCurrentLocation(location);

                  // Immediately reload reviews with new location (no waiting for auth store update)
                  await loadReviews(true, {
                    city: location?.city || user?.location?.city || "",
                    state: location?.state || "",
                    coordinates: location?.coordinates || undefined,
                  });

                  // Update user location in auth store (async, for persistence)
                  updateUserLocation({
                    city: location?.city || user?.location?.city || "",
                    state: location?.state || "",
                    coordinates: location?.coordinates || undefined,
                    type: location?.type || undefined,
                    fullName: location?.fullName || `${location?.city}, ${location?.state}`,
                    institutionType: location?.institutionType || undefined,
                  }).catch((error) => {
                    if (__DEV__) {
                    }
                  });

                  if (__DEV__) {
                  }
                } catch (error) {
                  if (__DEV__) {
                  }
                }
              }}
            />
          )}
          <DistanceFilter
            currentDistance={filters?.radius === undefined || filters?.radius === null ? -1 : filters.radius}
            onDistanceChange={(distance) => setFilters({ radius: distance === -1 ? null : distance })}
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
            value={filters?.category || "all"}
            onChange={(category) => setFilters({ category: category as "all" | "men" | "women" | "lgbtq+" })}
          />
        </View>
      </View>

      {/* Content Area */}
      {error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-red-400 text-xl font-medium mt-4 text-center">Error Loading Reviews</Text>
          <Text className="text-center mt-2" style={{ color: colors.text.secondary }}>
            {error}
          </Text>
          <Text className="text-center mt-2" style={{ color: colors.text.muted }}>
            Pull down to try again
          </Text>
        </View>
      ) : !isLoading && Array.isArray(reviews) && reviews.length === 0 ? (
        <EmptyState
          icon={STRINGS.EMPTY_STATES.BROWSE.icon}
          title={STRINGS.EMPTY_STATES.BROWSE.title}
          description={STRINGS.EMPTY_STATES.BROWSE.description}
          className="flex-1"
        />
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
