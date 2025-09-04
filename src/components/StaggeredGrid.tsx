import React, { useMemo, memo } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { Review } from "../types";
import ProfileCard from "./ProfileCard";

// Memoized ProfileCard to prevent unnecessary re-renders
const MemoizedProfileCard = memo(ProfileCard);

interface Props {
  data: Review[];
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
    
    data.forEach((review, index) => {
      // Calculate height based on text length and other factors
      const baseHeight = 280;
      const textLength = review.reviewText.length;
      const flagsCount = review.greenFlags.length + review.redFlags.length;
      
      // Add variation based on content
      let height = baseHeight;
      if (textLength > 80) height += 40;
      if (textLength > 120) height += 20;
      if (flagsCount > 2) height += 20;
      
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
            tintColor="#FF6B6B"
            colors={["#FF6B6B"]}
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