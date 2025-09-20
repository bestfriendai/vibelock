import { imageCompressionService, CompressionOptions } from "./imageCompressionService";
import { videoThumbnailService, VideoThumbnailOptions } from "./videoThumbnailService";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export interface MediaProcessingResult {
  processedUri: string;
  thumbnailUri?: string;
  width: number;
  height: number;
  size: number;
  duration?: number;
  compressionRatio?: number;
  processingTime?: number;
  type: "image" | "video";
}

export interface MediaProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  generateThumbnail?: boolean;
  thumbnailOptions?: VideoThumbnailOptions;
  onProgress?: (progress: number) => void;
}

class MediaProcessingService {
  private readonly defaultImageOptions: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: "jpeg",
  };

  private readonly defaultVideoThumbnailOptions: VideoThumbnailOptions = {
    timePosition: 1000,
    quality: 0.9,
    size: {
      width: 320,
      height: 240,
    },
  };

  /**
   * Process media for chat - handles both images and videos
   */
  async processMediaForChat(
    uri: string,
    type: "image" | "video",
    options?: MediaProcessingOptions
  ): Promise<MediaProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate file exists
      const fileInfo = await this.validateFile(uri);
      if (!fileInfo.exists) {
        throw new Error("Media file does not exist");
      }

      // Report initial progress
      options?.onProgress?.(10);

      if (type === "image") {
        return await this.processImage(uri, fileInfo.size || 0, options, startTime);
      } else {
        return await this.processVideo(uri, fileInfo.size || 0, options, startTime);
      }
    } catch (error) {
      console.error("Media processing failed:", error);
      throw this.createUserFriendlyError(error);
    }
  }

  /**
   * Process image with compression
   */
  private async processImage(
    uri: string,
    originalSize: number,
    options?: MediaProcessingOptions,
    startTime?: number
  ): Promise<MediaProcessingResult> {
    // Report progress
    options?.onProgress?.(30);

    const compressionOptions: CompressionOptions = {
      maxWidth: options?.maxWidth || this.defaultImageOptions.maxWidth,
      maxHeight: options?.maxHeight || this.defaultImageOptions.maxHeight,
      quality: options?.quality || this.defaultImageOptions.quality,
      format: this.defaultImageOptions.format,
    };

    const compressed = await imageCompressionService.compressImage(uri, compressionOptions);

    // Report progress
    options?.onProgress?.(80);

    // Get compressed file info
    const compressedInfo = await FileSystem.getInfoAsync(compressed.uri);
    const compressedSize = compressedInfo.size || 0;

    // Report completion
    options?.onProgress?.(100);

    return {
      processedUri: compressed.uri,
      width: compressed.width,
      height: compressed.height,
      size: compressedSize,
      compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
      processingTime: startTime ? Date.now() - startTime : undefined,
      type: "image",
    };
  }

  /**
   * Process video with thumbnail generation
   */
  private async processVideo(
    uri: string,
    originalSize: number,
    options?: MediaProcessingOptions,
    startTime?: number
  ): Promise<MediaProcessingResult> {
    // Report progress
    options?.onProgress?.(30);

    // Generate thumbnail
    const thumbnailOptions: VideoThumbnailOptions = options?.thumbnailOptions || this.defaultVideoThumbnailOptions;
    const thumbnailResult = await videoThumbnailService.generateThumbnail(uri, thumbnailOptions);

    if (!thumbnailResult.success || !thumbnailResult.uri) {
      throw new Error("Failed to generate video thumbnail");
    }

    // Report progress
    options?.onProgress?.(70);

    // Get video metadata
    const videoMetadata = await this.getVideoMetadata(uri);

    // Report completion
    options?.onProgress?.(100);

    return {
      processedUri: uri, // Original video URI
      thumbnailUri: thumbnailResult.uri,
      width: thumbnailResult.width || 320,
      height: thumbnailResult.height || 240,
      size: originalSize,
      duration: videoMetadata.duration,
      processingTime: startTime ? Date.now() - startTime : undefined,
      type: "video",
    };
  }

  /**
   * Process multiple media items in batch
   */
  async processMediaBatch(
    items: Array<{ uri: string; type: "image" | "video" }>,
    options?: MediaProcessingOptions
  ): Promise<MediaProcessingResult[]> {
    const totalItems = items.length;
    const results: MediaProcessingResult[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Calculate progress for batch
      const itemProgress = (i / totalItems) * 100;
      const progressCallback = options?.onProgress
        ? (progress: number) => {
            const overallProgress = itemProgress + (progress / totalItems);
            options.onProgress!(overallProgress);
          }
        : undefined;

      const result = await this.processMediaForChat(item.uri, item.type, {
        ...options,
        onProgress: progressCallback,
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Validate media file
   */
  private async validateFile(uri: string): Promise<FileSystem.FileInfo> {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (fileInfo.size && fileInfo.size > maxSize) {
      throw new Error("File size exceeds 100MB limit");
    }

    return fileInfo;
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(uri: string): Promise<{ duration?: number }> {
    try {
      // In production, you'd use expo-av or another library to get actual duration
      // For now, return a default duration
      return {
        duration: undefined, // Will be populated from video player
      };
    } catch (error) {
      console.warn("Failed to get video metadata:", error);
      return {};
    }
  }

  /**
   * Validate media format
   */
  validateMediaFormat(uri: string, type: "image" | "video"): boolean {
    const extension = uri.split(".").pop()?.toLowerCase();

    if (type === "image") {
      const supportedImageFormats = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
      return supportedImageFormats.includes(extension || "");
    } else {
      const supportedVideoFormats = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
      return supportedVideoFormats.includes(extension || "");
    }
  }

  /**
   * Create user-friendly error messages
   */
  private createUserFriendlyError(error: any): Error {
    const message = error?.message || "Unknown error";

    if (message.includes("size")) {
      return new Error("The file is too large. Please choose a smaller file.");
    }
    if (message.includes("format") || message.includes("supported")) {
      return new Error("This file format is not supported.");
    }
    if (message.includes("permission")) {
      return new Error("Permission denied. Please allow access to your media.");
    }
    if (message.includes("network")) {
      return new Error("Network error. Please check your connection.");
    }

    return new Error("Failed to process media. Please try again.");
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = `${FileSystem.documentDirectory}media_temp/`;
      const dirInfo = await FileSystem.getInfoAsync(tempDir);

      if (dirInfo.exists) {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      }

      // Also cleanup thumbnail temp files
      await videoThumbnailService.cleanupTempFiles();
    } catch (error) {
      console.warn("Failed to cleanup temp files:", error);
    }
  }

  /**
   * Get optimal settings for different media types
   */
  getOptimalSettings(type: "image" | "video", fileSize: number): MediaProcessingOptions {
    if (type === "image") {
      // Adjust quality based on file size
      if (fileSize > 10 * 1024 * 1024) {
        // > 10MB
        return {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.7,
        };
      } else if (fileSize > 5 * 1024 * 1024) {
        // > 5MB
        return {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
        };
      } else {
        return {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.9,
        };
      }
    } else {
      // Video settings
      return {
        generateThumbnail: true,
        thumbnailOptions: {
          timePosition: 1000,
          quality: 0.8,
          size: {
            width: 640,
            height: 480,
          },
        },
      };
    }
  }
}

export const mediaProcessingService = new MediaProcessingService();