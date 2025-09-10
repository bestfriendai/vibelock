import React, { useState, useRef } from "react";
import { View, ScrollView, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../types";

const { width: screenWidth } = Dimensions.get("window");

interface Props {
  media: MediaItem[];
  height?: number;
  onImagePress?: (media: MediaItem, index: number) => void;
  showCounter?: boolean;
  showFullScreenButton?: boolean;
  onCommentPress?: (media: MediaItem, index: number) => void;
  commentCounts?: Record<string, number>; // mediaId -> comment count
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ImageCarousel({
  media,
  height = 300,
  onImagePress,
  showCounter = true,
  showFullScreenButton = true,
  onCommentPress,
  commentCounts = {},
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Prefetch next/prev images to improve swipe smoothness
  React.useEffect(() => {
    if (!media || media.length === 0) return;

    const uris: string[] = [];
    const push = (u?: string | null) => {
      if (u && /^https?:\/\//.test(u)) uris.push(u);
    };

    const next = media[currentIndex + 1];
    const prev = media[currentIndex - 1];

    if (next) push(next.type === "video" ? next.thumbnailUri || next.uri : next.uri);
    if (prev) push(prev.type === "video" ? prev.thumbnailUri || prev.uri : prev.uri);

    uris.forEach((u) => {
      try {
        Image.prefetch(u);
      } catch {}
    });
  }, [currentIndex, media]);

  if (!media || media.length === 0) {
    console.log("ImageCarousel: No media provided");
    return null;
  }

  console.log("ImageCarousel: Rendering with media:", media.length, "items");

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    if (pageNum !== currentIndex && pageNum >= 0 && pageNum < media.length) {
      setCurrentIndex(pageNum);
    }
  };

  const scrollToIndex = (index: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
  };

  const handleImagePress = () => {
    if (onImagePress) {
      onImagePress(media[currentIndex], currentIndex);
    }
  };

  return (
    <View className="relative">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="rounded-xl overflow-hidden"
        accessible={true}
        accessibilityRole="scrollbar"
        accessibilityLabel={`Image carousel with ${media.length} images`}
        accessibilityHint="Swipe left or right to navigate between images"
      >
        {media.map((item, index) => (
          <Pressable
            key={`${item.id}-${index}`}
            onPress={handleImagePress}
            style={{ width: screenWidth - 32, height }} // Account for horizontal padding
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={`Image ${index + 1} of ${media.length}`}
            accessibilityHint="Double tap to view full screen"
          >
            {item.type === "video" ? (
              // If we have a thumbnail for the video, show it; otherwise show a neutral placeholder
              item.thumbnailUri && /^https?:\/\//.test(item.thumbnailUri) ? (
                <Image
                  source={{ uri: item.thumbnailUri }}
                  style={{ width: "100%", height }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                />
              ) : (
                <View style={{ width: "100%", height }} className="bg-surface-700 items-center justify-center">
                  <Ionicons name="videocam" size={60} color="#6B7280" />
                </View>
              )
            ) : (
              // Show regular image
              <Image
                source={{ uri: item.uri }}
                style={{ width: "100%", height }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              />
            )}

            {/* Video play overlay */}
            {item.type === "video" && (
              <View className="absolute inset-0 bg-black/30 items-center justify-center">
                <View className="bg-white/90 rounded-full p-3">
                  <Ionicons name="play" size={24} color="#000" />
                </View>
                {/* Video duration badge */}
                {item.duration && (
                  <View className="absolute bottom-4 right-4 bg-black/70 px-2 py-1 rounded">
                    <Text className="text-white text-sm font-medium">{formatDuration(item.duration)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Comment indicator and button */}
            <View className="absolute bottom-3 right-3 flex-row items-center space-x-2">
              {/* Comment count indicator */}
              {commentCounts[item.id] && commentCounts[item.id] > 0 && (
                <View className="bg-black/70 rounded-full px-2 py-1 flex-row items-center">
                  <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                  <Text className="text-white text-xs font-medium ml-1">{commentCounts[item.id]}</Text>
                </View>
              )}

              {/* Comment button */}
              {onCommentPress && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onCommentPress(
                      item,
                      media.findIndex((m) => m.id === item.id),
                    );
                  }}
                  className="bg-black/70 rounded-full p-2"
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Image Counter */}
      {showCounter && media.length > 1 && (
        <View className="absolute top-4 right-4 bg-surface-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-surface-700/50">
          <Text className="text-text-primary text-sm font-medium">
            {currentIndex + 1} of {media.length}
          </Text>
        </View>
      )}

      {/* Full Screen Button */}
      {showFullScreenButton && (
        <Pressable
          onPress={handleImagePress}
          className="absolute top-4 left-4 bg-surface-900/80 backdrop-blur-sm rounded-full p-2.5 border border-surface-700/50"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View media full screen"
          accessibilityHint="Double tap to open full screen viewer"
        >
          <Ionicons name="expand" size={16} color="#F3F4F6" />
        </Pressable>
      )}

      {/* Page Indicators */}
      {media.length > 1 && (
        <View className="flex-row justify-center mt-4 space-x-2">
          {media.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex ? "bg-brand-red w-6" : "bg-surface-600"
              }`}
            />
          ))}
        </View>
      )}

      {/* Navigation Arrows for multiple images */}
      {media.length > 1 && (
        <>
          {/* Previous Button */}
          {currentIndex > 0 && (
            <Pressable
              onPress={() => scrollToIndex(currentIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-4 bg-surface-900/80 backdrop-blur-sm rounded-full p-4 border border-surface-700/50"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Go to previous image, ${currentIndex} of ${media.length}`}
              accessibilityHint="Double tap to view previous image"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
            </Pressable>
          )}

          {/* Next Button */}
          {currentIndex < media.length - 1 && (
            <Pressable
              onPress={() => scrollToIndex(currentIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-4 bg-surface-900/80 backdrop-blur-sm rounded-full p-4 border border-surface-700/50"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Go to next image, ${currentIndex + 2} of ${media.length}`}
              accessibilityHint="Double tap to view next image"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={20} color="#F3F4F6" />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
