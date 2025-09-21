import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { BrowseStackParamList, RootStackParamList, SearchStackParamList } from "../navigation/AppNavigator";
import ImageCarousel from "../components/ImageCarousel";
import LikeDislikeButtons from "../components/LikeDislikeButtons";
import ExpandableText from "../components/ExpandableText";
import MediaViewer from "../components/MediaViewer";
import CommentSection from "../components/CommentSection";
import CommentInput from "../components/CommentInput";
import { ReviewComment } from "../types";
import useReviewsStore from "../state/reviewsStore";
import useCommentsStore from "../state/commentsStore";
import useAuthStore from "../state/authStore";
import { supabaseReviews } from "../services/supabase";
import { Review } from "../types";

type ReviewDetailRouteProp =
  | RouteProp<BrowseStackParamList, "ReviewDetail">
  | RouteProp<SearchStackParamList, "ReviewDetail">
  | RouteProp<RootStackParamList, "ReviewDetail">;

export default function ReviewDetailScreen() {
  const route = useRoute<ReviewDetailRouteProp>();
  const navigation = useNavigation<any>();

  // Get route params and determine if we have a review or reviewId
  const routeParams = route.params as any;
  const hasDirectReview = !!routeParams.review;
  const reviewId = routeParams.reviewId;

  // Initialize review state - if we have a direct review, process it immediately
  const [review, setReview] = useState<Review | null>(() => {
    if (hasDirectReview) {
      const rawReview = routeParams.review;
      return {
        ...rawReview,
        createdAt: typeof rawReview.createdAt === "string" ? new Date(rawReview.createdAt) : rawReview.createdAt,
        updatedAt: typeof rawReview.updatedAt === "string" ? new Date(rawReview.updatedAt) : rawReview.updatedAt,
      };
    }
    return null;
  });

  const [reviewLoading, setReviewLoading] = useState(!hasDirectReview && !!reviewId);

  // All other state hooks
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => review?.likeCount || 0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyToComment, setReplyToComment] = useState<ReviewComment | null>(null);

  // Store hooks
  const {
    comments: commentsFromStore,
    isLoading: isLoadingComments,
    isPosting: isPostingComment,
    loadComments,
    createComment,
    likeComment,
    dislikeComment,
  } = useCommentsStore();

  const { likeReview, dislikeReview } = useReviewsStore();

  // Animation values
  const scrollY = useSharedValue(0);
  const contentScale = useSharedValue(0.95);

  // Load review data if we only have reviewId
  useEffect(() => {
    const loadReviewData = async () => {
      if (!hasDirectReview && reviewId) {
        // Only reviewId passed (from SearchScreen comments)
        try {
          setReviewLoading(true);
          const fetchedReview = await supabaseReviews.getReview(reviewId);
          if (fetchedReview) {
            setReview(fetchedReview);
            setLikeCount(fetchedReview.likeCount || 0);
          } else {
            // Review not found, navigate back
            navigation.goBack();
          }
        } catch (error) {
          console.warn("Error loading review:", error);
          navigation.goBack();
        } finally {
          setReviewLoading(false);
        }
      } else if (!hasDirectReview && !reviewId) {
        // Invalid navigation params
        navigation.goBack();
      }
    };

    loadReviewData();
  }, [hasDirectReview, reviewId, navigation]);

  // Get comments for this review (only access when review is available)
  const comments = review ? commentsFromStore[review.id] || [] : [];

  // Add mock media if review doesn't have any for demo purposes
  const reviewWithMedia = review
    ? {
        ...review,
        media:
          review.media && review.media.length > 0
            ? review.media
            : [
                {
                  id: "demo_media_1",
                  uri: review.profilePhoto || "https://picsum.photos/400/600?random=1",
                  type: "image" as const,
                  width: 400,
                  height: 600,
                },
                {
                  id: "demo_media_2",
                  uri: "https://picsum.photos/400/500?random=2",
                  type: "image" as const,
                  width: 400,
                  height: 500,
                },
              ],
      }
    : null;

  // Initialize loading state and load comments
  useEffect(() => {
    if (!review) return;

    const timer = setTimeout(() => {
      setIsLoading(false);
      contentScale.value = withSpring(1, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
        // clamp: false, // Removed as it's not supported in this version
      });

      // Load comments from Firebase
      loadComments(review.id);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review, loadComments]);

  // Scroll handler for animations - optimized for performance
  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    },
    [],
  );

  const handleLike = () => {
    if (!review) return;

    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount((prev: number) => Math.max(0, prev - 1));
    }

    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev: number) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount((prev: number) => prev + 1);
      likeReview(review.id);
    }
  };

  const handleDislike = () => {
    if (!review) return;

    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev: number) => Math.max(0, prev - 1));
    }

    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount((prev: number) => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikeCount((prev: number) => prev + 1);
      dislikeReview(review.id);
    }
  };

  const handleImagePress = (_media: any, index: number) => {
    setSelectedMediaIndex(index);
    setShowMediaViewer(true);
  };

  const handleRefresh = async () => {
    if (!review) return;

    setRefreshing(true);
    try {
      await loadComments(review.id);
    } catch (error) {
      console.warn("Error refreshing comments:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostComment = async (content: string) => {
    if (!review) return;

    try {
      await createComment(review.id, content);
      // Clear reply state after successful comment
      setReplyToComment(null);
    } catch (error) {
      console.warn("Error posting comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!review) return;

    try {
      await likeComment(review.id, commentId);
    } catch (error) {
      console.warn("Error liking comment:", error);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!review) return;

    try {
      await dislikeComment(review.id, commentId);
    } catch (error) {
      console.warn("Error disliking comment:", error);
    }
  };

  const handleReplyToComment = (comment: ReviewComment) => {
    setReplyToComment(comment);
  };

  const handleCancelReply = () => {
    setReplyToComment(null);
  };

  const handleReportComment = (commentId: string) => {
    // Handle comment reporting
    console.log("Report comment:", commentId);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View className="flex-1 bg-surface-900">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Main Content */}
      <Animated.ScrollView
        style={[contentAnimatedStyle]}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bounces={true}
        alwaysBounceVertical={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" colors={["#FFFFFF"]} />
        }
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
      >
        {/* Loading State */}
        {(isLoading || reviewLoading || !review) && (
          <View className="items-center justify-center py-8 flex-1">
            <View className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
            <Text className="text-text-primary mt-4">Loading...</Text>
          </View>
        )}

        {!isLoading && !reviewLoading && review && (
          <>
            {/* Hero Section */}
            <View className="px-6 mb-8">
              {/* Person Name */}
              <Text className="text-4xl font-bold text-text-primary mb-3">{review.reviewedPersonName}</Text>

              {/* Location & Time */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="location" size={16} color="#9CA3AF" />
                  <Text className="text-text-secondary ml-2 font-medium">
                    {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
                  </Text>
                </View>
                <Text className="text-text-muted text-sm">{formatTimeAgo(review.createdAt)}</Text>
              </View>

              {/* Posted by */}
              <View className="flex-row items-center mb-6">
                <View className="w-6 h-6 rounded-full bg-surface-700 items-center justify-center mr-2">
                  <Ionicons name="person" size={12} color="#9CA3AF" />
                </View>
                <Text className="text-text-muted text-sm">Posted by Anonymous User</Text>
              </View>
            </View>

            {/* Image Carousel */}
            {reviewWithMedia?.media && reviewWithMedia.media.length > 0 && (
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
                <Text className="text-text-secondary text-sm font-medium mb-3 uppercase tracking-wide">Review</Text>
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
                    {review.greenFlags.map((flag: string) => (
                      <View
                        key={flag}
                        className="bg-green-500/20 border border-green-500/30 px-3 py-2 rounded-full flex-row items-center"
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                        <Text className="text-green-400 text-sm font-medium ml-1">{flag.replace("_", " ")}</Text>
                      </View>
                    ))}
                    {review.redFlags.map((flag: string) => (
                      <View
                        key={flag}
                        className="bg-brand-red/20 border border-brand-red/30 px-3 py-2 rounded-full flex-row items-center"
                      >
                        <Ionicons name="warning" size={14} color="#FFFFFF" />
                        <Text className="text-brand-red text-sm font-medium ml-1">{flag.replace("_", " ")}</Text>
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
                <Text className="text-text-muted text-xs">Posted on {formatDate(review.createdAt)}</Text>
              </View>
            </View>

            {/* Additional Actions */}
            <View className="px-6 mb-8">
              <View className="bg-surface-800 rounded-xl p-4">
                <Text className="text-text-secondary text-sm font-medium mb-3">Found this review helpful?</Text>
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

            {/* Comments Section */}
            <View className="mx-4 mb-8">
              <CommentSection
                comments={comments}
                isLoading={isLoadingComments}
                onLikeComment={handleLikeComment}
                onDislikeComment={handleDislikeComment}
                onReplyToComment={handleReplyToComment}
                onReportComment={handleReportComment}
              />
            </View>
          </>
        )}
      </Animated.ScrollView>

      {/* Comment Input - Fixed at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View>
            <CommentInput
              onSubmit={handlePostComment}
              isLoading={isPostingComment}
              replyToComment={replyToComment?.authorName}
              onCancelReply={handleCancelReply}
              onSignInPress={() => navigation.navigate("SignIn")}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Media Viewer Modal */}
      {reviewWithMedia?.media && (
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
