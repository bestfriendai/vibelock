import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useTheme } from "../providers/ThemeProvider";
import { formatFileSize, formatDuration } from "../utils/mediaUtils";

interface MediaUploadProgressProps {
  stage: "processing" | "uploading" | "complete" | "failed";
  progress: number;
  thumbnailUri?: string;
  mediaType: "image" | "video";
  fileName?: string;
  fileSize?: number;
  compressionRatio?: number;
  estimatedTime?: number;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const MediaUploadProgress: React.FC<MediaUploadProgressProps> = ({
  stage,
  progress,
  thumbnailUri,
  mediaType,
  fileName,
  fileSize,
  compressionRatio,
  estimatedTime,
  error,
  onCancel,
  onRetry,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const progressAnimation = useSharedValue(0);
  const stageScale = useSharedValue(1);

  // Update progress animation
  useEffect(() => {
    progressAnimation.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  // Animate stage changes
  useEffect(() => {
    stageScale.value = withSpring(0.9, { duration: 150 }, () => {
      stageScale.value = withSpring(1, { duration: 150 });
    });
  }, [stage]);

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressAnimation.value}%`,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: stageScale.value }],
    };
  });

  const getStageLabel = () => {
    switch (stage) {
      case "processing":
        return mediaType === "image" ? "Compressing image..." : "Generating thumbnail...";
      case "uploading":
        return "Uploading...";
      case "complete":
        return "Upload complete!";
      case "failed":
        return "Upload failed";
      default:
        return "";
    }
  };

  const getStageIcon = () => {
    switch (stage) {
      case "processing":
        return "construct";
      case "uploading":
        return "cloud-upload";
      case "complete":
        return "checkmark-circle";
      case "failed":
        return "alert-circle";
      default:
        return "time";
    }
  };

  const getStageColor = () => {
    switch (stage) {
      case "complete":
        return colors.status.success;
      case "failed":
        return colors.status.error;
      default:
        return colors.brand.primary;
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.springify()}
      exiting={SlideOutDown.springify()}
      style={[styles.container, containerStyle, { backgroundColor: colors.surface[700] }]}
    >
      <View style={styles.content}>
        {/* Thumbnail Preview */}
        {thumbnailUri && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
            {mediaType === "video" && (
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={24} color="white" />
              </View>
            )}
          </View>
        )}

        {/* Progress Info */}
        <View style={styles.infoContainer}>
          {/* Stage Header */}
          <View style={styles.stageHeader}>
            <Ionicons name={getStageIcon() as any} size={20} color={getStageColor()} />
            <Text style={[styles.stageLabel, { color: colors.text.primary }]}>
              {getStageLabel()}
            </Text>
          </View>

          {/* File Info */}
          {fileName && (
            <Text style={[styles.fileName, { color: colors.text.secondary }]} numberOfLines={1}>
              {fileName}
            </Text>
          )}

          {/* Progress Bar */}
          {stage !== "complete" && stage !== "failed" && (
            <View style={[styles.progressBarContainer, { backgroundColor: colors.surface[600] }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  progressBarStyle,
                  { backgroundColor: getStageColor() },
                ]}
              />
            </View>
          )}

          {/* Additional Info */}
          <View style={styles.metaInfo}>
            {fileSize && (
              <Text style={[styles.metaText, { color: colors.text.muted }]}>
                {formatFileSize(fileSize)}
              </Text>
            )}

            {compressionRatio && compressionRatio < 1 && (
              <Text style={[styles.metaText, { color: colors.text.muted }]}>
                {Math.round((1 - compressionRatio) * 100)}% compressed
              </Text>
            )}

            {estimatedTime && stage === "uploading" && (
              <Text style={[styles.metaText, { color: colors.text.muted }]}>
                ~{formatDuration(estimatedTime)} remaining
              </Text>
            )}

            {stage !== "complete" && stage !== "failed" && (
              <Text style={[styles.metaText, { color: colors.brand.primary }]}>
                {Math.round(progress)}%
              </Text>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <Text style={[styles.errorText, { color: colors.status.error }]} numberOfLines={2}>
              {error}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {stage === "failed" && onRetry && (
            <Pressable
              onPress={onRetry}
              style={[styles.actionButton, { backgroundColor: colors.brand.primary }]}
            >
              <Ionicons name="refresh" size={18} color="white" />
            </Pressable>
          )}

          {(stage === "processing" || stage === "uploading") && onCancel && (
            <Pressable
              onPress={onCancel}
              style={[styles.actionButton, { backgroundColor: colors.surface[600] }]}
            >
              <Ionicons name="close" size={18} color={colors.text.primary} />
            </Pressable>
          )}

          {stage === "complete" && onDismiss && (
            <Pressable
              onPress={onDismiss}
              style={[styles.actionButton, { backgroundColor: colors.status.success }]}
            >
              <Ionicons name="checkmark" size={18} color="white" />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  infoContainer: {
    flex: 1,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  fileName: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  metaInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: {
    fontSize: 11,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    marginLeft: 8,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});