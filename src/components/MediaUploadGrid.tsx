import React, { useState, useEffect } from "react";
import { View, Pressable, Text, Alert, ActionSheetIOS, Platform, Linking } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { MediaItem } from "../types";
import { videoThumbnailService } from "../services/videoThumbnailService";
import { formatVideoDurationFromMs, validateVideoFile } from "../utils/videoUtils";
import { imageCompressionService } from "../services/imageCompressionService";
import MediaViewer from "./MediaViewer";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
} from "react-native-reanimated";
import { useResponsiveScreen } from "../utils/responsive";
import { handleMediaUploadError, showMediaErrorAlert } from "../utils/mediaErrorHandling";
import { launchImageLibraryWithWorkaround, isPHPhotosError3164, getPHPhotosErrorMessage } from "../utils/imagePickerWorkaround";

interface Props {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxItems?: number;
  required?: boolean;
}

export default function MediaUploadGrid({ media, onMediaChange, maxItems = 6, required = false }: Props) {
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const screenData = useResponsiveScreen();

  // Modern permission hooks (SDK 54)
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const addButtonScale = useSharedValue(1);
  const spinRotation = useSharedValue(0);

  // Safe error handler for media operations
  const handleMediaError = (error: any, context: string) => {
    const mediaError = handleMediaUploadError(error, context);
    showMediaErrorAlert(mediaError);
  };

  // Calculate responsive grid dimensions
  const ITEMS_PER_ROW = screenData.deviceInfo.isTablet ? 4 : 3;
  const GRID_PADDING = screenData.responsive.horizontalPadding;
  const GRID_GAP = screenData.responsive.cardGap;
  const ITEM_SIZE = (screenData.width - GRID_PADDING - GRID_GAP * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

  const ensurePermission = async (which: "camera" | "library"): Promise<boolean> => {
    try {
      if (which === "camera") {
        if (cameraPermission?.granted) return true;
        const res = await requestCameraPermission();
        if (res?.granted) return true;
        Alert.alert("Camera Permission Needed", "Grant camera access to take photos or videos.", [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings?.() },
        ]);
        return false;
      } else {
        if (libraryPermission?.granted) return true;
        const res = await requestLibraryPermission();
        if (res?.granted) return true;
        Alert.alert("Library Permission Needed", "Grant media library access to choose photos or videos.", [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings?.() },
        ]);
        return false;
      }
    } catch (e) {
      console.warn("Permission request failed", e);
      Alert.alert("Error", "Failed to request permissions. Please try again.");
      return false;
    }
  };

  const showMediaOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Take Video", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              openCamera("photo");
              break;
            case 2:
              openCamera("video");
              break;
            case 3:
              openLibrary();
              break;
          }
        },
      );
    } else {
      Alert.alert("Add Media", "Choose how you'd like to add media to your review", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => openCamera("photo") },
        { text: "Take Video", onPress: () => openCamera("video") },
        { text: "Choose from Library", onPress: () => openLibrary() },
      ]);
    }
  };

  const openCamera = async (type: "photo" | "video") => {
    const hasPermission = (await ensurePermission("camera")) && (await ensurePermission("library"));
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: type === "photo" ? ["images"] : ["videos"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newMediaItem: MediaItem = {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          width: asset.width,
          height: asset.height,
          duration: asset.duration || undefined,
        };

        // Validate videos but don't generate thumbnails
        if (newMediaItem.type === "video") {
          try {
            // Validate video file first
            const validation = await validateVideoFile(asset.uri);
            if (!validation.isValid) {
              Alert.alert("Video Error", validation.error || "Invalid video file");
              return;
            }
            // Video is valid, UI will show video icon automatically
          } catch (error) {
            console.warn("Failed to validate video:", error);
          }
        }

        onMediaChange([...media, newMediaItem]);
      }
    } catch (error) {
      handleMediaError(error, "camera capture");
    } finally {
      setIsLoading(false);
    }
  };

  const openLibrary = async () => {
    const hasPermission = await ensurePermission("library");
    if (!hasPermission) return;

    setIsLoading(true);
    try {

      const remainingSlots = maxItems - media.length;

      // Use the workaround utility to handle PHPhotosErrorDomain 3164
      const result = await launchImageLibraryWithWorkaround({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
        allowsEditing: remainingSlots === 1,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60,
        maxRetries: 3,
        retryDelay: 500,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newMediaItems: MediaItem[] = [];

        for (const [index, asset] of result.assets.entries()) {
          let processedUri = asset.uri;

          // Compress images before adding to media items
          if (asset.type === "image") {
            try {
              const compressionResult = await imageCompressionService.compressImage(
                asset.uri,
                imageCompressionService.getRecommendedOptions("review"),
              );

              if (compressionResult.success && compressionResult.uri) {
                processedUri = compressionResult.uri;

                // Log compression results
                if (compressionResult.originalSize && compressionResult.compressedSize) {
                  const originalSizeKB = Math.round(compressionResult.originalSize / 1024);
                  const compressedSizeKB = Math.round(compressionResult.compressedSize / 1024);
                  const savings = Math.round((1 - compressionResult.compressionRatio!) * 100);

                  console.log(`📸 Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${savings}% smaller)`);
                }
              } else {
                console.warn("Image compression failed, using original:", compressionResult.error);
              }
            } catch (error) {
              console.warn("Image compression error, using original:", error);
            }
          }

          const mediaItem: MediaItem = {
            id: `media_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 11)}`,
            uri: processedUri,
            type: asset.type === "video" ? "video" : "image",
            width: asset.width,
            height: asset.height,
            duration: asset.duration || undefined,
          };

          // Validate videos but don't generate thumbnails
          if (mediaItem.type === "video") {
            try {
              // Validate video file first
              const validation = await validateVideoFile(asset.uri);
              if (!validation.isValid) {
                console.warn("Invalid video file:", validation.error);
                // Skip this video
                continue;
              }
              // Video is valid, UI will show video icon automatically
            } catch (error) {
              console.warn("Failed to validate video:", error);
            }
          }

          newMediaItems.push(mediaItem);
        }

        onMediaChange([...media, ...newMediaItems]);
      }
    } catch (error: any) {
      console.warn("Media library selection error:", error);

      // Use the enhanced error handling for PHPhotosErrorDomain issues
      if (isPHPhotosError3164(error)) {
        Alert.alert(
          "Photo Library Access Issue",
          getPHPhotosErrorMessage(error),
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: () => openLibrary() },
            { text: "Open Settings", onPress: () => Linking.openSettings?.() },
          ]
        );
      } else {
        handleMediaError(error, "media library selection");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeMedia = (index: number) => {
    Alert.alert("Remove Media", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const newMedia = media.filter((_, i) => i !== index);
          onMediaChange(newMedia);
        },
      },
    ]);
  };

  const handleMediaPress = (index: number) => {
    setSelectedMediaIndex(index);
    setShowMediaViewer(true);
  };

  const handleAddPress = () => {
    addButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
    showMediaOptions();
  };

  const addButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const spinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  // Start spinning animation when loading
  useEffect(() => {
    if (isLoading) {
      spinRotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    } else {
      spinRotation.value = 0;
    }
  }, [isLoading]);

  const canAddMore = media.length < maxItems;
  const hasMinimumImages = media.filter((item) => item.type === "image").length >= 1;

  return (
    <View>
      {/* Media Grid */}
      <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
        {media.map((item, index) => (
          <View key={item.id} style={{ width: ITEM_SIZE, height: ITEM_SIZE }}>
            <Pressable
              onPress={() => handleMediaPress(index)}
              className="relative rounded-xl overflow-hidden"
              style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${item.type === "video" ? "Video" : "Image"} ${index + 1} of ${media.length}${item.duration ? `, duration ${formatVideoDurationFromMs(item.duration)}` : ""}`}
              accessibilityHint="Double tap to view or edit this media item"
            >
              <Image
                source={{ uri: item.uri }}
                style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                contentFit="cover"
                transition={200}
                priority="low"
                cachePolicy="memory-disk"
                placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
              />

              {/* Video indicator */}
              {item.type === "video" && (
                <View className="absolute inset-0 bg-black/30 items-center justify-center">
                  <View className="bg-white/90 rounded-full p-2">
                    <Ionicons name="play" size={16} color="#000" />
                  </View>
                  {item.duration && (
                    <View className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded">
                      <Text className="text-white text-xs font-medium">{formatVideoDurationFromMs(item.duration)}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Remove button */}
              <Pressable
                onPress={() => removeMedia(index)}
                className="absolute top-2 right-2 bg-black/70 rounded-full p-1"
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="white" />
              </Pressable>
            </Pressable>
          </View>
        ))}

        {/* Add Media Button */}
        {canAddMore && (
          <Animated.View style={[addButtonAnimatedStyle, { width: ITEM_SIZE, height: ITEM_SIZE }]}>
            <Pressable
              onPress={handleAddPress}
              className="border-2 border-dashed border-border rounded-xl items-center justify-center bg-surface-800"
              style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
              disabled={isLoading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Add media. Currently have ${media.length} of ${maxItems} items`}
              accessibilityHint="Double tap to add photos or videos"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <View className="items-center">
                  <Animated.View
                    style={[
                      spinAnimatedStyle,
                      {
                        width: 24,
                        height: 24,
                        borderWidth: 2,
                        borderColor: "#DC2626",
                        borderTopColor: "transparent",
                        borderRadius: 12,
                        marginBottom: 8,
                      },
                    ]}
                  />
                  <Text className="text-text-muted text-xs">Loading...</Text>
                </View>
              ) : (
                <View className="items-center">
                  <Ionicons name="add" size={24} color="#9CA3AF" />
                  <Text className="text-text-muted text-xs mt-1 text-center">Add{"\n"}Media</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Status Messages */}
      <View className="mt-4">
        {required && !hasMinimumImages && (
          <View className="flex-row items-center">
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text className="text-red-500 text-sm ml-2">At least one image is required</Text>
          </View>
        )}

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-text-muted text-sm">
            {media.length} of {maxItems} items added
          </Text>
          {media.length > 0 && (
            <Text className="text-text-muted text-sm">
              {media.filter((item) => item.type === "image").length} image(s),{" "}
              {media.filter((item) => item.type === "video").length} video(s)
            </Text>
          )}
        </View>
      </View>

      {/* Media Viewer Modal */}
      <MediaViewer
        visible={showMediaViewer}
        media={media}
        initialIndex={selectedMediaIndex}
        onClose={() => setShowMediaViewer(false)}
      />
    </View>
  );
}
