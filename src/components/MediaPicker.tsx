import React, { useState } from "react";
import { View, Pressable, Text, Alert, Modal, Image, Dimensions } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "../providers/ThemeProvider";
import { AppError, ErrorType } from "../utils/errorHandling";

const { width: screenWidth } = Dimensions.get("window");

interface MediaItem {
  uri: string;
  type: "image" | "video" | "document";
  name?: string;
  size?: number;
  mimeType?: string;
}

interface MediaPickerProps {
  onMediaSelect: (media: MediaItem) => void;
  onClose: () => void;
  visible: boolean;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({ onMediaSelect, onClose, visible }) => {
  const { colors } = useTheme();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // File validation constants (matching StorageService)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
  const ALLOWED_AUDIO_TYPES = ["audio/mp4", "audio/mpeg", "audio/wav"];

  /**
   * Validate selected media file
   */
  const validateMediaFile = (asset: any, type: "image" | "video" | "document"): void => {
    // Check file size
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      throw new AppError("File too large (max 50MB)", ErrorType.VALIDATION, "FILE_TOO_LARGE");
    }

    // Check file type for images and videos
    if (type === "image") {
      const extension = asset.fileName?.toLowerCase().split(".").pop();
      const mimeType =
        extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : extension === "png"
            ? "image/png"
            : extension === "webp"
              ? "image/webp"
              : "unknown";

      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        throw new AppError(`Invalid image type: ${extension}`, ErrorType.VALIDATION, "INVALID_FILE_TYPE");
      }
    } else if (type === "video") {
      const extension = asset.fileName?.toLowerCase().split(".").pop();
      const mimeType = extension === "mp4" ? "video/mp4" : extension === "mov" ? "video/quicktime" : "unknown";

      if (!ALLOWED_VIDEO_TYPES.includes(mimeType)) {
        throw new AppError(`Invalid video type: ${extension}`, ErrorType.VALIDATION, "INVALID_FILE_TYPE");
      }
    }
  };

  const scale = useSharedValue(1);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || mediaLibraryStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please grant camera and media library permissions to share photos and videos.",
        [{ text: "OK" }],
      );
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        try {
          // Validate the selected image
          validateMediaFile(asset, "image");

          const media: MediaItem = {
            uri: asset.uri,
            type: "image",
            name: asset.fileName || "camera_image.jpg",
            size: asset.fileSize,
          };

          setSelectedMedia(media);
          setShowPreview(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          if (error instanceof AppError) {
            Alert.alert("Invalid File", error.message);
          } else {
            Alert.alert("Error", "Failed to validate selected image");
          }
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaType = asset.type === "video" ? "video" : "image";

        try {
          // Validate the selected media
          validateMediaFile(asset, mediaType);

          const media: MediaItem = {
            uri: asset.uri,
            type: mediaType,
            name: asset.fileName || `media_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
            size: asset.fileSize,
          };

          setSelectedMedia(media);
          setShowPreview(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          if (error instanceof AppError) {
            Alert.alert("Invalid File", error.message);
          } else {
            Alert.alert("Error", "Failed to validate selected media");
          }
        }
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to pick media. Please try again.");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const media: MediaItem = {
          uri: asset.uri,
          type: "document",
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
        };

        onMediaSelect(media);
        onClose();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const handleSendMedia = () => {
    if (selectedMedia) {
      onMediaSelect(selectedMedia);
      onClose();
      setShowPreview(false);
      setSelectedMedia(null);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setSelectedMedia(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <>
      {/* Media Picker Modal */}
      <Modal
        visible={visible && !showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between p-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-lg font-semibold" style={{ color: colors.text.primary }}>
              Share Media
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Media Options */}
          <View className="flex-1 p-6">
            <View className="space-y-4">
              {/* Camera */}
              <Animated.View style={animatedStyle}>
                <Pressable
                  onPress={pickImageFromCamera}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  className="flex-row items-center p-4 rounded-xl"
                  style={{ backgroundColor: colors.surface[700] }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: colors.brand.red }}
                  >
                    <Ionicons name="camera" size={24} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ color: colors.text.primary }}>
                      Camera
                    </Text>
                    <Text className="text-sm" style={{ color: colors.text.muted }}>
                      Take a photo
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              {/* Gallery */}
              <Animated.View style={animatedStyle}>
                <Pressable
                  onPress={pickImageFromGallery}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  className="flex-row items-center p-4 rounded-xl"
                  style={{ backgroundColor: colors.surface[700] }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: "#10B981" }}
                  >
                    <Ionicons name="images" size={24} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ color: colors.text.primary }}>
                      Photo & Video
                    </Text>
                    <Text className="text-sm" style={{ color: colors.text.muted }}>
                      Choose from gallery
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              {/* Documents */}
              <Animated.View style={animatedStyle}>
                <Pressable
                  onPress={pickDocument}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  className="flex-row items-center p-4 rounded-xl"
                  style={{ backgroundColor: colors.surface[700] }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: "#3B82F6" }}
                  >
                    <Ionicons name="document" size={24} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium" style={{ color: colors.text.primary }}>
                      Document
                    </Text>
                    <Text className="text-sm" style={{ color: colors.text.muted }}>
                      Share files and documents
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Media Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelPreview}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between p-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Pressable onPress={handleCancelPreview}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </Pressable>
            <Text className="text-lg font-semibold" style={{ color: colors.text.primary }}>
              Preview
            </Text>
            <Pressable
              onPress={handleSendMedia}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.brand.red }}
            >
              <Text className="text-white font-medium">Send</Text>
            </Pressable>
          </View>

          {/* Media Preview */}
          <View className="flex-1 items-center justify-center p-4">
            {selectedMedia?.type === "image" && (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={{
                  width: screenWidth - 32,
                  height: (screenWidth - 32) * 0.75,
                  borderRadius: 12,
                }}
                resizeMode="contain"
              />
            )}

            {selectedMedia && (
              <View className="mt-4 p-4 rounded-lg" style={{ backgroundColor: colors.surface[700] }}>
                <Text className="text-sm" style={{ color: colors.text.primary }}>
                  {selectedMedia.name}
                </Text>
                {selectedMedia.size && (
                  <Text className="text-xs mt-1" style={{ color: colors.text.muted }}>
                    {formatFileSize(selectedMedia.size)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default MediaPicker;
