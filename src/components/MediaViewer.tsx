import React, { useState, useEffect, useCallback } from "react";
import { View, Modal, Pressable, Text, StatusBar, Share } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { MediaItem } from "../types";
import { useResponsiveScreen } from "../utils/responsive";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import { ZoomableImage } from "./ZoomableImage";

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
  const [currentZoom, setCurrentZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const currentMedia = media[currentIndex];
  const screenData = useResponsiveScreen();
  const { width: screenWidth, height: screenHeight } = screenData;

  const isExpoGo = Constants.executionEnvironment === "storeClient";
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Video player for video media
  const videoPlayer = useVideoPlayer(currentMedia?.type === "video" ? currentMedia.uri : null, (player) => {
    if (currentMedia?.type === "video") {
      setIsVideoLoading(true);
      setVideoError(null);

      // Simple auto-play approach
      try {
        player.play();
        setIsVideoLoading(false);
      } catch {
        setVideoError("Failed to load video");
        setIsVideoLoading(false);
      }
    }
  });

  // Reset video state when media changes
  useEffect(() => {
    if (currentMedia?.type === "video") {
      setVideoError(null);
      setIsVideoLoading(true);
    }
  }, [currentMedia?.id]);

  const navigateMedia = (direction: "prev" | "next") => {
    // Reset zoom when navigating
    setCurrentZoom(1);

    if (direction === "prev" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "next" && currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleShare = useCallback(async () => {
    if (!currentMedia) return;

    try {
      await Share.share({
        message: `Check out this ${currentMedia.type}`,
        url: currentMedia.uri,
      });
    } catch {}
  }, [currentMedia]);

  const handleClose = () => {
    onClose();
  };

  if (!visible || !currentMedia) return null;

  return (
    <ComponentErrorBoundary componentName="MediaViewer">
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <StatusBar hidden />
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="absolute top-0 left-0 right-0 z-10 bg-black/50 px-4 py-2">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={handleClose}
                  className="p-2"
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Close media viewer"
                  accessibilityHint="Double tap to close"
                >
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
                <ZoomableImage
                  uri={currentMedia.uri}
                  width={screenWidth}
                  height={screenHeight * 0.8}
                  minZoom={1}
                  maxZoom={4}
                  doubleTapScale={2}
                  onZoomChange={setCurrentZoom}
                  accessible={true}
                  accessibilityLabel="Zoomable image"
                />
              ) : (
                <View style={{ width: screenWidth, height: screenHeight * 0.8 }}>
                  {videoError ? (
                    <View className="flex-1 items-center justify-center bg-surface-800">
                      <Ionicons name="warning-outline" size={48} color="#EF4444" />
                      <Text className="text-text-primary text-lg mt-4 text-center px-4">{videoError}</Text>
                      <Pressable
                        onPress={() => {
                          setVideoError(null);
                          setIsVideoLoading(true);
                          if (!isExpoGo && videoPlayer) {
                            videoPlayer.replay();
                          }
                          // For Expo Go, the ExpoAVVideo component will handle retry automatically
                        }}
                        className="mt-4 bg-brand-red px-6 py-3 rounded-lg"
                      >
                        <Text className="text-white font-medium">Retry</Text>
                      </Pressable>
                    </View>
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

            {/* Media Info Overlay */}
            {showInfo && currentMedia && (
              <View className="absolute top-20 left-0 right-0 bg-black/70 p-4">
                <Text className="text-white text-sm mb-1">{currentMedia.type === "image" ? "Image" : "Video"}</Text>
                {currentMedia.width && currentMedia.height && (
                  <Text className="text-white text-sm mb-1">
                    {currentMedia.width} × {currentMedia.height}
                  </Text>
                )}
                {currentMedia.duration && (
                  <Text className="text-white text-sm mb-1">Duration: {Math.round(currentMedia.duration)}s</Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View className="absolute bottom-20 left-0 right-0 flex-row justify-center gap-6 px-4">
              <Pressable onPress={() => setShowInfo(!showInfo)} className="bg-black/50 rounded-full p-3">
                <Ionicons name="information-circle-outline" size={24} color="white" />
              </Pressable>
              <Pressable onPress={handleShare} className="bg-black/50 rounded-full p-3">
                <Ionicons name="share-outline" size={24} color="white" />
              </Pressable>
              {onCommentPress && (
                <Pressable
                  onPress={() => currentMedia && onCommentPress(currentMedia, currentIndex)}
                  className="bg-black/50 rounded-full p-3 flex-row items-center"
                >
                  <Ionicons name="chatbubble-outline" size={24} color="white" />
                  {(() => {
                    const mediaId = currentMedia?.id;
                    const count = mediaId ? commentCounts[mediaId] || 0 : 0;
                    return count > 0 ? <Text className="text-white text-xs ml-1">{count}</Text> : null;
                  })()}
                </Pressable>
              )}
            </View>

            {/* Navigation Controls */}
            {media.length > 1 && currentZoom === 1 && (
              <>
                {/* Previous Button */}
                {currentIndex > 0 && (
                  <Pressable
                    onPress={() => navigateMedia("prev")}
                    className="absolute left-4 top-1/2 -translate-y-6 bg-black/50 rounded-full p-3"
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to previous media, ${currentIndex} of ${media.length}`}
                    accessibilityHint="Double tap to view previous"
                  >
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </Pressable>
                )}

                {/* Next Button */}
                {currentIndex < media.length - 1 && (
                  <Pressable
                    onPress={() => navigateMedia("next")}
                    className="absolute right-4 top-1/2 -translate-y-6 bg-black/50 rounded-full p-3"
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to next media, ${currentIndex + 2} of ${media.length}`}
                    accessibilityHint="Double tap to view next"
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
                    {(() => {
                      const mediaId = currentMedia?.id;
                      const count = mediaId ? commentCounts[mediaId] || 0 : 0;
                      return count > 0 ? (
                        <View className="flex-row items-center">
                          <Ionicons name="chatbubble" size={14} color="white" />
                          <Text className="text-white text-sm ml-1">{count}</Text>
                        </View>
                      ) : null;
                    })()}

                    {/* Comment button */}
                    <Pressable
                      onPress={() => onCommentPress(currentMedia, currentIndex)}
                      className="bg-white/20 rounded-full px-3 py-2 flex-row items-center"
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Comment on this media"
                      accessibilityHint="Double tap to add a comment"
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
    </ComponentErrorBoundary>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
