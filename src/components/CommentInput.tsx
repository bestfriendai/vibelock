import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../state/authStore";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  replyToComment?: string; // Comment author name if replying
  onCancelReply?: () => void;
  onSignInPress?: () => void; // Callback for sign in button
}

export default function CommentInput({
  onSubmit,
  placeholder = "Add a comment...",
  isLoading = false,
  replyToComment,
  onCancelReply,
  onSignInPress,
}: CommentInputProps) {
  const [comment, setComment] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    if (comment.trim() && !isLoading) {
      try {
        await onSubmit(comment.trim());
        setComment("");
        Keyboard.dismiss();
        if (onCancelReply) {
          onCancelReply();
        }
      } catch (error) {
        // Error handling is done in parent component
      }
    }
  };

  const canSubmit = comment.trim().length > 0 && !isLoading && !!user;

  // Show sign-in prompt for guests
  if (!user) {
    return (
      <View className="bg-surface-800 border-t border-surface-700">
        <View className="flex-row items-center justify-between px-4 py-4">
          <View className="flex-1">
            <Text className="text-text-secondary text-base">Sign in to join the conversation</Text>
            <Text className="text-text-muted text-sm mt-1">Share your thoughts and connect with others</Text>
          </View>
          <Pressable
            onPress={onSignInPress}
            className="bg-brand-red rounded-lg px-4 py-2 ml-3"
          >
            <Text className="text-black font-semibold text-sm">Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-surface-800 border-t border-surface-700">
      {/* Reply indicator */}
      {replyToComment && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surface-700/50">
          <View className="flex-row items-center">
            <Ionicons name="return-down-forward" size={16} color="#9CA3AF" />
            <Text className="text-text-secondary text-sm ml-2">Replying to {replyToComment}</Text>
          </View>
          <Pressable onPress={onCancelReply} className="p-1">
            <Ionicons name="close" size={16} color="#9CA3AF" />
          </Pressable>
        </View>
      )}

      <View className="flex-row items-end px-4 py-3">
        {/* Comment Input */}
        <View className="flex-1 mr-3">
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`bg-surface-700 rounded-2xl px-4 py-3 text-text-primary max-h-24 ${
              isFocused ? "border border-brand-red/30" : ""
            }`}
            style={{ textAlignVertical: "top" }}
          />
          {comment.length > 400 && (
            <Text className="text-text-muted text-xs mt-1 text-right">{comment.length}/500</Text>
          )}
        </View>

        {/* Send Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            canSubmit ? "bg-brand-red" : "bg-surface-600"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color={canSubmit ? "#FFFFFF" : "#6B7280"} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
