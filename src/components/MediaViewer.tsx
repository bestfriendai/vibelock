import React, { useState, useEffect, useCallback } from "react";
import { View, Modal, Pressable, Text, StatusBar, Share, Dimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { MediaItem } from "../types";
import { useResponsiveScreen } from "../utils/responsive";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import { ZoomableImage } from "./ZoomableImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const [showControls, setShowControls] = useState(true);
  const currentMedia = media[currentIndex];
  const screenData = useResponsiveScreen();
  const { width: screenWidth, height: screenHeight } = screenData;

  const isExpoGo = Constants.executionEnvironment === "storeClient";
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Animation values
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const closeButtonScale = useSharedValue(1);
  const controlsOpacity = useSharedValue(1);

  // Video player for video media
  const videoPlayer = useVideoPlayer(currentMedia?.type === "video" ? currentMedia.uri : null, (player) => {
    if (currentMedia?.type === "video") {
      setIsVideoLoading(true);
      setVideoError(null);

      // Simple auto-play approach
      try {
        player.play();
        setIsVideoLoading(false);
      } catch (error) {
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

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
      controlsOpacity.value = withTiming(0, { duration: 300 });
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, currentIndex]);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    const newShowControls = !showControls;
    setShowControls(newShowControls);
    controlsOpacity.value = withTiming(newShowControls ? 1 : 0, { duration: 300 });
  }, [showControls]);

  // Gesture handler for swipe navigation using new Gesture API
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setShowControls)(true);
      controlsOpacity.value = withTiming(1, { duration: 200 });
    })
    .onUpdate((event) => {
      // Only allow horizontal swipes when not zoomed
      if (currentZoom <= 1.1) {
        translateX.value = event.translationX;

        // Scale effect for better visual feedback
        const progress = Math.abs(event.translationX) / SCREEN_WIDTH;
        scale.value = interpolate(progress, [0, 0.5], [1, 0.9], Extrapolation.CLAMP);
        opacity.value = interpolate(progress, [0, 0.5], [1, 0.7], Extrapolation.CLAMP);
      }
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH * 0.25;
      const velocity = event.velocityX;

      if (currentZoom <= 1.1) {
        if (event.translationX > threshold || velocity > 1000) {
          // Swipe right - go to previous
          if (currentIndex > 0) {
            translateX.value = withSpring(SCREEN_WIDTH, { velocity: velocity * 0.5 });
            runOnJS(setCurrentIndex)(currentIndex - 1);
          } else {
            translateX.value = withSpring(0);
          }
        } else if (event.translationX < -threshold || velocity < -1000) {
          // Swipe left - go to next
          if (currentIndex < media.length - 1) {
            translateX.value = withSpring(-SCREEN_WIDTH, { velocity: velocity * 0.5 });
            runOnJS(setCurrentIndex)(currentIndex + 1);
          } else {
            translateX.value = withSpring(0);
          }
        } else {
          // Return to center
          translateX.value = withSpring(0);
        }

        // Reset scale and opacity
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
      }
    });

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeButtonScale.value }],
  }));

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const handleShare = useCallback(async () => {
    if (!currentMedia) return;

    try {
      await Share.share({
        message: `Check out this ${currentMedia.type}`,
        url: currentMedia.uri,
      });
    } catch (error) {}
  }, [currentMedia]);

  // Enhanced close handler with animation
  const handleClose = useCallback(() => {
    closeButtonScale.value = withSpring(0.8, { duration: 100 }, () => {
      closeButtonScale.value = withSpring(1, { duration: 100 });
    });

    setCurrentZoom(1);
    translateX.value = 0;
    scale.value = 1;
    opacity.value = 1;
    onClose();
  }, [onClose]);

  // Reset animation values when index changes
  useEffect(() => {
    translateX.value = withSpring(0);
    scale.value = withSpring(1);
    opacity.value = withSpring(1);
  }, [currentIndex]);

  // Early return after all hooks
  if (!visible || !currentMedia) return null;

  return (
    <ComponentErrorBoundary componentName="MediaViewer">
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <StatusBar hidden />
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[{ flex: 1 }, containerAnimatedStyle]}>
                {/* Enhanced Header with auto-hide */}
                <Animated.View
                  style={[controlsAnimatedStyle]}
                  className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 py-3"
                >
                  <View className="flex-row items-center justify-between">
                    <Animated.View style={closeButtonAnimatedStyle}>
                      <Pressable
                        onPress={handleClose}
                        className="bg-black/30 rounded-full p-3 backdrop-blur-sm"
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Close media viewer"
                        accessibilityHint="Double tap to close"
                        onPressIn={() => {
                          closeButtonScale.value = withSpring(0.9, { duration: 100 });
                        }}
                        onPressOut={() => {
                          closeButtonScale.value = withSpring(1, { duration: 100 });
                        }}
                      >
                        <Ionicons name="close" size={26} color="white" />
                      </Pressable>
                    </Animated.View>

                    <View className="bg-black/30 rounded-full px-4 py-2 backdrop-blur-sm">
                      <Text className="text-white font-semibold text-base">
                        {currentIndex + 1} of {media.length}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setShowInfo(!showInfo)}
                      className="bg-black/30 rounded-full p-3 backdrop-blur-sm"
                    >
                      <Ionicons name="information-circle-outline" size={26} color="white" />
                    </Pressable>
                  </View>
                </Animated.View>

                {/* Content Container */}
                <View className="flex-1 items-center justify-center">
                  {/* Tap to toggle controls */}
                  <Pressable onPress={toggleControls} className="absolute inset-0 z-10" />

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
                        <View className="flex-1 items-center justify-center bg-gray-900">
                          <Ionicons name="warning-outline" size={48} color="#EF4444" />
                          <Text className="text-white text-lg mt-4 text-center px-4">{videoError}</Text>
                          <Pressable
                            onPress={() => {
                              setVideoError(null);
                              setIsVideoLoading(true);
                              if (!isExpoGo && videoPlayer) {
                                videoPlayer.replay();
                              }
                            }}
                            className="mt-4 bg-red-600 px-6 py-3 rounded-lg"
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
                                <View className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2" />
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

                {/* Enhanced Action Buttons */}
                <Animated.View
                  style={[controlsAnimatedStyle]}
                  className="absolute bottom-20 left-0 right-0 flex-row justify-center gap-6 px-4"
                >
                  <Pressable
                    onPress={() => setShowInfo(!showInfo)}
                    className="bg-black/60 rounded-full p-3 backdrop-blur-sm"
                    accessibilityRole="button"
                    accessibilityLabel="Toggle media information"
                  >
                    <Ionicons name="information-circle-outline" size={24} color="white" />
                  </Pressable>
                  <Pressable
                    onPress={handleShare}
                    className="bg-black/60 rounded-full p-3 backdrop-blur-sm"
                    accessibilityRole="button"
                    accessibilityLabel="Share media"
                  >
                    <Ionicons name="share-outline" size={24} color="white" />
                  </Pressable>
                  {onCommentPress && (
                    <Pressable
                      onPress={() => currentMedia && onCommentPress(currentMedia, currentIndex)}
                      className="bg-black/60 rounded-full p-3 flex-row items-center backdrop-blur-sm"
                      accessibilityRole="button"
                      accessibilityLabel="Add comment"
                    >
                      <Ionicons name="chatbubble-outline" size={24} color="white" />
                      {(() => {
                        const mediaId = currentMedia?.id;
                        const count = mediaId ? commentCounts[mediaId] || 0 : 0;
                        return count > 0 ? (
                          <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center ml-2">
                            <Text className="text-white text-xs font-bold">{count > 99 ? "99+" : count}</Text>
                          </View>
                        ) : null;
                      })()}
                    </Pressable>
                  )}
                </Animated.View>

                {/* Enhanced Navigation Controls */}
                {media.length > 1 && currentZoom === 1 && (
                  <Animated.View style={[controlsAnimatedStyle]}>
                    {/* Previous Button */}
                    {currentIndex > 0 && (
                      <Pressable
                        onPress={() => navigateMedia("prev")}
                        className="absolute left-4 top-1/2 -translate-y-6 bg-black/60 rounded-full p-3 backdrop-blur-sm"
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Go to previous media, ${currentIndex} of ${media.length}`}
                        accessibilityHint="Double tap to view previous"
                      >
                        <Ionicons name="chevron-back" size={28} color="white" />
                      </Pressable>
                    )}

                    {/* Next Button */}
                    {currentIndex < media.length - 1 && (
                      <Pressable
                        onPress={() => navigateMedia("next")}
                        className="absolute right-4 top-1/2 -translate-y-6 bg-black/60 rounded-full p-3 backdrop-blur-sm"
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Go to next media, ${currentIndex + 2} of ${media.length}`}
                        accessibilityHint="Double tap to view next"
                      >
                        <Ionicons name="chevron-forward" size={28} color="white" />
                      </Pressable>
                    )}
                  </Animated.View>
                )}

                {/* Enhanced Bottom Info */}
                <Animated.View
                  style={[controlsAnimatedStyle]}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-2">
                      <View className="bg-black/40 rounded-full p-2">
                        <Ionicons name={currentMedia.type === "video" ? "videocam" : "image"} size={16} color="white" />
                      </View>
                      <Text className="text-white text-sm font-medium">
                        {currentMedia.type === "video" ? "Video" : "Image"}
                      </Text>
                      {currentMedia.type === "video" && currentMedia.duration && (
                        <Text className="text-white/70 text-sm">• {formatDuration(currentMedia.duration)}</Text>
                      )}
                    </View>

                    {/* Enhanced Comment Button */}
                    {onCommentPress && (
                      <View className="flex-row items-center space-x-3">
                        {/* Comment count indicator */}
                        {(() => {
                          const mediaId = currentMedia?.id;
                          const count = mediaId ? commentCounts[mediaId] || 0 : 0;
                          return count > 0 ? (
                            <View className="flex-row items-center bg-black/40 rounded-full px-2 py-1">
                              <Ionicons name="chatbubble" size={14} color="white" />
                              <Text className="text-white text-sm ml-1 font-medium">{count}</Text>
                            </View>
                          ) : null;
                        })()}

                        {/* Comment button */}
                        <Pressable
                          onPress={() => onCommentPress(currentMedia, currentIndex)}
                          className="bg-white/20 rounded-full px-4 py-2 flex-row items-center backdrop-blur-sm"
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
                </Animated.View>
              </Animated.View>
            </GestureDetector>
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
