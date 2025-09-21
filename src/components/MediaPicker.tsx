import React, { useMemo, useState } from "react";
import { View, Pressable, Text, Alert, Modal, Image, Dimensions, ActivityIndicator, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "../providers/ThemeProvider";
import { AppError, ErrorType } from "../utils/errorHandling";
import { launchImageLibraryWithWorkaround, isPHPhotosError3164, getPHPhotosErrorMessage } from "../utils/imagePickerWorkaround";

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
  const [isLoading, setIsLoading] = useState(false);

  // Modern permission hooks (SDK 54)
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  // File validation constants (matching StorageService)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE_TYPES = useMemo(() => ["image/jpeg", "image/png", "image/webp"], []);
  const ALLOWED_VIDEO_TYPES = useMemo(() => ["video/mp4", "video/quicktime"], []);
  const ALLOWED_AUDIO_TYPES = useMemo(() => ["audio/mp4", "audio/mpeg", "audio/wav"], []);

  /**
   * Validate selected media file
   */
  const validateMediaFile = (asset: any, type: "image" | "video" | "document"): void => {
    // Check file size
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      throw new AppError("File too large (max 50MB)", ErrorType.VALIDATION, "FILE_TOO_LARGE");
    }

    const name: string = asset.fileName || asset.name || "";
    const extension = name?.toLowerCase().split(".").pop();
    const detectedMime =
      asset.mimeType ||
      (extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : extension === "mp4"
              ? "video/mp4"
              : extension === "mov"
                ? "video/quicktime"
                : undefined);

    if (type === "image") {
      if (!detectedMime || !ALLOWED_IMAGE_TYPES.includes(detectedMime)) {
        throw new AppError(
          `Invalid image type${extension ? `: .${extension}` : ""}`,
          ErrorType.VALIDATION,
          "INVALID_FILE_TYPE",
        );
      }
    } else if (type === "video") {
      if (!detectedMime || !ALLOWED_VIDEO_TYPES.includes(detectedMime)) {
        throw new AppError(
          `Invalid video type${extension ? `: .${extension}` : ""}`,
          ErrorType.VALIDATION,
          "INVALID_FILE_TYPE",
        );
      }
    } else if (type === "document") {
      const blocked = ["exe", "bat", "cmd", "sh", "apk", "ipa"];
      if (extension && blocked.includes(extension)) {
        throw new AppError("Blocked file type for security reasons", ErrorType.VALIDATION, "BLOCKED_FILE_TYPE");
      }
    }
  };

  const scale = useSharedValue(1);

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

  const pickImageFromCamera = async () => {
    const hasPermission = (await ensurePermission("camera")) && (await ensurePermission("library"));
    if (!hasPermission) return;

    try {
      setIsLoading(true);
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
            mimeType: asset.mimeType,
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
      console.warn("Camera error:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await ensurePermission("library");
    if (!hasPermission) return;

    try {
      setIsLoading(true);

      // Use the workaround utility to handle PHPhotosErrorDomain 3164
      const result = await launchImageLibraryWithWorkaround({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
        maxRetries: 3,
        retryDelay: 500,
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
            mimeType: asset.mimeType,
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
    } catch (error: any) {
      console.warn("Gallery error:", error);

      // Use the enhanced error handling for PHPhotosErrorDomain issues
      if (isPHPhotosError3164(error)) {
        Alert.alert(
          "Photo Library Access Issue",
          getPHPhotosErrorMessage(error),
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: () => pickImageFromGallery() },
            { text: "Open Settings", onPress: () => Linking.openSettings?.() },
          ]
        );
      } else if (error?.message?.includes("PHPhotosErrorDomain")) {
        if (error?.message?.includes("3311")) {
          Alert.alert(
            "Network Required",
            "Network access is required to load photos from iCloud. Please check your internet connection."
          );
        } else {
          Alert.alert("Photo Library Error", "Unable to access photo library. Please try again.");
        }
      } else {
        Alert.alert("Error", "Failed to pick media. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        try {
          validateMediaFile(asset, "document");
        } catch (error) {
          const message = error instanceof AppError ? error.message : "Invalid document";
          Alert.alert("Invalid File", message);
          return;
        }
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
      console.warn("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    } finally {
      setIsLoading(false);
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
            style={{ borderBottomColor: colors.border.default }}
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
              {isLoading && (
                <View className="items-center mb-2">
                  <ActivityIndicator size="small" color={colors.brand.red} />
                  <Text className="text-xs mt-2" style={{ color: colors.text.muted }}>
                    Preparing media picker...
                  </Text>
                </View>
              )}
              {/* Camera */}
              <Animated.View style={animatedStyle}>
                <Pressable
                  onPress={pickImageFromCamera}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  className="flex-row items-center p-4 rounded-xl"
                  style={{ backgroundColor: colors.surface[700], opacity: isLoading ? 0.6 : 1 }}
                  disabled={isLoading}
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
                  style={{ backgroundColor: colors.surface[700], opacity: isLoading ? 0.6 : 1 }}
                  disabled={isLoading}
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
                  style={{ backgroundColor: colors.surface[700], opacity: isLoading ? 0.6 : 1 }}
                  disabled={isLoading}
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
            style={{ borderBottomColor: colors.border.default }}
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
