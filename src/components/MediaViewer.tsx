import React, { useState } from "react";
import { 
  View, 
  Modal, 
  Pressable, 
  Text, 
  Dimensions, 
  StatusBar
} from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { MediaItem } from "../types";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface Props {
  visible: boolean;
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({ visible, media, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentMedia = media[currentIndex];
  
  // Video player for video media
  const videoPlayer = useVideoPlayer(
    currentMedia?.type === "video" ? currentMedia.uri : null,
    (player) => {
      if (currentMedia?.type === "video") {
        player.play();
      }
    }
  );

  const navigateMedia = (direction: "prev" | "next") => {
    if (direction === "prev" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "next" && currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!visible || !currentMedia) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="absolute top-0 left-0 right-0 z-10 bg-black/50 px-4 py-2">
            <View className="flex-row items-center justify-between">
              <Pressable onPress={handleClose} className="p-2">
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
              <Text className="text-white font-medium">
                {currentIndex + 1} of {media.length}
              </Text>
              <View className="w-10" />
            </View>
          </View>

          {/* Media Content */}
          <View className="flex-1 items-center justify-center">
            {currentMedia.type === "image" ? (
              <Image
                source={{ uri: currentMedia.uri }}
                style={{
                  width: screenWidth,
                  height: screenHeight * 0.8,
                }}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <VideoView
                player={videoPlayer}
                style={{
                  width: screenWidth,
                  height: screenHeight * 0.8,
                }}
                allowsFullscreen
                nativeControls
                contentFit="contain"
              />
            )}
          </View>

          {/* Navigation Controls */}
          {media.length > 1 && (
            <>
              {/* Previous Button */}
              {currentIndex > 0 && (
                <Pressable
                  onPress={() => navigateMedia("prev")}
                  className="absolute left-4 top-1/2 -translate-y-6 bg-black/50 rounded-full p-3"
                >
                  <Ionicons name="chevron-back" size={24} color="white" />
                </Pressable>
              )}

              {/* Next Button */}
              {currentIndex < media.length - 1 && (
                <Pressable
                  onPress={() => navigateMedia("next")}
                  className="absolute right-4 top-1/2 -translate-y-6 bg-black/50 rounded-full p-3"
                >
                  <Ionicons name="chevron-forward" size={24} color="white" />
                </Pressable>
              )}
            </>
          )}

          {/* Bottom Info */}
          <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-4 py-3">
            <View className="flex-row items-center space-x-2">
              <Ionicons 
                name={currentMedia.type === "video" ? "videocam" : "image"} 
                size={16} 
                color="white" 
              />
              <Text className="text-white text-sm">
                {currentMedia.type === "video" ? "Video" : "Image"}
              </Text>
              {currentMedia.type === "video" && currentMedia.duration && (
                <Text className="text-white/70 text-sm">
                  • {formatDuration(currentMedia.duration)}
                </Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}