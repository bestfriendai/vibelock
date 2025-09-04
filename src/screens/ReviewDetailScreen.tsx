import React, { useState, useEffect } from "react";
import { View, Text, Pressable, RefreshControl, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  useAnimatedScrollHandler
} from "react-native-reanimated";
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
  const [dislikeCount, setDislikeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Animation values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const contentScale = useSharedValue(0.95);

  // Add mock media if review doesn't have any for demo purposes
  const reviewWithMedia = {
    ...review,
    media: review.media && review.media.length > 0 ? review.media : [
      {
        id: "demo_media_1",
        uri: review.profilePhoto || "https://picsum.photos/400/600?random=1",
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

  // Initialize loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      contentScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Scroll handler for header animations
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const opacity = interpolate(scrollY.value, [0, 100], [1, 0.8], 'clamp');
      headerOpacity.value = opacity;
    },
  });

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

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { 
      weekday: "long",
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  return (
    <View className="flex-1 bg-surface-900">
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0F" />
      
      {/* Header */}
      <Animated.View 
        style={[headerAnimatedStyle]}
        className="absolute top-0 left-0 right-0 z-10"
      >
        <LinearGradient
          colors={["rgba(11,11,15,0.95)", "rgba(11,11,15,0.8)", "transparent"]}
          className="pt-12 pb-4"
        >
          <SafeAreaView edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-2">
              <Pressable 
                onPress={() => navigation.goBack()}
                className="w-10 h-10 items-center justify-center rounded-full bg-surface-800/80"
              >
                <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
              </Pressable>
              
              <View className="flex-1 items-center">
                <Text className="text-text-primary text-lg font-semibold">Review</Text>
              </View>
              
              <Pressable 
                onPress={() => navigation.goBack()}
                className="px-4 py-2 rounded-full bg-brand-red/20"
              >
                <Text className="text-brand-red font-medium">Done</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView 
        style={[contentAnimatedStyle]}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#FF6B6B"
            colors={["#FF6B6B"]}
          />
        }
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 40 }}
      >
        {/* Loading State */}
        {isLoading && (
          <View className="items-center justify-center py-8">
            <View className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
          </View>
        )}

        {!isLoading && (
          <>
            {/* Hero Section */}
            <View className="px-6 mb-8">
              {/* Person Name */}
              <Text className="text-4xl font-bold text-text-primary mb-3">
                {review.reviewedPersonName}
              </Text>
              
              {/* Location & Time */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="location" size={16} color="#9CA3AF" />
                  <Text className="text-text-secondary ml-2 font-medium">
                    {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
                  </Text>
                </View>
                <Text className="text-text-muted text-sm">
                  {formatTimeAgo(review.createdAt)}
                </Text>
              </View>

              {/* Posted by */}
              <View className="flex-row items-center mb-6">
                <View className="w-6 h-6 rounded-full bg-surface-700 items-center justify-center mr-2">
                  <Ionicons name="person" size={12} color="#9CA3AF" />
                </View>
                <Text className="text-text-muted text-sm">
                  Posted by Anonymous User
                </Text>
              </View>
            </View>

            {/* Image Carousel */}
            {reviewWithMedia.media && reviewWithMedia.media.length > 0 && (
              <View className="mb-8">
                <ImageCarousel
                  media={reviewWithMedia.media}
                  height={320}
                  onImagePress={handleImagePress}
                  showCounter={true}
                  showFullScreenButton={true}
                />
              </View>
            )}

            {/* Review Content Card */}
            <View className="mx-4 bg-surface-800 rounded-2xl p-6 mb-6">
              {/* Review Text */}
              <View className="mb-6">
                <Text className="text-text-secondary text-sm font-medium mb-3 uppercase tracking-wide">
                  Review
                </Text>
                <ExpandableText
                  text={review.reviewText}
                  numberOfLines={4}
                  textStyle="text-text-primary text-base leading-7"
                  linkStyle="text-brand-red font-medium"
                  expandText="Read full story"
                  collapseText="Show less"
                />
              </View>

              {/* Flags Section */}
              {(review.greenFlags.length > 0 || review.redFlags.length > 0) && (
                <View className="mb-6">
                  <Text className="text-text-secondary text-sm font-medium mb-3 uppercase tracking-wide">
                    Highlights
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {review.greenFlags.map((flag) => (
                      <View key={flag} className="bg-green-500/20 border border-green-500/30 px-3 py-2 rounded-full flex-row items-center">
                        <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                        <Text className="text-green-400 text-sm font-medium ml-1">
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                    {review.redFlags.map((flag) => (
                      <View key={flag} className="bg-brand-red/20 border border-brand-red/30 px-3 py-2 rounded-full flex-row items-center">
                        <Ionicons name="warning" size={14} color="#FF6B6B" />
                        <Text className="text-brand-red text-sm font-medium ml-1">
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Divider */}
              <View className="h-px bg-surface-600 mb-6" />

              {/* Like/Dislike Buttons */}
              <View className="mb-4">
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
              <View className="items-center">
                <Text className="text-text-muted text-xs">
                  Posted on {formatDate(review.createdAt)}
                </Text>
              </View>
            </View>

            {/* Additional Actions */}
            <View className="px-6 mb-8">
              <View className="bg-surface-800 rounded-xl p-4">
                <Text className="text-text-secondary text-sm font-medium mb-3">
                  Found this review helpful?
                </Text>
                <View className="flex-row space-x-3">
                  <Pressable className="flex-1 bg-brand-red/20 border border-brand-red/30 rounded-lg py-3 items-center">
                    <Text className="text-brand-red font-medium">Share Review</Text>
                  </Pressable>
                  <Pressable className="flex-1 bg-surface-700 border border-surface-600 rounded-lg py-3 items-center">
                    <Text className="text-text-secondary font-medium">Report</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}
      </Animated.ScrollView>

      {/* Media Viewer Modal */}
      {reviewWithMedia.media && (
        <MediaViewer
          visible={showMediaViewer}
          media={reviewWithMedia.media}
          initialIndex={selectedMediaIndex}
          onClose={() => setShowMediaViewer(false)}
        />
      )}
    </View>
  );
}