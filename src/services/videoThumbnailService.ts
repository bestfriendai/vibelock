import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ThumbnailResult {
  success: boolean;
  uri?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface VideoThumbnailOptions {
  timePosition?: number; // milliseconds
  quality?: number; // 0-1
  size?: {
    width?: number;
    height?: number;
  };
}

class VideoThumbnailService {
  private thumbnailCache = new Map<string, ThumbnailResult>();
  private isExpoGo = Constants.executionEnvironment === "storeClient";
  private cachePrefix = "video_thumbnail_";
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate thumbnail for video with Expo Go fallback support
   */
  async generateThumbnail(videoUri: string, options?: VideoThumbnailOptions): Promise<ThumbnailResult> {
    try {
      // Check cache first
      const cacheKey = `${videoUri}_${options?.timePosition || 0}_${options?.quality || 1}`;
      const cached = await this.getCachedThumbnailResult(cacheKey);
      if (cached) {
        return cached;
      }

      // Validate video file exists
      if (videoUri.startsWith("file://") || videoUri.startsWith("content://")) {
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          return { success: false, error: "Video file does not exist" };
        }
      }

      // Use different approaches based on environment
      let result: ThumbnailResult;
      if (this.isExpoGo) {
        result = await this.generateThumbnailFallback(videoUri, options);
      } else {
        result = await this.generateThumbnailNative(videoUri, options);
      }

      // Cache the result
      if (result.success) {
        await this.saveThumbnailToCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.warn("Video thumbnail generation failed:", error);
      return await this.generateThumbnailFallback(videoUri, timeStamp);
    }
  }

  /**
   * Generate thumbnail using native expo-video-thumbnails (dev builds only)
   */
  private async generateThumbnailNative(videoUri: string, options?: VideoThumbnailOptions): Promise<ThumbnailResult> {
    try {
      // Dynamic import to avoid issues in Expo Go
      const VideoThumbnails = await import("expo-video-thumbnails");

      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: options?.timePosition || 1000,
        quality: options?.quality || 1,
      });

      // Get dimensions if size is specified
      let width = options?.size?.width || 320;
      let height = options?.size?.height || 240;

      // Process thumbnail if size constraints are provided
      if (options?.size) {
        const processed = await this.resizeThumbnail(uri, options.size);
        return {
          success: true,
          uri: processed.uri,
          width: processed.width,
          height: processed.height,
        };
      }

      return {
        success: true,
        uri,
        width,
        height,
      };
    } catch (error) {
      console.warn("Native thumbnail generation failed, falling back:", error);
      return await this.generateThumbnailFallback(videoUri, options);
    }
  }

  /**
   * Fallback thumbnail generation for Expo Go
   */
  private async generateThumbnailFallback(videoUri: string, options?: VideoThumbnailOptions): Promise<ThumbnailResult> {
    try {
      // Create a placeholder thumbnail
      const placeholderUri = await this.createVideoPlaceholder(options?.size);
      const width = options?.size?.width || 320;
      const height = options?.size?.height || 240;

      return {
        success: true,
        uri: placeholderUri,
        width,
        height,
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
  private async createVideoPlaceholder(size?: { width?: number; height?: number }): Promise<string> {
    try {
      const width = size?.width || 320;
      const height = size?.height || 240;

      // Create a simple colored rectangle as a placeholder
      const result = await ImageManipulator.manipulateAsync(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        [{ resize: { width, height } }],
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
   * Generate multiple thumbnails for video preview (batch processing)
   */
  async generateThumbnails(videoUris: string[], options?: VideoThumbnailOptions): Promise<ThumbnailResult[]> {
    const results = await Promise.all(
      videoUris.map(uri => this.generateThumbnail(uri, options))
    );
    return results;
  }

  /**
   * Generate multiple thumbnails from same video at different timestamps
   */
  async generateMultipleThumbnails(videoUri: string, count: number = 3, duration?: number): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];
    const videoDuration = duration || 10000; // Default 10 seconds if not provided
    const interval = videoDuration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const timePosition = interval * i;
      const result = await this.generateThumbnail(videoUri, { timePosition });
      results.push(result);
    }

    return results;
  }

  /**
   * Resize thumbnail to specified dimensions
   */
  private async resizeThumbnail(uri: string, size: { width?: number; height?: number }): Promise<{ uri: string; width: number; height: number }> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size.width, height: size.height } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Save thumbnail result to cache
   */
  private async saveThumbnailToCache(key: string, result: ThumbnailResult): Promise<void> {
    try {
      // Memory cache
      this.thumbnailCache.set(key, result);

      // Persistent cache
      const cacheData = {
        ...result,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(this.cachePrefix + key, JSON.stringify(cacheData));

      // Clean up old cache entries
      await this.cleanupOldCache();
    } catch (error) {
      console.warn("Failed to cache thumbnail:", error);
    }
  }

  /**
   * Get cached thumbnail result
   */
  private async getCachedThumbnailResult(key: string): Promise<ThumbnailResult | null> {
    try {
      // Check memory cache first
      if (this.thumbnailCache.has(key)) {
        return this.thumbnailCache.get(key)!;
      }

      // Check persistent cache
      const cached = await AsyncStorage.getItem(this.cachePrefix + key);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;

      if (age > this.maxCacheAge) {
        await AsyncStorage.removeItem(this.cachePrefix + key);
        return null;
      }

      // Restore to memory cache
      const result: ThumbnailResult = {
        success: data.success,
        uri: data.uri,
        width: data.width,
        height: data.height,
      };
      this.thumbnailCache.set(key, result);

      return result;
    } catch (error) {
      console.warn("Failed to get cached thumbnail:", error);
      return null;
    }
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupOldCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const thumbnailKeys = keys.filter(k => k.startsWith(this.cachePrefix));

      for (const key of thumbnailKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) continue;

        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;

        if (age > this.maxCacheAge) {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup cache:", error);
    }
  }

  /**
   * Clear all thumbnail cache
   */
  async clearCache(): Promise<void> {
    this.thumbnailCache.clear();

    try {
      const keys = await AsyncStorage.getAllKeys();
      const thumbnailKeys = keys.filter(k => k.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(thumbnailKeys);
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = `${FileSystem.documentDirectory}thumbnails/`;
      const dirInfo = await FileSystem.getInfoAsync(tempDir);

      if (dirInfo.exists) {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      }
    } catch (error) {
      console.warn("Failed to cleanup temp files:", error);
    }
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
