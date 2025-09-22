import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthState } from "../utils/authUtils";
import { useTheme } from "../providers/ThemeProvider";

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
  const { colors } = useTheme();
  const [comment, setComment] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { canComment, needsSignIn } = useAuthState();

  const handleSubmit = async () => {
    if (comment.trim() && !isLoading && canComment) {
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

  const canSubmit = comment.trim().length > 0 && !isLoading && canComment;

  // Show sign-in prompt for guests
  if (needsSignIn) {
    return (
      <View style={{ backgroundColor: colors.surface[800], borderTopColor: colors.border.default, borderTopWidth: 1 }}>
        <View className="flex-row items-center justify-between px-6 py-6">
          <View className="flex-1">
            <Text className="text-base" style={{ color: colors.text.secondary }}>
              Sign in to join the conversation
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.text.muted }}>
              Share your thoughts and connect with others
            </Text>
          </View>
          <Pressable
            onPress={onSignInPress}
            className="rounded-lg px-4 py-2 ml-3"
            style={{ backgroundColor: colors.brand.red }}
          >
            <Text className="font-semibold text-sm" style={{ color: colors.text.primary }}>
              Sign In
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.surface[800], borderTopColor: colors.border.default, borderTopWidth: 1 }}>
      {/* Reply indicator */}
      {replyToComment && (
        <View
          className="flex-row items-center justify-between px-4 py-2"
          style={{ backgroundColor: `${colors.surface[700]}80` }}
        >
          <View className="flex-row items-center">
            <Ionicons name="return-down-forward" size={16} color={colors.text.muted} />
            <Text className="text-sm ml-2" style={{ color: colors.text.secondary }}>
              Replying to {replyToComment}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} className="p-1">
            <Ionicons name="close" size={16} color={colors.text.muted} />
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
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={500}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="rounded-2xl px-4 py-3 max-h-24"
            style={{
              backgroundColor: colors.surface[700],
              color: colors.text.primary,
              textAlignVertical: "top",
              ...(isFocused && { borderWidth: 1, borderColor: `${colors.brand.red}50` }),
            }}
          />
          {comment.length > 400 && (
            <Text className="text-xs mt-1 text-right" style={{ color: colors.text.muted }}>
              {comment.length}/500
            </Text>
          )}
        </View>

        {/* Send Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: canSubmit ? colors.brand.red : colors.surface[600] }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color={canSubmit ? "#FFFFFF" : colors.text.muted} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
