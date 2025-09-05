import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../types";

interface Props {
  media: MediaItem;
  size?: number;
  onPress?: () => void;
  showPlayIcon?: boolean;
}

export default function MediaThumbnail({ media, size = 80, onPress, showPlayIcon = true }: Props) {
  const isVideo = media.type === "video";
  const imageUri = media.thumbnailUri || media.uri;

  return (
    <Pressable onPress={onPress} className="relative overflow-hidden rounded-xl" style={{ width: size, height: size }}>
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={200}
        placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      />

      {/* Video play overlay */}
      {isVideo && showPlayIcon && (
        <View className="absolute inset-0 bg-black/30 items-center justify-center">
          <View className="bg-white/90 rounded-full p-2">
            <Ionicons name="play" size={size * 0.25} color="#000" />
          </View>
        </View>
      )}

      {/* Video duration badge */}
      {isVideo && media.duration && (
        <View className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded">
          <Text className="text-white text-xs font-medium">{formatDuration(media.duration)}</Text>
        </View>
      )}

      {/* Loading overlay */}
      <View className="absolute inset-0 bg-surface-800/50 items-center justify-center opacity-0">
        <View className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </View>
    </Pressable>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
