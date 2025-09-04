import React, { useState, useRef } from "react";
import { View, TextInput, Pressable, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

interface Props {
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
  onSendMedia?: (media: { uri: string; type: string }) => void;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

const emojis = [
  "😀", "😂", "🥰", "😍", "🤔", "😎", "😭", "😡", "👍", "👎", 
  "❤️", "🔥", "💯", "🎉", "👏", "🙏", "💪", "🤝", "✨", "⭐"
];

export default function ChatInput({ 
  onSend, 
  onTyping, 
  onSendMedia,
  replyingTo,
  onCancelReply
}: Props) {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputHeight = useSharedValue(40);
  const emojiScale = useSharedValue(0);
  const attachmentScale = useSharedValue(0);

  const handleChangeText = (t: string) => {
    setText(t);
    
    // Auto-resize input
    const lines = t.split('\n').length;
    const newHeight = Math.min(Math.max(40, lines * 20), 120);
    inputHeight.value = withSpring(newHeight);
    
    if (onTyping) {
      onTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => onTyping(false), 800);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    inputHeight.value = withSpring(40);
  };

  const toggleEmojis = () => {
    setShowEmojis(!showEmojis);
    emojiScale.value = withTiming(showEmojis ? 0 : 1, { duration: 200 });
    if (showAttachments) {
      setShowAttachments(false);
      attachmentScale.value = withTiming(0, { duration: 200 });
    }
  };

  const toggleAttachments = () => {
    setShowAttachments(!showAttachments);
    attachmentScale.value = withTiming(showAttachments ? 0 : 1, { duration: 200 });
    if (showEmojis) {
      setShowEmojis(false);
      emojiScale.value = withTiming(0, { duration: 200 });
    }
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onSendMedia?.({
        uri: result.assets[0].uri,
        type: result.assets[0].type || 'image'
      });
    }
    toggleAttachments();
  };

  const handleCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onSendMedia?.({
        uri: result.assets[0].uri,
        type: 'image'
      });
    }
    toggleAttachments();
  };

  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onSendMedia?.({
          uri: result.assets[0].uri,
          type: 'document'
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
    toggleAttachments();
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    // Voice recording implementation would go here
    Alert.alert("Voice Message", "Voice recording feature coming soon!");
    setTimeout(() => setIsRecording(false), 1000);
  };

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    height: inputHeight.value,
  }));

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
    opacity: emojiScale.value,
  }));

  const attachmentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: attachmentScale.value }],
    opacity: attachmentScale.value,
  }));

  return (
    <View className="bg-surface-800 border-t border-border">
      {/* Reply indicator */}
      {replyingTo && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surface-700/50 border-b border-border">
          <View className="flex-1">
            <Text className="text-text-secondary text-xs font-medium">
              Replying to {replyingTo.senderName}
            </Text>
            <Text className="text-text-muted text-sm" numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} className="p-1">
            <Ionicons name="close" size={16} color="#9CA3AF" />
          </Pressable>
        </View>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <Animated.View 
          style={[emojiAnimatedStyle]}
          className="px-4 py-3 bg-surface-700/50 border-b border-border"
        >
          <View className="flex-row flex-wrap gap-2">
            {emojis.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => addEmoji(emoji)}
                className="p-2 rounded-lg bg-surface-800"
              >
                <Text className="text-lg">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Attachment options */}
      {showAttachments && (
        <Animated.View 
          style={[attachmentAnimatedStyle]}
          className="px-4 py-3 bg-surface-700/50 border-b border-border"
        >
          <View className="flex-row space-x-4">
            <Pressable
              onPress={handleCamera}
              className="items-center p-3 bg-surface-800 rounded-xl"
            >
              <Ionicons name="camera" size={24} color="#FF6B6B" />
              <Text className="text-text-secondary text-xs mt-1">Camera</Text>
            </Pressable>
            <Pressable
              onPress={handleImagePicker}
              className="items-center p-3 bg-surface-800 rounded-xl"
            >
              <Ionicons name="images" size={24} color="#22C55E" />
              <Text className="text-text-secondary text-xs mt-1">Gallery</Text>
            </Pressable>
            <Pressable
              onPress={handleDocument}
              className="items-center p-3 bg-surface-800 rounded-xl"
            >
              <Ionicons name="document" size={24} color="#3B82F6" />
              <Text className="text-text-secondary text-xs mt-1">File</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Input area */}
      <View className="flex-row items-end px-3 py-2">
        {/* Attachment button */}
        <Pressable
          onPress={toggleAttachments}
          className="p-2 mr-2"
        >
          <Ionicons 
            name="add-circle" 
            size={24} 
            color={showAttachments ? "#FF6B6B" : "#9CA3AF"} 
          />
        </Pressable>

        {/* Text input container */}
        <Animated.View 
          style={[inputAnimatedStyle]}
          className="flex-1 bg-surface-700 rounded-2xl px-4 py-2 mr-2 justify-center"
        >
          <TextInput
            value={text}
            onChangeText={handleChangeText}
            placeholder="Message..."
            placeholderTextColor="#9CA3AF"
            className="text-text-primary text-base"
            multiline
            textAlignVertical="center"
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
        </Animated.View>

        {/* Emoji button */}
        <Pressable
          onPress={toggleEmojis}
          className="p-2 mr-2"
        >
          <Ionicons 
            name="happy" 
            size={24} 
            color={showEmojis ? "#FF6B6B" : "#9CA3AF"} 
          />
        </Pressable>

        {/* Send/Voice button */}
        {text.trim() ? (
          <Pressable
            className="bg-brand-red rounded-full p-2"
            onPress={handleSend}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </Pressable>
        ) : (
          <Pressable
            className={`rounded-full p-2 ${isRecording ? "bg-brand-red" : "bg-surface-700"}`}
            onPress={startVoiceRecording}
            onLongPress={startVoiceRecording}
          >
            <Ionicons 
              name="mic" 
              size={20} 
              color={isRecording ? "#FFF" : "#9CA3AF"} 
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
