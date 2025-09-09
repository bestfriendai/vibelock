import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import Constants from "expo-constants";

export interface ThumbnailResult {
  success: boolean;
  uri?: string;
  error?: string;
}

class VideoThumbnailService {
  private thumbnailCache = new Map<string, string>();
  private isExpoGo = Constants.executionEnvironment === "storeClient";

  /**
   * Generate thumbnail for video with Expo Go fallback support
   */
  async generateThumbnail(videoUri: string, timeStamp?: number): Promise<ThumbnailResult> {
    try {
      // Check cache first
      const cacheKey = `${videoUri}_${timeStamp || 0}`;
      if (this.thumbnailCache.has(cacheKey)) {
        return {
          success: true,
          uri: this.thumbnailCache.get(cacheKey)!,
        };
      }

      // Validate video file exists
      if (videoUri.startsWith("file://") || videoUri.startsWith("content://")) {
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          return { success: false, error: "Video file does not exist" };
        }
      }

      // Use different approaches based on environment
      if (this.isExpoGo) {
        return await this.generateThumbnailFallback(videoUri, timeStamp);
      } else {
        return await this.generateThumbnailNative(videoUri, timeStamp);
      }
    } catch (error) {
      console.error("Video thumbnail generation failed:", error);
      return await this.generateThumbnailFallback(videoUri, timeStamp);
    }
  }

  /**
   * Generate thumbnail using native expo-video-thumbnails (dev builds only)
   */
  private async generateThumbnailNative(videoUri: string, timeStamp?: number): Promise<ThumbnailResult> {
    try {
      // Dynamic import to avoid issues in Expo Go
      const VideoThumbnails = await import("expo-video-thumbnails");

      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: timeStamp || 1000,
        quality: 1,
      });

      const cacheKey = `${videoUri}_${timeStamp || 0}`;
      this.thumbnailCache.set(cacheKey, uri);

      return {
        success: true,
        uri,
      };
    } catch (error) {
      console.warn("Native thumbnail generation failed, falling back:", error);
      return await this.generateThumbnailFallback(videoUri, timeStamp);
    }
  }

  /**
   * Fallback thumbnail generation for Expo Go
   */
  private async generateThumbnailFallback(videoUri: string, timeStamp?: number): Promise<ThumbnailResult> {
    try {
      // Create a placeholder thumbnail
      const placeholderUri = await this.createVideoPlaceholder();

      const cacheKey = `${videoUri}_${timeStamp || 0}`;
      this.thumbnailCache.set(cacheKey, placeholderUri);

      return {
        success: true,
        uri: placeholderUri,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate fallback thumbnail",
      };
    }
  }

  /**
   * Create a simple placeholder for video thumbnails
   */
  private async createVideoPlaceholder(): Promise<string> {
    try {
      // Create a simple colored rectangle as a placeholder
      const result = await ImageManipulator.manipulateAsync(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        [{ resize: { width: 200, height: 200 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      return result.uri;
    } catch (error) {
      // Return a data URI as ultimate fallback
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    }
  }

  /**
   * Generate multiple thumbnails for video preview
   */
  async generateMultipleThumbnails(videoUri: string, count: number = 3, duration?: number): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];
    const videoDuration = duration || 10000; // Default 10 seconds if not provided
    const interval = videoDuration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const timeStamp = interval * i;
      const result = await this.generateThumbnail(videoUri, timeStamp);
      results.push(result);
    }

    return results;
  }

  /**
   * Clear thumbnail cache
   */
  clearCache(): void {
    this.thumbnailCache.clear();
  }

  /**
   * Get cached thumbnail if available
   */
  getCachedThumbnail(videoUri: string, timeStamp?: number): string | null {
    const cacheKey = `${videoUri}_${timeStamp || 0}`;
    return this.thumbnailCache.get(cacheKey) || null;
  }

  /**
   * Check if video thumbnails are supported on current platform
   */
  isSupported(): boolean {
    // Native thumbnails only work in dev builds, fallback always available
    return Platform.OS === "ios" || Platform.OS === "android";
  }

  /**
   * Check if native thumbnail generation is available
   */
  isNativeSupported(): boolean {
    return !this.isExpoGo && (Platform.OS === "ios" || Platform.OS === "android");
  }

  /**
   * Preload thumbnail for better UX
   */
  async preloadThumbnail(videoUri: string): Promise<void> {
    try {
      await this.generateThumbnail(videoUri);
    } catch (error) {
      console.warn("Failed to preload video thumbnail:", error);
    }
  }
}

export const videoThumbnailService = new VideoThumbnailService();
