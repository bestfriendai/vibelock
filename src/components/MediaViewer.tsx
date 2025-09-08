import React, { useState, useEffect } from "react";
import { View, Modal, Pressable, Text, StatusBar, Alert } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { Video as ExpoAVVideo } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { MediaItem, Comment } from "../types";
import { useResponsiveScreen } from "../utils/responsive";

interface Props {
  visible: boolean;
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  onCommentPress?: (media: MediaItem, index: number) => void;
  commentCounts?: Record<string, number>; // mediaId -> comment count
}

export default function MediaViewer({
  visible,
  media,
  initialIndex,
  onClose,
  onCommentPress,
  commentCounts = {},
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentMedia = media[currentIndex];
  const screenData = useResponsiveScreen();
  const { width: screenWidth, height: screenHeight } = screenData;

  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Video player for video media (only for dev builds)
  const videoPlayer = useVideoPlayer(
    !isExpoGo && currentMedia?.type === "video" ? currentMedia.uri : null,
    (player) => {
      if (!isExpoGo && currentMedia?.type === "video") {
        setIsVideoLoading(true);
        setVideoError(null);

        // Simple auto-play approach
        try {
          player.play();
          setIsVideoLoading(false);
        } catch (error) {
          console.error('Video player error:', error);
          setVideoError('Failed to load video');
          setIsVideoLoading(false);
        }
      }
    }
  );

  // Reset video state when media changes
  useEffect(() => {
    if (currentMedia?.type === "video") {
      setVideoError(null);
      setIsVideoLoading(true);
    }
  }, [currentMedia?.id]);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
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
              <View style={{ width: screenWidth, height: screenHeight * 0.8 }}>
                {videoError ? (
                  <View className="flex-1 items-center justify-center bg-surface-800">
                    <Ionicons name="warning-outline" size={48} color="#EF4444" />
                    <Text className="text-text-primary text-lg mt-4 text-center px-4">
                      {videoError}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setVideoError(null);
                        setIsVideoLoading(true);
                        if (!isExpoGo && videoPlayer?.isLoaded) {
                          videoPlayer.replay();
                        }
                        // For Expo Go, the ExpoAVVideo component will handle retry automatically
                      }}
                      className="mt-4 bg-brand-red px-6 py-3 rounded-lg"
                    >
                      <Text className="text-white font-medium">Retry</Text>
                    </Pressable>
                  </View>
                ) : isExpoGo ? (
                  // Use expo-av for Expo Go compatibility
                  <ExpoAVVideo
                    source={{ uri: currentMedia.uri }}
                    useNativeControls
                    resizeMode="contain"
                    style={{
                      width: screenWidth,
                      height: screenHeight * 0.8,
                    }}
                    isLooping={false}
                    shouldPlay={false}
                  />
                ) : (
                  <>
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
                    {isVideoLoading && (
                      <View className="absolute inset-0 bg-black/50 items-center justify-center">
                        <View className="bg-white/90 rounded-lg p-4 items-center">
                          <View className="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin mb-2" />
                          <Text className="text-gray-800 font-medium">Loading video...</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
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
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <Ionicons name={currentMedia.type === "video" ? "videocam" : "image"} size={16} color="white" />
                <Text className="text-white text-sm">{currentMedia.type === "video" ? "Video" : "Image"}</Text>
                {currentMedia.type === "video" && currentMedia.duration && (
                  <Text className="text-white/70 text-sm">• {formatDuration(currentMedia.duration)}</Text>
                )}
              </View>

              {/* Comment Button */}
              {onCommentPress && (
                <View className="flex-row items-center space-x-3">
                  {/* Comment count indicator */}
                  {commentCounts[currentMedia.id] && commentCounts[currentMedia.id] > 0 && (
                    <View className="flex-row items-center">
                      <Ionicons name="chatbubble" size={14} color="white" />
                      <Text className="text-white text-sm ml-1">{commentCounts[currentMedia.id]}</Text>
                    </View>
                  )}

                  {/* Comment button */}
                  <Pressable
                    onPress={() => onCommentPress(currentMedia, currentIndex)}
                    className="bg-white/20 rounded-full px-3 py-2 flex-row items-center"
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="white" />
                    <Text className="text-white text-sm font-medium ml-2">Comment</Text>
                  </Pressable>
                </View>
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
