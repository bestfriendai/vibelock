import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, Pressable, Text, Platform, Alert } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../providers/ThemeProvider";
import VoiceMessage from "./VoiceMessage";
import MediaPicker from "./MediaPicker";

interface MediaItem {
  uri: string;
  type: "image" | "video" | "document";
  name?: string;
  size?: number;
  mimeType?: string;
}

interface Props {
  onSend: (text: string) => void;
  onSendVoice?: (audioUri: string, duration: number) => void;
  onSendMedia?: (media: MediaItem) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  maxLength?: number;
  replyingTo?: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export default function EnhancedMessageInput({
  onSend,
  onSendVoice,
  onSendMedia,
  onTyping,
  placeholder = "Message",
  maxLength = 1000,
  replyingTo,
  onCancelReply,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isVoiceBusy, setIsVoiceBusy] = useState(false);
  const [isMediaBusy, setIsMediaBusy] = useState(false);

  const textInputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const sendButtonScale = useSharedValue(0);
  const inputScale = useSharedValue(1);
  const replyHeight = useSharedValue(0);
  const focusedScale = useSharedValue(1);

  const canSend = text.trim().length > 0 && !disabled;

  // Animate send button
  useEffect(() => {
    sendButtonScale.value = withSpring(canSend ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSend]);

  // Animate reply bar
  useEffect(() => {
    replyHeight.value = withSpring(replyingTo ? 60 : 0, {
      damping: 15,
      stiffness: 100,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyingTo]);

  // Focus animation
  useEffect(() => {
    focusedScale.value = withSpring(isFocused ? 1.02 : 1, {
      damping: 15,
      stiffness: 200,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // Typing indicator logic
  const handleTextChange = (newText: string) => {
    setText(newText);

    if (!isTyping && newText.length > 0) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!canSend) return;

    const messageText = text.trim();
    if (messageText.length === 0) return;

    // Animate send
    inputScale.value = withSpring(0.95, { damping: 15 }, () => {
      inputScale.value = withSpring(1, { damping: 15 });
    });

    onSend(messageText);
    setText("");
    setInputHeight(40);

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTyping?.(false);
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(Math.max(40, event.nativeEvent.contentSize.height + 16), 120);
    setInputHeight(newHeight);
  };

  const handleVoiceStart = () => {
    setIsRecording(true);
    setIsVoiceBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleVoiceStop = () => {
    setIsRecording(false);
    setIsVoiceBusy(false);
  };

  const handleVoiceSend = (audioUri: string, duration: number) => {
    try {
      if (!audioUri || duration < 1) {
        Alert.alert("Too Short", "Voice message must be at least 1 second long.");
        return;
      }
      onSendVoice?.(audioUri, duration);
      setInputMode("text");
    } catch (error) {
      Alert.alert("Error", "Failed to send voice message. Please try again.");
    } finally {
      setIsVoiceBusy(false);
    }
  };

  const handleMediaSelect = (media: MediaItem) => {
    try {
      setIsMediaBusy(true);
      // Final validation pipeline before sending
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (media.size && media.size > MAX_FILE_SIZE) {
        Alert.alert("File Too Large", "Please choose a file under 50MB.");
        return;
      }

      const inferMime = (m?: string, n?: string): string | undefined => {
        if (m) return m;
        const ext = n?.toLowerCase().split(".").pop();
        switch (ext) {
          case "jpg":
          case "jpeg":
            return "image/jpeg";
          case "png":
            return "image/png";
          case "webp":
            return "image/webp";
          case "mp4":
            return "video/mp4";
          case "mov":
            return "video/quicktime";
          case "m4a":
            return "audio/mp4";
          case "mp3":
            return "audio/mpeg";
          case "wav":
            return "audio/wav";
          default:
            return undefined;
        }
      };

      const mime = inferMime(media.mimeType, media.name);
      if (media.type === "image") {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!mime || !allowed.includes(mime)) {
          Alert.alert("Unsupported Image", "Please choose a JPEG, PNG, or WEBP image.");
          return;
        }
      } else if (media.type === "video") {
        const allowed = ["video/mp4", "video/quicktime"];
        if (!mime || !allowed.includes(mime)) {
          Alert.alert("Unsupported Video", "Please choose an MP4 or MOV video.");
          return;
        }
      }

      onSendMedia?.(media);
      setShowMediaPicker(false);
    } catch (error) {
      Alert.alert("Error", "Failed to attach media. Please try again.");
    } finally {
      setIsMediaBusy(false);
    }
  };

  const toggleInputMode = () => {
    const newMode = inputMode === "text" ? "voice" : "text";
    setInputMode(newMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Cleanup and UX improvements when switching modes
    if (newMode === "voice") {
      textInputRef.current?.blur();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
    } else {
      setIsRecording(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
    };
  }, [onTyping]);

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
    opacity: sendButtonScale.value,
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value * focusedScale.value }],
  }));

  const replyAnimatedStyle = useAnimatedStyle(() => ({
    height: replyHeight.value,
    opacity: interpolate(replyHeight.value, [0, 60], [0, 1]),
  }));

  const characterCount = text.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <View>
      {/* Reply indicator */}
      <Animated.View
        style={[
          replyAnimatedStyle,
          {
            backgroundColor: colors.surface[700],
            borderTopWidth: 1,
            borderTopColor: colors.border.default,
          },
        ]}
      >
        {replyingTo && (
          <View className="flex-row items-center px-4 py-3">
            <View className="flex-1">
              <Text className="text-xs font-medium mb-1" style={{ color: colors.brand.red }}>
                Replying to {replyingTo.senderName}
              </Text>
              <Text className="text-sm" style={{ color: colors.text.secondary }} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <Pressable onPress={onCancelReply} className="p-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={colors.text.muted} />
            </Pressable>
          </View>
        )}
      </Animated.View>

      {/* Input area */}
      <View
        className="px-4 py-3 border-t"
        style={{
          backgroundColor: colors.surface[800],
          borderTopColor: colors.border.default,
        }}
      >
        <Animated.View style={inputAnimatedStyle} className="flex-row items-end space-x-3">
          {/* Text input container */}
          <View
            className="flex-1 rounded-2xl border px-4 py-2"
            style={{
              backgroundColor: colors.surface[700],
              borderColor: isFocused ? colors.brand.red : colors.border.default,
              borderWidth: isFocused ? 2 : 1,
              minHeight: 40,
              height: inputHeight,
            }}
          >
            <TextInput
              ref={textInputRef}
              value={text}
              onChangeText={handleTextChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={maxLength}
              editable={!disabled}
              className="text-base flex-1"
              style={{
                color: colors.text.primary,
                textAlignVertical: "top",
                paddingTop: Platform.OS === "ios" ? 8 : 4,
              }}
              onContentSizeChange={handleContentSizeChange}
              returnKeyType="default"
              submitBehavior="newline"
            />
          </View>

          {/* Send button */}
          <Animated.View style={sendButtonAnimatedStyle}>
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: canSend ? colors.brand.red : colors.surface[600],
              }}
            >
              <Ionicons name="send" size={18} color={canSend ? "#FFFFFF" : colors.text.muted} />
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Character count */}
        {(isNearLimit || isOverLimit) && (
          <View className="flex-row justify-end mt-2">
            <Text
              className="text-xs"
              style={{
                color: isOverLimit ? colors.brand.red : colors.text.muted,
              }}
            >
              {characterCount}/{maxLength}
            </Text>
          </View>
        )}

        {/* Quick actions row */}
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center space-x-4">
            {/* Emoji button */}
            <Pressable
              onPress={() => {
                // Show basic emoji reactions
                Alert.alert("Quick Reactions", "Choose a reaction", [
                  { text: "❤️", onPress: () => handleTextChange(text + "❤️") },
                  { text: "😂", onPress: () => handleTextChange(text + "😂") },
                  { text: "👍", onPress: () => handleTextChange(text + "👍") },
                  { text: "🔥", onPress: () => handleTextChange(text + "🔥") },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="happy" size={20} color={colors.text.muted} />
            </Pressable>

            {/* Media picker button */}
            <Pressable
              onPress={() => setShowMediaPicker(true)}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isMediaBusy}
              style={{ opacity: isMediaBusy ? 0.6 : 1 }}
            >
              <Ionicons name="attach" size={20} color={colors.text.muted} />
            </Pressable>

            {/* Voice/Text mode toggle */}
            <Pressable
              onPress={toggleInputMode}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isVoiceBusy}
              style={{ opacity: isVoiceBusy ? 0.6 : 1 }}
            >
              <Ionicons
                name={inputMode === "voice" ? "chatbox" : "mic"}
                size={20}
                color={inputMode === "voice" ? colors.brand.red : colors.text.muted}
              />
            </Pressable>
          </View>
        </View>

        {/* Voice recording mode */}
        {inputMode === "voice" && (
          <View className="mt-4">
            <VoiceMessage
              onSend={handleVoiceSend}
              isRecording={isRecording}
              onStartRecording={handleVoiceStart}
              onStopRecording={handleVoiceStop}
            />
          </View>
        )}

        {/* Media Picker Modal */}
        <MediaPicker
          visible={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onMediaSelect={handleMediaSelect}
        />
      </View>
    </View>
  );
}
