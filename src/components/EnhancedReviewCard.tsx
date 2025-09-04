import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Review, MediaItem } from "../types";
import MediaGallery from "./MediaGallery";

interface Props {
  review: Review;
  onMediaPress: (media: MediaItem, index: number, reviewMedia: MediaItem[]) => void;
  onLike?: () => void;
  isLiked?: boolean;
}

export default function EnhancedReviewCard({ 
  review, 
  onMediaPress, 
  onLike, 
  isLiked = false 
}: Props) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  return (
    <View className="bg-surface-800 rounded-2xl p-6 mb-6 border border-border">
      {/* Header with reviewer info */}
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 bg-brand-red/20 rounded-full items-center justify-center mr-3">
          <Ionicons name="person" size={16} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="text-text-primary font-medium">Anonymous Reviewer</Text>
          <Text className="text-text-muted text-sm">
            {formatDate(review.createdAt)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={18} 
            color={isLiked ? "#FFFFFF" : "#9CA3AF"} 
          />
          <Text className="text-text-muted text-sm ml-1">
            {review.likeCount}
          </Text>
        </View>
      </View>

      {/* Flags */}
      {(review.greenFlags.length > 0 || review.redFlags.length > 0) && (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {review.greenFlags.map((flag) => (
            <View key={flag} className="bg-green-400/20 px-3 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
              <Text className="text-green-400 text-sm font-medium ml-1">
                {flag.replace("_", " ")}
              </Text>
            </View>
          ))}
          {review.redFlags.map((flag) => (
            <View key={flag} className="bg-brand-red/20 px-3 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="warning" size={12} color="#FFFFFF" />
              <Text className="text-brand-red text-sm font-medium ml-1">
                {flag.replace("_", " ")}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Review Text */}
      <Text className="text-text-primary text-base leading-6 mb-4">
        {review.reviewText}
      </Text>

      {/* Media Gallery */}
      {review.media && review.media.length > 0 && (
        <View className="mb-4">
          <MediaGallery
            media={review.media}
            onMediaPress={(media, mediaIndex) => 
              onMediaPress(media, mediaIndex, review.media!)
            }
            size={100}
          />
        </View>
      )}

      {/* Footer Actions */}
      <View className="flex-row items-center justify-between pt-4 border-t border-border">
        <View className="flex-row items-center space-x-4">
          <Pressable 
            onPress={onLike}
            className="flex-row items-center"
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={18} 
              color={isLiked ? "#FFFFFF" : "#9CA3AF"} 
            />
            <Text className="text-text-muted text-sm ml-1">
              {isLiked ? "Liked" : "Like"}
            </Text>
          </Pressable>
          
          <Pressable className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" />
            <Text className="text-text-muted text-sm ml-1">Reply</Text>
          </Pressable>
        </View>

        <Pressable>
          <Ionicons name="ellipsis-horizontal" size={18} color="#9CA3AF" />
        </Pressable>
      </View>
    </View>
  );
}