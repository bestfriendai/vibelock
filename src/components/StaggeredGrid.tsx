import React, { useMemo, memo } from "react";
import { View, RefreshControl, Text, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Review } from "../types";
import ProfileCard from "./ProfileCard";
import ProfileCardSkeleton from "./ProfileCardSkeleton";

// Memoized ProfileCard to prevent unnecessary re-renders
const MemoizedProfileCard = memo(ProfileCard);

interface Props {
  data?: Review[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onReport?: (review: Review) => void;
  onLike?: (review: Review) => void;
  likedReviews?: Set<string>;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 48) / 2; // Account for padding and gap

function StaggeredGrid({
  data,
  refreshing = false,
  onRefresh,
  onReport,
  onLike,
  likedReviews = new Set(),
  onEndReached,
  onEndReachedThreshold = 0.1,
}: Props) {
  // Calculate item heights for FlashList
  const itemsWithHeights = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((review, index) => {
      // Safety check: ensure review exists and has required properties
      if (!review || !review.id || !review.reviewText) {
        return { review, height: 280 }; // Default height for invalid reviews
      }

      // Calculate height based on text length and other factors
      const baseHeight = 280;
      const textLength = review.reviewText?.length || 0;

      // Add variation based on content
      let height = baseHeight;
      if (textLength > 80) height += 40;
      if (textLength > 120) height += 20;

      // Add some randomness for natural staggered look
      const randomVariation = (index % 3) * 20 - 20; // -20, 0, or 20
      height += randomVariation;

      // Ensure minimum and maximum heights
      height = Math.max(250, Math.min(height, 400));

      return { review, height };
    });
  }, [data]);

  // Render item function for FlashList
  const renderItem = ({ item, index }: { item: { review: Review; height: number }; index: number }) => {
    const { review, height } = item;

    return (
      <View
        style={{
          width: cardWidth,
          marginBottom: 16,
          marginRight: index % 2 === 0 ? 8 : 0,
          marginLeft: index % 2 === 1 ? 8 : 0,
        }}
      >
        <MemoizedProfileCard
          review={review}
          cardHeight={height}
          onReport={() => onReport?.(review)}
          onLike={() => onLike?.(review)}
          isLiked={likedReviews.has(review.id)}
        />
      </View>
    );
  };

  // Get item layout for FlashList optimization (currently unused but kept for future optimization)
  // const getItemLayout = (data: any, index: number) => {
  //   const item = itemsWithHeights[index];
  //   return {
  //     length: item?.height || 280,
  //     offset: 0, // FlashList will calculate this
  //     index,
  //   };
  // };

  // Skeleton loading component
  const renderSkeletonGrid = () => {
    const skeletonItems = Array.from({ length: 6 }, (_, index) => ({
      id: `skeleton-${index}`,
      height: 280 + (index % 3) * 40, // Varied heights for natural look
    }));

    return (
      <View className="flex-1 p-4">
        <View className="flex-row">
          <View className="flex-1 mr-2">
            {skeletonItems
              .filter((_, index) => index % 2 === 0)
              .map((item) => (
                <ProfileCardSkeleton key={item.id} cardHeight={item.height} />
              ))}
          </View>
          <View className="flex-1 ml-2">
            {skeletonItems
              .filter((_, index) => index % 2 === 1)
              .map((item) => (
                <ProfileCardSkeleton key={item.id} cardHeight={item.height} />
              ))}
          </View>
        </View>
      </View>
    );
  };

  // Empty state component
  const renderEmptyComponent = () => (
    <View className="flex-1 items-center justify-center p-16">
      <Text className="text-text-secondary text-lg text-center">
        {refreshing ? "Loading reviews..." : "No reviews found.\nPull down to refresh or try changing your filters."}
      </Text>
    </View>
  );

  // Show skeleton loading during initial load
  if (refreshing && (!data || data.length === 0)) {
    return renderSkeletonGrid();
  }

  // Early return for empty data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <View className="flex-1">
        <FlashList
          data={[]}
          renderItem={() => null}
          estimatedItemSize={280}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={["#FFFFFF"]} />
            ) : undefined
          }
          ListEmptyComponent={renderEmptyComponent}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={itemsWithHeights}
        renderItem={renderItem}
        numColumns={2}
        estimatedItemSize={280}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={["#FFFFFF"]} />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        ListEmptyComponent={renderEmptyComponent}
        // Add bottom spacing for floating button
        ListFooterComponent={() => <View className="h-20" />}
      />
    </View>
  );
}

export default memo(StaggeredGrid);
