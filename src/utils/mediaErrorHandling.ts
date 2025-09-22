/**
 * Media-specific error handling utilities
 * Provides worklet-safe error handling for media upload operations
 */

import { Alert } from "react-native";
import { runOnJS } from "react-native-reanimated";
import { AppError, ErrorType, parseSupabaseError } from "./errorHandling";

export interface MediaError {
  message: string;
  type: "UPLOAD_FAILED" | "VALIDATION_FAILED" | "NETWORK_ERROR" | "PERMISSION_DENIED" | "UNKNOWN";
  userMessage: string;
  retryable: boolean;
}

/**
 * Create a media error object that's safe to use in worklet contexts
 */
export const createMediaError = (
  message: string,
  type: MediaError["type"] = "UNKNOWN",
  retryable: boolean = false,
): MediaError => {
  "worklet";

  let userMessage: string;
  switch (type) {
    case "UPLOAD_FAILED":
      userMessage = "Failed to upload media. Please try again.";
      break;
    case "VALIDATION_FAILED":
      userMessage = "Invalid media file. Please select a different file.";
      break;
    case "NETWORK_ERROR":
      userMessage = "Network error. Please check your connection and try again.";
      break;
    case "PERMISSION_DENIED":
      userMessage = "Permission denied. Please allow access to your media library.";
      break;
    default:
      userMessage = "An error occurred while processing media. Please try again.";
  }

  return {
    message,
    type,
    userMessage,
    retryable,
  };
};

/**
 * Safely handle media upload errors without class construction issues
 */
export const handleMediaUploadError = (error: any, context: string = "media upload"): MediaError => {
  // Handle iOS PHPhotosErrorDomain errors specifically
  if (error?.message?.includes("PHPhotosErrorDomain")) {
    if (error?.message?.includes("3164") || error?.message?.includes("AccessUserDenied")) {
      return createMediaError(
        "Photo library access denied. Please allow access in Settings > Privacy & Security > Photos.",
        "PERMISSION_DENIED",
        false,
      );
    }
    if (error?.message?.includes("3311") || error?.message?.includes("NetworkAccessRequired")) {
      return createMediaError(
        "Network access required to load photos from iCloud. Please check your internet connection.",
        "NETWORK_ERROR",
        true,
      );
    }
    // Generic PHPhotos error
    return createMediaError(
      "Unable to access photo library. Please try again or check your permissions.",
      "PERMISSION_DENIED",
      false,
    );
  }

  // Avoid complex error class construction that can fail in worklet contexts
  if (
    error?.message?.includes("network") ||
    error?.message?.includes("timeout") ||
    error?.message?.includes("Network request failed")
  ) {
    return createMediaError(error.message || "Network error", "NETWORK_ERROR", true);
  }

  if (error?.message?.includes("permission") || error?.message?.includes("denied")) {
    return createMediaError(error.message || "Permission denied", "PERMISSION_DENIED", false);
  }

  if (error?.message?.includes("invalid") || error?.message?.includes("validation")) {
    return createMediaError(error.message || "Validation failed", "VALIDATION_FAILED", false);
  }

  // Default to upload failed
  return createMediaError(error?.message || "Upload failed", "UPLOAD_FAILED", true);
};

/**
 * Show error alert on JS thread (safe to call from worklets)
 */
export const showMediaErrorAlert = (error: MediaError, title: string = "Error") => {
  "worklet";
  runOnJS((errorObj: MediaError, alertTitle: string) => {
    Alert.alert(alertTitle, errorObj.userMessage);
  })(error, title);
};

/**
 * Wrapper for media operations that provides safe error handling
 */
export const withMediaErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string = "media operation",
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const mediaError = handleMediaUploadError(error, context);
    // Don't throw, return null to allow graceful degradation
    return null;
  }
};

/**
 * Convert MediaError to AppError for use in non-worklet contexts
 */
export const convertMediaErrorToAppError = (mediaError: MediaError): AppError => {
  let errorType: ErrorType;
  switch (mediaError.type) {
    case "NETWORK_ERROR":
      errorType = ErrorType.NETWORK;
      break;
    case "PERMISSION_DENIED":
      errorType = ErrorType.PERMISSION;
      break;
    case "VALIDATION_FAILED":
      errorType = ErrorType.VALIDATION;
      break;
    case "UPLOAD_FAILED":
      errorType = ErrorType.SERVER;
      break;
    default:
      errorType = ErrorType.UNKNOWN;
  }

  return new AppError(mediaError.message, errorType, mediaError.type, undefined, mediaError.retryable);
};

/**
 * Retry media operation with exponential backoff
 */
export const retryMediaOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = "media operation",
): Promise<T | null> => {
  let lastError: MediaError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const mediaError = handleMediaUploadError(error, context);
      lastError = mediaError;

      // Don't retry if error is not retryable
      if (!mediaError.retryable || attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (lastError) {
    console.error(`Media operation failed after retries: ${lastError.message}`);
  }

  return null;
};
