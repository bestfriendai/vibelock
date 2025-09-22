/**
 * ImagePicker workaround utilities for iOS PHPhotosErrorDomain issues
 * Specifically handles error 3164 which can occur even with proper permissions
 */

import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export interface ImagePickerWorkaroundOptions {
  mediaTypes?: ImagePicker.MediaType[];
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  videoMaxDuration?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Enhanced ImagePicker.launchImageLibraryAsync with PHPhotosErrorDomain 3164 workaround
 */
export async function launchImageLibraryWithWorkaround(
  options: ImagePickerWorkaroundOptions = {},
): Promise<ImagePicker.ImagePickerResult> {
  const {
    mediaTypes = ImagePicker.MediaTypeOptions.All,
    allowsEditing = true,
    aspect = [4, 3],
    quality = 0.8,
    allowsMultipleSelection = false,
    selectionLimit,
    videoMaxDuration = 60,
    maxRetries = 2,
    retryDelay = 500,
  } = options;

  // First attempt with full options
  try {
    // Add a small delay to ensure permissions are fully processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes,
      allowsEditing,
      aspect,
      quality,
      allowsMultipleSelection,
      selectionLimit,
      videoMaxDuration,
    };

    // Add iOS-specific options if on iOS
    if (Platform.OS === "ios") {
      Object.assign(pickerOptions, {
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
    }

    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    return result;
  } catch (error: any) {
    // Check if this is the specific PHPhotosErrorDomain 3164 error
    if (error?.message?.includes("PHPhotosErrorDomain") && error?.message?.includes("3164")) {
      // Try progressively simpler configurations
      const fallbackConfigs = [
        // Attempt 1: Remove editing and multiple selection
        {
          mediaTypes: ["images", "videos"] as ImagePicker.MediaType[],
          allowsEditing: false,
          allowsMultipleSelection: false,
          quality: 1.0,
        },
        // Attempt 2: Most minimal configuration
        {
          mediaTypes: ["images", "videos"] as ImagePicker.MediaType[],
          allowsEditing: false,
          allowsMultipleSelection: false,
          quality: 1.0,
          aspect: undefined,
        },
      ];

      for (let i = 0; i < Math.min(maxRetries, fallbackConfigs.length); i++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          const fallbackResult = await ImagePicker.launchImageLibraryAsync(fallbackConfigs[i]);
          return fallbackResult;
        } catch (retryError) {
          // If this is the last retry, continue to throw the original error
          if (i === Math.min(maxRetries, fallbackConfigs.length) - 1) {
            break;
          }
        }
      }
    }

    // If all retries failed or it's not the specific error, throw the original error
    throw error;
  }
}

/**
 * Check if the current error is the known PHPhotosErrorDomain 3164 issue
 */
export function isPHPhotosError3164(error: any): boolean {
  return error?.message?.includes("PHPhotosErrorDomain") && error?.message?.includes("3164");
}

/**
 * Show user-friendly alert for PHPhotosErrorDomain 3164 with retry option
 */
export function showPHPhotosError3164Alert(onRetry?: () => void): void {
  Alert.alert(
    "Photo Library Access Issue",
    "There's a temporary issue accessing your photo library. This is a known iOS issue that can occur even with proper permissions.",
    [
      { text: "Cancel", style: "cancel" },
      ...(onRetry ? [{ text: "Try Again", onPress: onRetry }] : []),
      {
        text: "Open Settings",
        onPress: () => {
          // Note: Linking.openSettings() should be called from the component
        },
      },
    ],
  );
}

/**
 * Get user-friendly error message for PHPhotosErrorDomain errors
 */
export function getPHPhotosErrorMessage(error: any): string {
  if (error?.message?.includes("PHPhotosErrorDomain")) {
    if (error?.message?.includes("3164")) {
      return "There's a temporary issue accessing your photo library. This can happen even with proper permissions due to an iOS bug.";
    }
    if (error?.message?.includes("3311")) {
      return "Network access is required to load photos from iCloud. Please check your internet connection.";
    }
    return "Unable to access photo library. Please try again.";
  }
  return "Failed to access media library. Please try again.";
}
