import React, { memo, useState } from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { MediaItem } from "../types";
import MediaThumbnail from "./MediaThumbnail";

interface Props {
  media: MediaItem[];
  onMediaPress: (media: MediaItem, index: number) => void;
  maxVisible?: number;
  size?: number;
}

const MediaGallery = memo(
  function MediaGallery({ media, onMediaPress, maxVisible = 4, size = 80 }: Props) {
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

    if (!media || media.length === 0) return null;

    const visibleMedia = media.slice(0, maxVisible);
    const remainingCount = media.length - maxVisible;

    const handleImageLoad = (mediaId: string) => {
      setLoadedImages((prev) => new Set(prev).add(mediaId));
    };

    return (
      <View className="mt-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="space-x-2"
          contentContainerStyle={{ paddingHorizontal: 0 }}
        >
          {visibleMedia.map((item, index) => (
            <View key={item.id} className="mr-2">
              {index === maxVisible - 1 && remainingCount > 0 ? (
                <Pressable
                  onPress={() => onMediaPress(item, index)}
                  className="relative overflow-hidden rounded-xl"
                  style={{ width: size, height: size }}
                >
                  <MediaThumbnail media={item} size={size} showPlayIcon={false} />
                  <View className="absolute inset-0 bg-black/60 items-center justify-center">
                    <Text className="text-white font-bold text-lg">+{remainingCount + 1}</Text>
                  </View>
                </Pressable>
              ) : (
                <MediaThumbnail
                  media={item}
                  size={size}
                  onPress={() => onMediaPress(item, index)}
                  onLoad={() => handleImageLoad(item.id)}
                />
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.media.length === nextProps.media.length &&
      prevProps.maxVisible === nextProps.maxVisible &&
      prevProps.size === nextProps.size &&
      prevProps.media.every((item, index) => item.id === nextProps.media[index]?.id)
    );
  },
);

export default MediaGallery;
