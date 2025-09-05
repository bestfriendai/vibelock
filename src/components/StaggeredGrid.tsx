import React, { useMemo, memo } from "react";
import { ScrollView, View, RefreshControl, Text } from "react-native";
import { Review } from "../types";
import ProfileCard from "./ProfileCard";

// Memoized ProfileCard to prevent unnecessary re-renders
const MemoizedProfileCard = memo(ProfileCard);

interface Props {
  data?: Review[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onReport?: (review: Review) => void;
  onLike?: (review: Review) => void;
  likedReviews?: Set<string>;
}

function StaggeredGrid({ 
  data, 
  refreshing = false, 
  onRefresh, 
  onReport,
  onLike,
  likedReviews = new Set()
}: Props) {
  // Calculate card heights based on content length and create two columns
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: Array<{ review: Review; height: number }> = [];
    const right: Array<{ review: Review; height: number }> = [];
    
    // Safety check: ensure data exists and is an array
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { leftColumn: left, rightColumn: right };
    }
    
    data.forEach((review, index) => {
      // Safety check: ensure review exists and has required properties
      if (!review || !review.id || !review.reviewText) {
        return; // Skip invalid reviews
      }
      // Calculate height based on text length and other factors
      const baseHeight = 280;
      const textLength = review.reviewText.length;
      
      // Add variation based on content
      let height = baseHeight;
      if (textLength > 80) height += 40;
      if (textLength > 120) height += 20;
      
      // Add some randomness for natural staggered look
      const randomVariation = (index % 3) * 20 - 20; // -20, 0, or 20
      height += randomVariation;
      
      // Ensure minimum and maximum heights
      height = Math.max(250, Math.min(height, 400));
      
      // Distribute to columns to balance heights
      const leftHeight = left.reduce((sum, item) => sum + item.height, 0);
      const rightHeight = right.reduce((sum, item) => sum + item.height, 0);
      
      if (leftHeight <= rightHeight) {
        left.push({ review, height });
      } else {
        right.push({ review, height });
      }
    });
    
    return { leftColumn: left, rightColumn: right };
  }, [data]);

  // Early return for empty data
  if (!data || !Array.isArray(data)) {
    return (
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, flex: 1, justifyContent: 'center', alignItems: 'center' }}
        refreshControl={
          onRefresh ? (
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
            />
          ) : undefined
        }
      >
        <Text className="text-text-secondary text-lg text-center">
          {refreshing ? 'Loading reviews...' : 'No reviews available'}
        </Text>
      </ScrollView>
    );
  }

  if (data.length === 0) {
    return (
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, flex: 1, justifyContent: 'center', alignItems: 'center' }}
        refreshControl={
          onRefresh ? (
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
            />
          ) : undefined
        }
      >
        <Text className="text-text-secondary text-lg text-center">
          {refreshing ? 'Loading reviews...' : 'No reviews found.\nPull down to refresh or try changing your filters.'}
        </Text>
      </ScrollView>
    );
  }

  const renderColumn = (column: Array<{ review: Review; height: number }>, isLeft: boolean) => (
    <View className={`flex-1 ${isLeft ? 'mr-2' : 'ml-2'}`}>
      {column.map(({ review, height }) => (
        <MemoizedProfileCard
          key={review.id}
          review={review}
          cardHeight={height}
          onReport={() => onReport?.(review)}
          onLike={() => onLike?.(review)}
          isLiked={likedReviews.has(review.id)}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
          />
        ) : undefined
      }
    >
      <View className="flex-row">
        {renderColumn(leftColumn, true)}
        {renderColumn(rightColumn, false)}
      </View>
      
      {/* Bottom spacing for floating button */}
      <View className="h-20" />
    </ScrollView>
  );
}

export default memo(StaggeredGrid);