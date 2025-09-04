import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Comment, MediaItem } from "../types";
import CommentInput from "./CommentInput";



interface MediaCommentModalProps {
  visible: boolean;
  media: MediaItem;
  comments: Comment[];
  isLoading?: boolean;
  isPosting?: boolean;
  onClose: () => void;
  onPostComment: (content: string) => Promise<void>;
  onLikeComment: (commentId: string) => void;
  onDislikeComment: (commentId: string) => void;
  onReplyToComment: (comment: Comment) => void;
  onReportComment: (commentId: string) => void;
  replyToComment?: Comment | null;
  onCancelReply?: () => void;
}

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: string) => void;
  onDislike: (commentId: string) => void;
  onReply: (comment: Comment) => void;
  onReport: (commentId: string) => void;
  isReply?: boolean;
}

function CommentItem({ comment, onLike, onDislike, onReply, onReport, isReply = false }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (comment.isDeleted) {
    return (
      <View className={`py-3 ${isReply ? "ml-8" : ""}`}>
        <Text className="text-text-muted italic">This comment has been deleted</Text>
      </View>
    );
  }

  return (
    <View className={`py-3 ${isReply ? "ml-8 border-l border-surface-600 pl-4" : ""}`}>
      {/* Comment Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full bg-surface-600 items-center justify-center mr-2">
            <Ionicons name="person" size={12} color="#9CA3AF" />
          </View>
          <Text className="text-text-primary font-medium text-sm">
            {comment.authorName}
          </Text>
          <Text className="text-text-muted text-xs ml-2">
            {formatTimeAgo(comment.createdAt)}
          </Text>
        </View>
        
        <Pressable onPress={() => onReport(comment.id)} className="p-1">
          <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
        </Pressable>
      </View>

      {/* Comment Content */}
      <Text className="text-text-primary text-sm leading-5 mb-3">
        {comment.content}
      </Text>

      {/* Comment Actions */}
      <View className="flex-row items-center space-x-4">
        {/* Like Button */}
        <Pressable 
          onPress={() => onLike(comment.id)}
          className="flex-row items-center"
        >
          <Ionicons 
            name={comment.isLiked ? "heart" : "heart-outline"} 
            size={16} 
            color={comment.isLiked ? "#FF6B6B" : "#9CA3AF"} 
          />
          {comment.likeCount > 0 && (
            <Text className="text-text-muted text-xs ml-1">
              {comment.likeCount}
            </Text>
          )}
        </Pressable>

        {/* Dislike Button */}
        <Pressable 
          onPress={() => onDislike(comment.id)}
          className="flex-row items-center"
        >
          <Ionicons 
            name={comment.isDisliked ? "thumbs-down" : "thumbs-down-outline"} 
            size={16} 
            color={comment.isDisliked ? "#FF6B6B" : "#9CA3AF"} 
          />
          {comment.dislikeCount > 0 && (
            <Text className="text-text-muted text-xs ml-1">
              {comment.dislikeCount}
            </Text>
          )}
        </Pressable>

        {/* Reply Button */}
        {!isReply && (
          <Pressable 
            onPress={() => onReply(comment)}
            className="flex-row items-center"
          >
            <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
            <Text className="text-text-muted text-xs ml-1">Reply</Text>
          </Pressable>
        )}
      </View>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View className="mt-3">
          {!showReplies ? (
            <Pressable 
              onPress={() => setShowReplies(true)}
              className="flex-row items-center"
            >
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              <Text className="text-brand-red text-sm ml-1">
                View {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable 
                onPress={() => setShowReplies(false)}
                className="flex-row items-center mb-2"
              >
                <Ionicons name="chevron-up" size={16} color="#9CA3AF" />
                <Text className="text-brand-red text-sm ml-1">Hide replies</Text>
              </Pressable>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onLike={onLike}
                  onDislike={onDislike}
                  onReply={onReply}
                  onReport={onReport}
                  isReply={true}
                />
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function MediaCommentModal({
  visible,
  media,
  comments,
  isLoading = false,
  isPosting = false,
  onClose,
  onPostComment,
  onLikeComment,
  onDislikeComment,
  onReplyToComment,
  onReportComment,
  replyToComment,
  onCancelReply
}: MediaCommentModalProps) {
  const renderCommentSkeleton = () => (
    <View className="py-3">
      <View className="flex-row items-center mb-2">
        <View className="w-6 h-6 rounded-full bg-surface-600 mr-2" />
        <View className="h-3 bg-surface-600 rounded w-20 mr-2" />
        <View className="h-2 bg-surface-700 rounded w-12" />
      </View>
      <View className="space-y-2 mb-3">
        <View className="h-3 bg-surface-600 rounded w-full" />
        <View className="h-3 bg-surface-600 rounded w-3/4" />
      </View>
      <View className="flex-row space-x-4">
        <View className="h-4 bg-surface-700 rounded w-8" />
        <View className="h-4 bg-surface-700 rounded w-8" />
        <View className="h-4 bg-surface-700 rounded w-12" />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-surface-900">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface-700">
            <Text className="text-text-primary text-lg font-semibold">
              Image Comments
            </Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#F3F4F6" />
            </Pressable>
          </View>

          {/* Image Preview */}
          <View className="px-4 py-3 border-b border-surface-700">
            <View className="bg-surface-800 rounded-lg overflow-hidden">
              <Image
                source={{ uri: media.uri }}
                style={{ width: "100%", height: 200 }}
                contentFit="cover"
              />
            </View>
          </View>

          {/* Comments Section */}
          <View className="flex-1">
            {isLoading ? (
              <ScrollView className="px-4">
                {[1, 2, 3].map((i) => (
                  <View key={i}>
                    {renderCommentSkeleton()}
                    {i < 3 && <View className="h-px bg-surface-700" />}
                  </View>
                ))}
              </ScrollView>
            ) : comments.length === 0 ? (
              <View className="flex-1 items-center justify-center px-8">
                <Ionicons name="chatbubbles-outline" size={48} color="#6B7280" />
                <Text className="text-text-secondary text-lg font-medium mt-4 text-center">
                  No comments on this image yet
                </Text>
                <Text className="text-text-muted text-center mt-2">
                  Be the first to share your thoughts
                </Text>
              </View>
            ) : (
              <ScrollView 
                className="px-4"
                showsVerticalScrollIndicator={false}
              >
                {comments.map((comment, index) => (
                  <View key={comment.id}>
                    <CommentItem
                      comment={comment}
                      onLike={onLikeComment}
                      onDislike={onDislikeComment}
                      onReply={onReplyToComment}
                      onReport={onReportComment}
                    />
                    {index < comments.length - 1 && (
                      <View className="h-px bg-surface-700" />
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Comment Input */}
          <CommentInput
            onSubmit={onPostComment}
            isLoading={isPosting}
            placeholder="Comment on this image..."
            replyToComment={replyToComment?.authorName}
            onCancelReply={onCancelReply}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}