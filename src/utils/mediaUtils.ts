import * as FileSystem from "expo-file-system";

/**
 * Calculate optimal display dimensions while maintaining aspect ratio
 */
export function calculateDisplayDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; aspectRatio: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Scale down if needed
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    aspectRatio,
  };
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Detect media type from URI
 */
export function getMediaType(uri: string): "image" | "video" | "unknown" {
  const extension = uri.split(".").pop()?.toLowerCase();

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "svg"];
  const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "3gp", "wmv"];

  if (extension && imageExtensions.includes(extension)) {
    return "image";
  }

  if (extension && videoExtensions.includes(extension)) {
    return "video";
  }

  // Check MIME type from URI if possible
  if (uri.includes("image/")) return "image";
  if (uri.includes("video/")) return "video";

  return "unknown";
}

/**
 * Validate media file
 */
export async function validateMediaFile(
  uri: string,
  type: "image" | "video"
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      return { valid: false, error: "File does not exist" };
    }

    // Check file size
    const maxSizeBytes = type === "image" ? 50 * 1024 * 1024 : 200 * 1024 * 1024; // 50MB for images, 200MB for videos
    if (fileInfo.size && fileInfo.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File too large (max ${type === "image" ? "50MB" : "200MB"})`,
      };
    }

    // Check file extension
    const detectedType = getMediaType(uri);
    if (detectedType !== type) {
      return {
        valid: false,
        error: `Invalid file type. Expected ${type}, got ${detectedType}`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating media file:", error);
    return { valid: false, error: "Failed to validate file" };
  }
}

/**
 * Generate unique media ID
 */
export function generateMediaId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `media_${timestamp}_${random}`;
}

/**
 * Get optimal thumbnail size based on original dimensions
 */
export function getOptimalThumbnailSize(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  const maxDimension = 320;
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  if (width > height) {
    // Landscape
    width = Math.min(maxDimension, width);
    height = width / aspectRatio;
  } else {
    // Portrait or square
    height = Math.min(maxDimension, height);
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Check if media type is supported
 */
export function isMediaSupported(mimeType: string): boolean {
  const supportedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
    // Videos
    "video/mp4",
    "video/quicktime",
    "video/x-m4v",
    "video/webm",
    "video/3gpp",
    "video/avi",
  ];

  return supportedTypes.some((type) =>
    mimeType.toLowerCase().includes(type)
  );
}

/**
 * Get media type from MIME type
 */
export function getMediaTypeFromMime(mimeType: string): "image" | "video" | "unknown" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

/**
 * Extract file extension from URI
 */
export function getFileExtension(uri: string): string {
  const match = uri.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Generate thumbnail URI from original URI
 */
export function getThumbnailUri(originalUri: string): string {
  const extension = getFileExtension(originalUri);
  const baseUri = originalUri.replace(`.${extension}`, "");
  return `${baseUri}_thumb.jpg`;
}

/**
 * Estimate upload time based on file size and connection speed
 */
export function estimateUploadTime(
  fileSizeBytes: number,
  connectionSpeedMbps: number = 10
): number {
  // Convert Mbps to bytes per second
  const bytesPerSecond = (connectionSpeedMbps * 1024 * 1024) / 8;
  // Add 20% overhead for protocol and processing
  const estimatedSeconds = (fileSizeBytes / bytesPerSecond) * 1.2;
  return Math.ceil(estimatedSeconds);
}

/**
 * Create a data URI placeholder for loading states
 */
export function createPlaceholderDataUri(
  width: number = 1,
  height: number = 1,
  color: string = "#E5E5E7"
): string {
  // Simple 1x1 transparent PNG
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
}