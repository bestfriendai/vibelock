import React, { useState, useRef } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
}

export default function ChatInput({ onSend, onTyping }: Props) {
  const [text, setText] = useState("");
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = (t: string) => {
    setText(t);
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
  };

  return (
    <View className="flex-row items-center bg-surface-800 border-t border-border px-3 py-2">
      <View className="flex-1 bg-surface-700 rounded-full px-4 py-2 mr-2">
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          placeholder="Message"
          placeholderTextColor="#9CA3AF"
          className="text-text-primary"
          multiline
          style={{ maxHeight: 120 }}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
      </View>
      <Pressable
        className={`rounded-full p-2 ${text.trim() ? "bg-brand-red" : "bg-surface-700"}`}
        onPress={handleSend}
        disabled={!text.trim()}
      >
        <Ionicons name="send" size={18} color={text.trim() ? "#FFF" : "#9CA3AF"} />
      </Pressable>
    </View>
  );
}
