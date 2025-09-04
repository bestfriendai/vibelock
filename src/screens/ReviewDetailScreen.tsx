import React, { useState, useEffect } from "react";
import { View, Text, Pressable, RefreshControl, StatusBar, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  useAnimatedScrollHandler
} from "react-native-reanimated";
import { BrowseStackParamList, RootStackParamList, SearchStackParamList } from "../navigation/AppNavigator";
import ImageCarousel from "../components/ImageCarousel";
import LikeDislikeButtons from "../components/LikeDislikeButtons";
import ExpandableText from "../components/ExpandableText";
import MediaViewer from "../components/MediaViewer";
import CommentSection from "../components/CommentSection";
import CommentInput from "../components/CommentInput";
import useReviewsStore from "../state/reviewsStore";
import { Comment } from "../types";

type ReviewDetailRouteProp = 
  | RouteProp<BrowseStackParamList, "ReviewDetail">
  | RouteProp<SearchStackParamList, "ReviewDetail">
  | RouteProp<RootStackParamList, "ReviewDetail">;

export default function ReviewDetailScreen() {
  const route = useRoute<ReviewDetailRouteProp>();
  const { review } = route.params;
  
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likeCount);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Comment state
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);

  // Animation values
  const scrollY = useSharedValue(0);
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

  // Initialize loading state and mock comments
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      contentScale.value = withSpring(1, { 
        damping: 20, 
        stiffness: 200,
        mass: 0.8,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01
      });
      
      // Load mock comments
      loadMockComments();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const loadMockComments = () => {
    setIsLoadingComments(true);
    
    // Mock comment data
    const mockComments: Comment[] = [
      {
        id: "comment_1",
        reviewId: review.id,
        authorId: "user_1",
        authorName: "Anonymous User",
        content: "This is really helpful, thanks for sharing your experience!",
        likeCount: 5,
        dislikeCount: 0,
        isLiked: false,
        isDisliked: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        replies: [
          {
            id: "reply_1",
            reviewId: review.id,
            authorId: "user_2",
            authorName: "Another User",
            content: "I agree! Very detailed review.",
            likeCount: 2,
            dislikeCount: 0,
            isLiked: false,
            isDisliked: false,
            parentCommentId: "comment_1",
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          }
        ]
      },
      {
        id: "comment_2",
        reviewId: review.id,
        authorId: "user_3",
        authorName: "Reviewer123",
        content: "I had a similar experience with this person. The red flags mentioned here are spot on.",
        likeCount: 8,
        dislikeCount: 1,
        isLiked: true,
        isDisliked: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        id: "comment_3",
        reviewId: review.id,
        authorId: "user_4",
        authorName: "LocalDater",
        content: "Thanks for the heads up! This kind of transparency is exactly what the dating scene needs.",
        likeCount: 12,
        dislikeCount: 0,
        isLiked: false,
        isDisliked: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      }
    ];

    setTimeout(() => {
      setComments(mockComments);
      setIsLoadingComments(false);
    }, 500);
  };

  // Scroll handler for animations - optimized for performance
  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    },
    []
  );

  const handleLike = () => {
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
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    loadMockComments();
    setRefreshing(false);
  };

  const handlePostComment = async (content: string) => {
    setIsPostingComment(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        reviewId: review.id,
        authorId: "current_user",
        authorName: "You",
        content,
        likeCount: 0,
        dislikeCount: 0,
        isLiked: false,
        isDisliked: false,
        parentCommentId: replyToComment?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (replyToComment) {
        // Add as reply
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === replyToComment.id
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), newComment]
                }
              : comment
          )
        );
      } else {
        // Add as new comment
        setComments(prevComments => [newComment, ...prevComments]);
      }
    } catch (error) {
      // Handle error
      console.error("Error posting comment:", error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prevComments => 
      prevComments.map(comment => {
        if (comment.id === commentId) {
          const wasLiked = comment.isLiked;
          const wasDisliked = comment.isDisliked;
          return {
            ...comment,
            isLiked: !wasLiked,
            isDisliked: false,
            likeCount: wasLiked ? comment.likeCount - 1 : comment.likeCount + 1,
            dislikeCount: wasDisliked ? comment.dislikeCount - 1 : comment.dislikeCount
          };
        }
        
        // Handle replies
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === commentId
                ? {
                    ...reply,
                    isLiked: !reply.isLiked,
                    isDisliked: false,
                    likeCount: reply.isLiked ? reply.likeCount - 1 : reply.likeCount + 1,
                    dislikeCount: reply.isDisliked ? reply.dislikeCount - 1 : reply.dislikeCount
                  }
                : reply
            )
          };
        }
        
        return comment;
      })
    );
  };

  const handleDislikeComment = (commentId: string) => {
    setComments(prevComments => 
      prevComments.map(comment => {
        if (comment.id === commentId) {
          const wasLiked = comment.isLiked;
          const wasDisliked = comment.isDisliked;
          return {
            ...comment,
            isLiked: false,
            isDisliked: !wasDisliked,
            likeCount: wasLiked ? comment.likeCount - 1 : comment.likeCount,
            dislikeCount: wasDisliked ? comment.dislikeCount - 1 : comment.dislikeCount + 1
          };
        }
        
        // Handle replies
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === commentId
                ? {
                    ...reply,
                    isLiked: false,
                    isDisliked: !reply.isDisliked,
                    likeCount: reply.isLiked ? reply.likeCount - 1 : reply.likeCount,
                    dislikeCount: reply.isDisliked ? reply.dislikeCount - 1 : reply.dislikeCount + 1
                  }
                : reply
            )
          };
        }
        
        return comment;
      })
    );
  };

  const handleReplyToComment = (comment: Comment) => {
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
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View className="flex-1 bg-surface-900">
        <StatusBar barStyle="light-content" backgroundColor="#141418" />
        
        {/* Main Content */}
        <Animated.ScrollView 
          style={[contentAnimatedStyle]}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
            />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
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
                    {review.greenFlags.map((flag: string) => (
                      <View key={flag} className="bg-green-500/20 border border-green-500/30 px-3 py-2 rounded-full flex-row items-center">
                        <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                        <Text className="text-green-400 text-sm font-medium ml-1">
                          {flag.replace("_", " ")}
                        </Text>
                      </View>
                    ))}
                    {review.redFlags.map((flag: string) => (
                      <View key={flag} className="bg-brand-red/20 border border-brand-red/30 px-3 py-2 rounded-full flex-row items-center">
                        <Ionicons name="warning" size={14} color="#FFFFFF" />
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
          <CommentInput
            onSubmit={handlePostComment}
            isLoading={isPostingComment}
            replyToComment={replyToComment?.authorName}
            onCancelReply={handleCancelReply}
          />
        </KeyboardAvoidingView>

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
    </TouchableWithoutFeedback>
  );
}