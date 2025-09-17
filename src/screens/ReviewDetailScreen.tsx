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
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import type {
  ReviewDetailRouteProp,
  BrowseStackReviewDetailRouteProp,
  SearchStackReviewDetailRouteProp,
  RootStackNavigationProp
} from "../navigation/AppNavigator";
import ImageCarousel from "../components/ImageCarousel";
import LikeDislikeButtons from "../components/LikeDislikeButtons";
import ExpandableText from "../components/ExpandableText";
import MediaViewer from "../components/MediaViewer";
import CommentSection from "../components/CommentSection";
import CommentInput from "../components/CommentInput";
import ReportModal from "../components/ReportModal";
import { Comment as ReviewComment } from "../types";
import useReviewsStore from "../state/reviewsStore";
import useCommentsStore from "../state/commentsStore";
import useAuthStore from "../state/authStore";
import { reviewsService } from "../services/reviews";
import { Review } from "../types";
import { useTheme } from "../providers/ThemeProvider";

// Union type to handle multiple navigation sources
type CombinedReviewDetailRouteProp =
  | ReviewDetailRouteProp
  | BrowseStackReviewDetailRouteProp
  | SearchStackReviewDetailRouteProp;

export default function ReviewDetailScreen() {
  const route = useRoute<CombinedReviewDetailRouteProp>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { colors, isDarkMode } = useTheme();

  // Get route params
  const routeParams = route.params as any;

  // All hooks declared at the top level - no conditional hooks
  const [review, setReview] = useState<Review | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyToComment, setReplyToComment] = useState<ReviewComment | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

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

  // Load review data
  useEffect(() => {
    const loadReview = async () => {
      try {
        setReviewLoading(true);
        const params = route.params as any;
        let finalReview = null;

        if (params?.review) {
          const raw = params.review;
          finalReview = {
            ...raw,
            createdAt: new Date(raw.createdAt),
            updatedAt: new Date(raw.updatedAt),
          };
        } else if (params?.reviewId) {
          finalReview = await reviewsService.getReview(params.reviewId);
        }

        if (finalReview) {
          setReview(finalReview);
          setLikeCount(finalReview.likeCount || 0);
        } else {
          Alert.alert("Review not found", "This review may have been deleted.", [
            {
              text: "OK",
              onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs")),
            },
          ]);
        }
      } catch (error) {
        console.warn("Error loading review:", error);
        Alert.alert("Error", "Failed to load review.", [
          {
            text: "OK",
            onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs")),
          },
        ]);
      } finally {
        setReviewLoading(false);
      }
    };

    loadReview();
  }, [route.params, navigation]);

  // Get comments for this review (only access when review is available)
  const comments = review ? commentsFromStore[review.id] || [] : [];

  // Use the review data as-is from the database
  const reviewWithMedia = React.useMemo(() => {
    if (!review) return null;

    // Filter to only valid remote media (avoid legacy file:// URIs)
    const cleanedMedia = Array.isArray(review.media)
      ? review.media.filter((m) => typeof m?.uri === "string" && /^https?:\/\//.test(m.uri))
      : [];

    if (cleanedMedia.length > 0) {
      return { ...review, media: cleanedMedia } as Review;
    }

    // If no valid media, fall back to profilePhoto as a single media item
    if (review.profilePhoto) {
      return {
        ...review,
        media: [
          {
            id: `${review.id}_profile_photo`,
            uri: review.profilePhoto,
            type: "image" as const,
          },
        ],
      } as Review;
    }

    return review;
  }, [review]);

  // Initialize loading state and load comments
  useEffect(() => {
    if (!review) return;

    const timer = setTimeout(() => {
      setIsLoading(false);
      contentScale.value = withSpring(1, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      });

      // Load comments from Firebase
      loadComments(review.id);
    }, 200);
    return () => clearTimeout(timer);
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

  const handleReportReview = () => {
    setShowReportModal(true);
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
    <View className={`flex-1 ${isDarkMode ? "dark" : ""}`} style={{ backgroundColor: colors.surface[900] }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.surface[900]} />

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.primary}
            colors={[colors.text.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
      >
        {/* Loading State */}
        {reviewLoading && (
          <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.surface[900] }}>
            <ActivityIndicator size="large" color={colors.brand.red} />
            <Text className="mt-4" style={{ color: colors.text.primary }}>
              Loading Review...
            </Text>
          </View>
        )}

        {/* Review not available state */}
        {!reviewLoading && !review && (
          <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.surface[900] }}>
            <Text style={{ color: colors.text.secondary }}>Review not available.</Text>
          </View>
        )}

        {!reviewLoading && review && (
          <>
            {/* Hero Section */}
            <View className="px-6 mb-8">
              {/* Person Name */}
              <Text className="text-4xl font-bold mb-3" style={{ color: colors.text.primary }}>
                {review.reviewedPersonName}
              </Text>

              {/* Location & Time */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="location" size={16} color={colors.text.secondary} />
                  <Text className="ml-2 font-medium" style={{ color: colors.text.secondary }}>
                    {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
                  </Text>
                </View>
                <Text className="text-sm" style={{ color: colors.text.muted }}>
                  {formatTimeAgo(review.createdAt)}
                </Text>
              </View>

              {/* Posted by */}
              <View className="flex-row items-center mb-6">
                <View
                  className="w-6 h-6 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: colors.surface[700] }}
                >
                  <Ionicons name="person" size={12} color={colors.text.secondary} />
                </View>
                <Text className="text-sm" style={{ color: colors.text.muted }}>
                  Posted by Anonymous User
                </Text>
              </View>
            </View>

            {/* Image Carousel */}
            {reviewWithMedia && reviewWithMedia.media && reviewWithMedia.media.length > 0 && (
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
            <View className="mx-4 rounded-2xl p-6 mb-6" style={{ backgroundColor: colors.surface[800] }}>
              {/* Review Text */}
              <View className="mb-6">
                <Text
                  className="text-sm font-medium mb-3 uppercase tracking-wide"
                  style={{ color: colors.text.secondary }}
                >
                  Review
                </Text>
                <ExpandableText
                  text={review.reviewText}
                  numberOfLines={4}
                  expandText="Read full story"
                  collapseText="Show less"
                />
              </View>

              {/* Flags Section */}
              {(review.greenFlags.length > 0 || review.redFlags.length > 0) && (
                <View className="mb-6">
                  <Text
                    className="text-sm font-medium mb-3 uppercase tracking-wide"
                    style={{ color: colors.text.secondary }}
                  >
                    Highlights
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {review.greenFlags.map((flag: string) => (
                      <View
                        key={flag}
                        className="px-3 py-2 rounded-full flex-row items-center"
                        style={{
                          backgroundColor: colors.accent.green + "20",
                          borderWidth: 1,
                          borderColor: colors.accent.green + "30",
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={14} color={colors.accent.green} />
                        <Text className="text-sm font-medium ml-1" style={{ color: colors.accent.green }}>
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                    {review.redFlags.map((flag: string) => (
                      <View
                        key={flag}
                        className="px-3 py-2 rounded-full flex-row items-center"
                        style={{
                          backgroundColor: colors.brand.red + "20",
                          borderWidth: 1,
                          borderColor: colors.brand.red + "30",
                        }}
                      >
                        <Ionicons name="warning" size={14} color={colors.brand.red} />
                        <Text className="text-sm font-medium ml-1" style={{ color: colors.brand.red }}>
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Divider */}
              <View className="h-px mb-6" style={{ backgroundColor: colors.surface[600] }} />

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
                <Text className="text-xs" style={{ color: colors.text.muted }}>
                  Posted on {formatDate(review.createdAt)}
                </Text>
              </View>
            </View>

            {/* Additional Actions */}
            <View className="px-6 mb-8">
              <View className="rounded-xl p-4" style={{ backgroundColor: colors.surface[800] }}>
                <Text className="text-sm font-medium mb-3" style={{ color: colors.text.secondary }}>
                  Found this review helpful?
                </Text>
                <View className="flex-row space-x-3">
                  <Pressable
                    className="flex-1 rounded-lg py-3 items-center"
                    style={{
                      backgroundColor: colors.brand.red + "20",
                      borderWidth: 1,
                      borderColor: colors.brand.red + "30",
                    }}
                  >
                    <Text className="font-medium" style={{ color: colors.brand.red }}>
                      Share Review
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 rounded-lg py-3 items-center"
                    style={{
                      backgroundColor: colors.surface[700],
                      borderWidth: 1,
                      borderColor: colors.surface[600],
                    }}
                    onPress={handleReportReview}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Report this review"
                    accessibilityHint="Double tap to report"
                  >
                    <Text className="font-medium" style={{ color: colors.text.secondary }}>
                      Report
                    </Text>
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
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
      {reviewWithMedia && reviewWithMedia.media && (
        <MediaViewer
          visible={showMediaViewer}
          media={reviewWithMedia.media}
          initialIndex={selectedMediaIndex}
          onClose={() => setShowMediaViewer(false)}
        />
      )}

      {/* Report Modal */}
      {review && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          itemId={review.id}
          itemType="review"
          itemName={`Review of ${review.reviewedPersonName}`}
        />
      )}
    </View>
  );
}
