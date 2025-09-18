import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ReviewComment } from "../types";
import { useTheme } from "../providers/ThemeProvider";

interface CommentSectionProps {
  comments: ReviewComment[];
  isLoading?: boolean;
  onLikeComment: (commentId: string) => void;
  onDislikeComment: (commentId: string) => void;
  onReplyToComment: (comment: ReviewComment) => void;
  onReportComment: (commentId: string) => void;
}

interface CommentItemProps {
  comment: ReviewComment;
  onLike: (commentId: string) => void;
  onDislike: (commentId: string) => void;
  onReply: (comment: ReviewComment) => void;
  onReport: (commentId: string) => void;
  isReply?: boolean;
}

function CommentItem({ comment, onLike, onDislike, onReply, onReport, isReply = false }: CommentItemProps) {
  const { colors } = useTheme();
  const [showReplies, setShowReplies] = useState(false);

  const formatTimeAgo = (dateLike: Date | string | null | undefined) => {
    const date = dateLike instanceof Date ? dateLike : dateLike ? new Date(dateLike) : null;
    if (!date || isNaN(date.getTime())) return "Just now";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffMs / (1000 * 60));
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
        <Text className="italic" style={{ color: colors.text.muted }}>
          This comment has been deleted
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`py-3 ${isReply ? "ml-8 pl-4" : ""}`}
      style={isReply ? { borderLeftWidth: 1, borderLeftColor: colors.surface[600] } : {}}
    >
      {/* Comment Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: colors.surface[600] }}
          >
            <Ionicons name="person" size={12} color={colors.text.muted} />
          </View>
          <Text className="font-medium text-sm" style={{ color: colors.text.primary }}>
            {comment.authorName}
          </Text>
          <Text className="text-xs ml-2" style={{ color: colors.text.muted }}>
            {formatTimeAgo(comment.createdAt)}
          </Text>
        </View>

        <Pressable onPress={() => onReport(comment.id)} className="p-1">
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.text.muted} />
        </Pressable>
      </View>

      {/* Comment Content */}
      <Text className="text-sm leading-5 mb-3" style={{ color: colors.text.primary }}>
        {comment.content}
      </Text>

      {/* Comment Actions */}
      <View className="flex-row items-center space-x-4">
        {/* Like Button */}
        <Pressable onPress={() => onLike(comment.id)} className="flex-row items-center">
          <Ionicons
            name={comment.isLiked ? "heart" : "heart-outline"}
            size={16}
            color={comment.isLiked ? colors.brand.red : colors.text.muted}
          />
          {comment.likeCount > 0 && (
            <Text className="text-xs ml-1" style={{ color: colors.text.muted }}>
              {comment.likeCount}
            </Text>
          )}
        </Pressable>

        {/* Dislike Button */}
        <Pressable onPress={() => onDislike(comment.id)} className="flex-row items-center">
          <Ionicons
            name={comment.isDisliked ? "thumbs-down" : "thumbs-down-outline"}
            size={16}
            color={comment.isDisliked ? colors.brand.red : colors.text.muted}
          />
          {comment.dislikeCount > 0 && (
            <Text className="text-xs ml-1" style={{ color: colors.text.muted }}>
              {comment.dislikeCount}
            </Text>
          )}
        </Pressable>

        {/* Reply Button */}
        {!isReply && (
          <Pressable onPress={() => onReply(comment)} className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={16} color={colors.text.muted} />
            <Text className="text-xs ml-1" style={{ color: colors.text.muted }}>
              Reply
            </Text>
          </Pressable>
        )}
      </View>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View className="mt-3">
          {!showReplies ? (
            <Pressable onPress={() => setShowReplies(true)} className="flex-row items-center">
              <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
              <Text className="text-sm ml-1" style={{ color: colors.brand.red }}>
                View {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => setShowReplies(false)} className="flex-row items-center mb-2">
                <Ionicons name="chevron-up" size={16} color={colors.text.muted} />
                <Text className="text-sm ml-1" style={{ color: colors.brand.red }}>
                  Hide replies
                </Text>
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

export default function CommentSection({
  comments,
  isLoading,
  onLikeComment,
  onDislikeComment,
  onReplyToComment,
  onReportComment,
}: CommentSectionProps) {
  const { colors } = useTheme();

  const renderComment = (comment: ReviewComment, index: number) => (
    <View key={comment.id}>
      <CommentItem
        comment={comment}
        onLike={onLikeComment}
        onDislike={onDislikeComment}
        onReply={onReplyToComment}
        onReport={onReportComment}
      />
      {index < comments.length - 1 && <View className="h-px mx-4" style={{ backgroundColor: colors.surface[700] }} />}
    </View>
  );

  const renderCommentSkeleton = () => (
    <View className="py-3">
      <View className="flex-row items-center mb-2">
        <View className="w-6 h-6 rounded-full mr-2" style={{ backgroundColor: colors.surface[600] }} />
        <View className="h-3 rounded w-20 mr-2" style={{ backgroundColor: colors.surface[600] }} />
        <View className="h-2 rounded w-12" style={{ backgroundColor: colors.surface[700] }} />
      </View>
      <View className="space-y-2 mb-3">
        <View className="h-3 rounded w-full" style={{ backgroundColor: colors.surface[600] }} />
        <View className="h-3 rounded w-3/4" style={{ backgroundColor: colors.surface[600] }} />
      </View>
      <View className="flex-row space-x-4">
        <View className="h-4 rounded w-8" style={{ backgroundColor: colors.surface[700] }} />
        <View className="h-4 rounded w-8" style={{ backgroundColor: colors.surface[700] }} />
        <View className="h-4 rounded w-12" style={{ backgroundColor: colors.surface[700] }} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ backgroundColor: colors.surface[800] }}>
        <View className="px-4 py-3 border-b" style={{ borderBottomColor: colors.surface[700] }}>
          <View className="h-5 rounded w-24" style={{ backgroundColor: colors.surface[600] }} />
        </View>
        <View className="px-4">
          {[1, 2, 3].map((i) => (
            <View key={i}>
              {renderCommentSkeleton()}
              {i < 3 && <View className="h-px mx-4" style={{ backgroundColor: colors.surface[700] }} />}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View className="py-8 items-center">
        <Ionicons name="chatbubbles-outline" size={48} color={colors.text.muted} />
        <Text className="text-lg font-medium mt-4" style={{ color: colors.text.secondary }}>
          No comments yet
        </Text>
        <Text className="text-center mt-2 px-8" style={{ color: colors.text.muted }}>
          Be the first to share your thoughts on this review
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.surface[800] }}>
      <View className="px-4 py-3 border-b" style={{ borderBottomColor: colors.surface[700] }}>
        <Text className="font-semibold" style={{ color: colors.text.primary }}>
          Comments ({comments.length})
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-4" nestedScrollEnabled={true}>
        {comments.map((comment, index) => renderComment(comment, index))}
      </ScrollView>
    </View>
  );
}
