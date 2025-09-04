import React from "react";
import { View, Text } from "react-native";
import { ChatMessage } from "../types";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isOwn = message.isOwn;
  const isSystem = message.messageType === "system" || message.messageType === "join" || message.messageType === "leave";

  if (isSystem) {
    return (
      <View className="items-center my-2">
        <Text className="text-text-muted text-xs">
          {message.content}
        </Text>
      </View>
    );
  }

  return (
    <View className={`w-full my-1 ${isOwn ? "items-end" : "items-start"}`}>
      {!isOwn && (
        <Text className="text-text-secondary text-xs mb-1 ml-1">{message.senderName}</Text>
      )}
      <View className={`${isOwn ? "bg-brand-red" : "bg-surface-700"} max-w-[80%] rounded-2xl px-3 py-2`}>
        <Text className={`${isOwn ? "text-white" : "text-text-primary"}`}>{message.content}</Text>
        <Text className={`text-[10px] mt-1 ${isOwn ? "text-white/70" : "text-text-muted"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}
