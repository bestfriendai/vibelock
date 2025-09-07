import React, { useState } from "react";
import { View, Pressable, Text, Alert, Dimensions, ActionSheetIOS, Platform } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { MediaItem } from "../types";
import MediaViewer from "./MediaViewer";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";

const { width: screenWidth } = Dimensions.get("window");
const GRID_PADDING = 32; // 16px on each side
const GRID_GAP = 12;
const ITEMS_PER_ROW = 3;
const ITEM_SIZE = (screenWidth - GRID_PADDING - GRID_GAP * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

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

  const addButtonScale = useSharedValue(1);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || libraryStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please grant camera and photo library permissions to add media to your review.",
        [{ text: "OK" }],
      );
      return false;
    }
    return true;
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
    const hasPermission = await requestPermissions();
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

        onMediaChange([...media, newMediaItem]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture media. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const remainingSlots = maxItems - media.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
        allowsEditing: remainingSlots === 1,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newMediaItems: MediaItem[] = result.assets.map((asset, index) => ({
          id: `media_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 11)}`,
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          width: asset.width,
          height: asset.height,
          duration: asset.duration || undefined,
        }));

        onMediaChange([...media, ...newMediaItems]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select media. Please try again.");
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
    addButtonScale.value = withSequence(withTiming(0.95, { duration: 100 }), withSpring(1, { duration: 200 }));
    showMediaOptions();
  };

  const addButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

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
                      <Text className="text-white text-xs font-medium">{Math.floor(item.duration / 1000)}s</Text>
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
            >
              {isLoading ? (
                <View className="items-center">
                  <View className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin mb-2" />
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

// Helper function for animation sequence
function withSequence(...animations: any[]) {
  return animations.reduce((acc, animation) => {
    return acc ? withTiming(animation) : animation;
  });
}
