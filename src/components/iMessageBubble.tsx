import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../types';
import { useTheme } from '../providers/ThemeProvider';
import { formatTime } from '../utils/dateUtils';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  previousMessage?: ChatMessage;
  nextMessage?: ChatMessage;
  onReply?: (message: ChatMessage) => void;
  onReact?: (messageId: string, reaction: string) => void;
}

export default function IMessageBubble({
  message, 
  isOwn, 
  previousMessage, 
  nextMessage,
  onReply,
  onReact 
}: Props) {
  const { theme, colors, isDarkMode } = useTheme();
  
  // Check if this message is part of a group (consecutive messages from same sender)
  const isFirstInGroup = !previousMessage || previousMessage.senderId !== message.senderId;
  const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
  
  // Get bubble styling based on position in group
  const getBubbleStyle = () => {
    if (isOwn) {
      // Own messages (blue bubbles on right)
      let borderRadius = 'rounded-3xl';
      if (isFirstInGroup && isLastInGroup) {
        borderRadius = 'rounded-3xl'; // Single message
      } else if (isFirstInGroup) {
        borderRadius = 'rounded-t-3xl rounded-bl-3xl rounded-br-xl'; // First in group
      } else if (isLastInGroup) {
        borderRadius = 'rounded-t-3xl rounded-bl-3xl rounded-br-xl'; // Last in group
      } else {
        borderRadius = 'rounded-l-3xl rounded-r-xl'; // Middle of group
      }
      return borderRadius;
    } else {
      // Other messages (gray bubbles on left)
      let borderRadius = 'rounded-3xl';
      if (isFirstInGroup && isLastInGroup) {
        borderRadius = 'rounded-3xl'; // Single message
      } else if (isFirstInGroup) {
        borderRadius = 'rounded-t-3xl rounded-br-3xl rounded-bl-xl'; // First in group
      } else if (isLastInGroup) {
        borderRadius = 'rounded-t-3xl rounded-br-3xl rounded-bl-xl'; // Last in group
      } else {
        borderRadius = 'rounded-r-3xl rounded-l-xl'; // Middle of group
      }
      return borderRadius;
    }
  };

  const getBubbleColor = () => {
    if (isOwn) {
      return colors.brand.red; // Use theme red instead of iOS blue
    } else {
      return colors.surface[700]; // Use theme surface color
    }
  };

  const getTextColor = () => {
    if (isOwn) {
      return '#FFFFFF'; // White text on red background
    } else {
      return colors.text.primary; // Theme-aware text
    }
  };

  return (
    <View className={`mb-1 ${isOwn ? 'items-end' : 'items-start'}`}>
      <Pressable
        onLongPress={() => onReply?.(message)}
        className={`max-w-[75%] px-4 py-2 ${getBubbleStyle()}`}
        style={{
          backgroundColor: getBubbleColor(),
          marginBottom: isLastInGroup ? 8 : 1,
        }}
      >
        {/* Message content */}
        <Text
          className="text-base"
          style={{
            color: getTextColor(),
            lineHeight: 20,
          }}
        >
          {message.content}
        </Text>
        
        {/* Timestamp only on last message in group */}
        {isLastInGroup && (
          <Text
            className="text-xs mt-1"
            style={{
              color: isOwn ? 'rgba(255,255,255,0.7)' : colors.text.muted,
              fontSize: 11,
              textAlign: isOwn ? 'right' : 'left',
            }}
          >
            {formatTime(message.timestamp)}
          </Text>
        )}
      </Pressable>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <View className={`flex-row mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {message.reactions.map((reaction, index) => (
            <Pressable
              key={index}
              onPress={() => onReact?.(message.id, reaction.emoji)}
              className="bg-surface-700 rounded-full px-2 py-1 mr-1"
              style={{ backgroundColor: colors.surface[600] }}
            >
              <Text className="text-xs">
                {reaction.emoji} {reaction.count > 1 ? reaction.count : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// Helper function to format time (you may need to create this in utils/dateUtils.ts)
const formatTimeLocal = (date: Date | string): string => {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    // Show time for messages within 24 hours
    return messageDate.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else {
    // Show date for older messages
    return messageDate.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};
