import React, { useState, useRef } from "react";
import { 
  View, 
  ScrollView, 
  Dimensions, 
  NativeScrollEvent, 
  NativeSyntheticEvent,
  Text,
  Pressable
} from "react-native";
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
}

export default function ImageCarousel({ 
  media, 
  height = 300, 
  onImagePress,
  showCounter = true,
  showFullScreenButton = true
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!media || media.length === 0) return null;

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
        animated: true
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
      >
        {media.map((item) => (
          <Pressable
            key={item.id}
            onPress={handleImagePress}
            style={{ width: screenWidth - 32, height }} // Account for horizontal padding
          >
            <Image
              source={{ uri: item.uri }}
              style={{ width: "100%", height }}
              contentFit="cover"
              transition={200}
              placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            />
            
            {/* Video play overlay */}
            {item.type === "video" && (
              <View className="absolute inset-0 bg-black/30 items-center justify-center">
                <View className="bg-white/90 rounded-full p-3">
                  <Ionicons name="play" size={24} color="#000" />
                </View>
              </View>
            )}
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
                index === currentIndex 
                  ? "bg-brand-red w-6" 
                  : "bg-surface-600"
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
              className="absolute left-3 top-1/2 -translate-y-4 bg-surface-900/80 backdrop-blur-sm rounded-full p-3 border border-surface-700/50"
            >
              <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
            </Pressable>
          )}

          {/* Next Button */}
          {currentIndex < media.length - 1 && (
            <Pressable
              onPress={() => scrollToIndex(currentIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-4 bg-surface-900/80 backdrop-blur-sm rounded-full p-3 border border-surface-700/50"
            >
              <Ionicons name="chevron-forward" size={20} color="#F3F4F6" />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}