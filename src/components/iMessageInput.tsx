import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  Text 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';

interface Props {
  onSend: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  replyingTo?: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  onCancelReply?: () => void;
}

export default function IMessageInput({
  onSend, 
  placeholder = "Message", 
  maxLength = 500,
  replyingTo,
  onCancelReply 
}: Props) {
  const { theme, colors, isDarkMode } = useTheme();
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const textInputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      setInputHeight(36);
    }
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    // Limit height to max 4 lines (approximately 100px)
    const newHeight = Math.min(Math.max(36, height + 8), 100);
    setInputHeight(newHeight);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Reply indicator */}
      {replyingTo && (
        <View 
          className="px-4 py-2 border-t"
          style={{ 
            backgroundColor: colors.surface[800], 
            borderColor: colors.border 
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text 
                className="text-xs font-medium"
                style={{ color: colors.brand.red }}
              >
                Replying to {replyingTo.senderName}
              </Text>
              <Text 
                className="text-sm mt-1"
                style={{ color: colors.text.secondary }}
                numberOfLines={1}
              >
                {replyingTo.content}
              </Text>
            </View>
            <Pressable
              onPress={onCancelReply}
              className="ml-2 p-1"
            >
              <Ionicons 
                name="close" 
                size={16} 
                color={colors.text.muted} 
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Input area */}
      <View 
        className="px-4 py-2 border-t"
        style={{ 
          backgroundColor: colors.surface[800], 
          borderColor: colors.border 
        }}
      >
        <View className="flex-row items-end space-x-2">
          {/* Text input container */}
          <View 
            className="flex-1 rounded-3xl border px-4 py-2"
            style={{ 
              backgroundColor: colors.surface[700], 
              borderColor: colors.border,
              minHeight: 36,
              height: inputHeight,
            }}
          >
            <TextInput
              ref={textInputRef}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={maxLength}
              className="text-base"
              style={{ 
                color: colors.text.primary,
                flex: 1,
                textAlignVertical: 'center',
                paddingTop: Platform.OS === 'ios' ? 8 : 4,
                paddingBottom: Platform.OS === 'ios' ? 8 : 4,
              }}
              onContentSizeChange={handleContentSizeChange}
              scrollEnabled={inputHeight >= 100}
            />
          </View>
          
          {/* Send button */}
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{
              backgroundColor: text.trim() ? '#007AFF' : colors.text.muted,
              marginBottom: 4,
            }}
          >
            <Ionicons 
              name="arrow-up" 
              size={16} 
              color="white" 
            />
          </Pressable>
        </View>

        {/* Character count */}
        {text.length > maxLength * 0.8 && (
          <Text 
            className="text-xs mt-1 text-right"
            style={{ 
              color: text.length >= maxLength ? colors.brand.red : colors.text.muted 
            }}
          >
            {text.length}/{maxLength}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
