import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../types";
import { videoThumbnailService } from "../services/videoThumbnailService";
import LazyImage from "./LazyImage";

interface Props {
  media: MediaItem;
  size?: number;
  onPress?: () => void;
  showPlayIcon?: boolean;
  onLoad?: () => void;
}

export default function MediaThumbnail({ media, size = 80, onPress, showPlayIcon = true, onLoad }: Props) {
  const [imageError, setImageError] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const isVideo = media.type === "video";

  // Generate video thumbnail when component mounts
  useEffect(() => {
    if (isVideo && !videoThumbnail && !thumbnailLoading) {
      setThumbnailLoading(true);
      videoThumbnailService
        .generateThumbnail(media.uri)
        .then((result) => {
          if (result.success && result.uri) {
            setVideoThumbnail(result.uri);
          }
        })
        .catch((error) => {
          console.warn("Failed to generate video thumbnail:", error);
        })
        .finally(() => {
          setThumbnailLoading(false);
        });
    }
  }, [isVideo, media.uri, videoThumbnail, thumbnailLoading]);

  return (
    <Pressable onPress={onPress} className="relative overflow-hidden rounded-xl" style={{ width: size, height: size }}>
      {isVideo ? (
        videoThumbnail ? (
          // Show video thumbnail if available with lazy loading
          <LazyImage
            uri={videoThumbnail}
            width={size}
            height={size}
            contentFit="cover"
            priority="normal"
            onLoad={onLoad}
            onError={() => setImageError(true)}
          />
        ) : (
          // Show video icon placeholder while loading or if no thumbnail
          <View className="flex-1 bg-surface-700 items-center justify-center" style={{ width: size, height: size }}>
            {thumbnailLoading ? (
              <View className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
            ) : (
              <Ionicons name="videocam" size={size * 0.4} color="#6B7280" />
            )}
          </View>
        )
      ) : imageError ? (
        // For images that failed to load
        <View className="flex-1 bg-surface-700 items-center justify-center" style={{ width: size, height: size }}>
          <Ionicons name="image-outline" size={size * 0.4} color="#6B7280" />
        </View>
      ) : (
        // For regular images with lazy loading
        <LazyImage
          uri={media.uri}
          width={size}
          height={size}
          contentFit="cover"
          priority="normal"
          onLoad={onLoad}
          onError={() => setImageError(true)}
        />
      )}

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
