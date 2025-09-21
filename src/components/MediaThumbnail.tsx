import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../types";
import { videoThumbnailService } from "../services/videoThumbnailService";
import { formatDuration } from "../utils/mediaUtils";
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
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(media.thumbnailUri || null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const isVideo = media.type === "video";

  // Generate video thumbnail when component mounts
  useEffect(() => {
    if (isVideo && !videoThumbnail && !thumbnailLoading && !media.thumbnailUri) {
      setThumbnailLoading(true);
      videoThumbnailService
        .generateThumbnail(media.uri)
        .then((result) => {
          if (result.success && result.uri) {
            setVideoThumbnail(result.uri);
            onLoad?.();
          }
        })
        .catch((error) => {
          console.warn("Failed to generate video thumbnail:", error);
          setImageError(true);
        })
        .finally(() => {
          setThumbnailLoading(false);
        });
    } else if (media.thumbnailUri && !videoThumbnail) {
      setVideoThumbnail(media.thumbnailUri);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, media.uri, media.thumbnailUri, videoThumbnail, thumbnailLoading]);

  return (
    <Pressable
      onPress={onPress}
      className="relative overflow-hidden rounded-xl"
      style={{ width: size, height: size }}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={
        isVideo
          ? `Video thumbnail${media.duration ? `, duration ${formatDuration(media.duration)}` : ""}. Double tap to view`
          : "Image thumbnail. Double tap to view"
      }
    >
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
              <ActivityIndicator size="small" color="#6B7280" />
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
          uri={media.thumbnailUri || media.uri}
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

      {/* Loading overlay for lazy loading state */}
      {thumbnailLoading && (
        <View className="absolute inset-0 bg-surface-800/50 items-center justify-center">
          <ActivityIndicator size="small" color="white" />
        </View>
      )}
    </Pressable>
  );
}
