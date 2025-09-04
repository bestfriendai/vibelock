import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { RootStackParamList } from "../navigation/AppNavigator";
import ImageCarousel from "../components/ImageCarousel";
import LikeDislikeButtons from "../components/LikeDislikeButtons";
import ExpandableText from "../components/ExpandableText";
import MediaViewer from "../components/MediaViewer";
import useReviewsStore from "../state/reviewsStore";

type ReviewDetailRouteProp = RouteProp<RootStackParamList, "ReviewDetail">;

export default function ReviewDetailScreen() {
  const route = useRoute<ReviewDetailRouteProp>();
  const navigation = useNavigation();
  const { review } = route.params;
  
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likeCount);
  const [dislikeCount, setDislikeCount] = useState(0); // Assuming 0 for now

  // Add mock media if review doesn't have any for demo purposes
  const reviewWithMedia = {
    ...review,
    media: review.media && review.media.length > 0 ? review.media : [
      {
        id: "demo_media_1",
        uri: "https://picsum.photos/400/600?random=1",
        type: "image" as const,
        width: 400,
        height: 600
      },
      {
        id: "demo_media_2",
        uri: "https://picsum.photos/400/500?random=2", 
        type: "image" as const,
        width: 400,
        height: 500
      }
    ]
  };

  const { likeReview, dislikeReview } = useReviewsStore();

  const handleLike = () => {
    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount(prev => Math.max(0, prev - 1));
    }
    
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      likeReview(review.id);
    }
  };

  const handleDislike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    }
    
    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikeCount(prev => prev + 1);
      dislikeReview(review.id);
    }
  };

  const handleImagePress = (_media: any, index: number) => {
    setSelectedMediaIndex(index);
    setShowMediaViewer(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { 
      weekday: "long",
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  return (
    <SafeAreaView className="flex-1">
      {/* Coral Header Background */}
      <LinearGradient
        colors={["#FF6B6B", "#E85757"]}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-lg font-semibold">Locker Room Talk</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text className="text-white font-medium">Done</Text>
          </Pressable>
        </View>

        {/* Content Container */}
        <View className="flex-1 px-4 pb-4">
          {/* White Content Card */}
          <View className="bg-white rounded-3xl flex-1 overflow-hidden">
            <ScrollView 
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Card Header */}
              <View className="px-6 pt-6 pb-4">
                {/* Day of Week */}
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  {formatDate(review.createdAt).split(",")[0]}
                </Text>
                
                {/* Location */}
                <View className="flex-row items-center mb-3">
                  <Ionicons name="location" size={16} color="#9CA3AF" />
                  <Text className="text-gray-600 ml-1">
                    {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
                  </Text>
                </View>

                {/* Posted by */}
                <View className="flex-row items-center mb-4">
                  <Ionicons name="person" size={16} color="#9CA3AF" />
                  <Text className="text-gray-500 ml-1 text-sm">
                    Posted by Anonymous User
                  </Text>
                </View>
              </View>

              {/* Image Carousel */}
              {reviewWithMedia.media && reviewWithMedia.media.length > 0 && (
                <View className="px-4 mb-6">
                  <ImageCarousel
                    media={reviewWithMedia.media}
                    height={280}
                    onImagePress={handleImagePress}
                    showCounter={true}
                    showFullScreenButton={true}
                  />
                </View>
              )}

              {/* Person Name */}
              <View className="px-6 mb-4">
                <Text className="text-3xl font-bold text-gray-900">
                  {review.reviewedPersonName}
                </Text>
              </View>

              {/* Review Text */}
              <View className="px-6 mb-6">
                <ExpandableText
                  text={review.reviewText}
                  numberOfLines={4}
                  textStyle="text-gray-700 text-base leading-6"
                  linkStyle="text-brand-red font-medium"
                  expandText="Read full story"
                  collapseText="Show less"
                />
              </View>

              {/* Flags */}
              {(review.greenFlags.length > 0 || review.redFlags.length > 0) && (
                <View className="px-6 mb-6">
                  <View className="flex-row flex-wrap gap-2">
                    {review.greenFlags.map((flag) => (
                      <View key={flag} className="bg-green-100 px-3 py-2 rounded-full">
                        <Text className="text-green-700 text-sm font-medium">
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                    {review.redFlags.map((flag) => (
                      <View key={flag} className="bg-red-100 px-3 py-2 rounded-full">
                        <Text className="text-red-700 text-sm font-medium">
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Like/Dislike Buttons */}
              <View className="px-6 mb-6">
                <LikeDislikeButtons
                  onLike={handleLike}
                  onDislike={handleDislike}
                  isLiked={isLiked}
                  isDisliked={isDisliked}
                  likeCount={likeCount}
                  dislikeCount={dislikeCount}
                />
              </View>

              {/* Review Date */}
              <View className="px-6">
                <Text className="text-gray-400 text-sm text-center">
                  Posted on {formatDate(review.createdAt)}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </LinearGradient>

      {/* Media Viewer Modal */}
      {reviewWithMedia.media && (
        <MediaViewer
          visible={showMediaViewer}
          media={reviewWithMedia.media}
          initialIndex={selectedMediaIndex}
          onClose={() => setShowMediaViewer(false)}
        />
      )}
    </SafeAreaView>
  );
}