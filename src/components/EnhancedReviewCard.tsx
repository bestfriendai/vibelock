import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Review, MediaItem } from "../types";
import MediaGallery from "./MediaGallery";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  review: Review;
  onMediaPress: (media: MediaItem, index: number, reviewMedia: MediaItem[]) => void;
  onLike?: () => void;
  isLiked?: boolean;
}

const EnhancedReviewCard = memo(
  function EnhancedReviewCard({ review, onMediaPress, onLike, isLiked = false }: Props) {
    const { colors } = useTheme();

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    return (
      <View
        className="rounded-2xl p-6 mb-6 border"
        style={{
          backgroundColor: colors.surface[800],
          borderColor: colors.border,
        }}
      >
        {/* Header with reviewer info */}
        <View className="flex-row items-center mb-4">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: colors.brand.red + "20" }}
          >
            <Ionicons name="person" size={16} color={colors.text.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-medium" style={{ color: colors.text.primary }}>
              Anonymous Reviewer
            </Text>
            <Text className="text-sm" style={{ color: colors.text.muted }}>
              {formatDate(review.createdAt)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? colors.brand.red : colors.text.muted}
            />
            <Text className="text-sm ml-1" style={{ color: colors.text.muted }}>
              {review.likeCount}
            </Text>
          </View>
        </View>

        {/* Review Text */}
        <Text className="text-base leading-6 mb-4" style={{ color: colors.text.primary }}>
          {review.reviewText}
        </Text>

        {/* Media Gallery */}
        {review.media && review.media.length > 0 && (
          <View className="mb-4">
            <MediaGallery
              media={review.media}
              onMediaPress={(media, mediaIndex) => onMediaPress(media, mediaIndex, review.media!)}
              size={100}
            />
          </View>
        )}

        {/* Footer Actions */}
        <View className="flex-row items-center justify-between pt-4 border-t" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center space-x-4">
            <Pressable onPress={onLike} className="flex-row items-center">
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={18}
                color={isLiked ? colors.brand.red : colors.text.muted}
              />
              <Text className="text-sm ml-1" style={{ color: colors.text.muted }}>
                {isLiked ? "Liked" : "Like"}
              </Text>
            </Pressable>

            <Pressable className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={18} color={colors.text.muted} />
              <Text className="text-sm ml-1" style={{ color: colors.text.muted }}>
                Reply
              </Text>
            </Pressable>
          </View>

          <Pressable>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.muted} />
          </Pressable>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.review.id === nextProps.review.id &&
      prevProps.isLiked === nextProps.isLiked &&
      prevProps.review.likeCount === nextProps.review.likeCount &&
      prevProps.review.reviewText === nextProps.review.reviewText &&
      prevProps.review.media?.length === nextProps.review.media?.length
    );
  },
);

export default EnhancedReviewCard;
