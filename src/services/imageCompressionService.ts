import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "jpeg" | "png";
  maxSizeKB?: number; // Maximum file size in KB
}

export interface CompressionResult {
  success: boolean;
  uri?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

class ImageCompressionService {
  private static readonly DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    format: "jpeg",
    maxSizeKB: 500, // 500KB max
  };

  /**
   * Compress an image with smart optimization
   */
  async compressImage(imageUri: string, options: CompressionOptions = {}): Promise<CompressionResult> {
    try {
      const finalOptions = { ...ImageCompressionService.DEFAULT_OPTIONS, ...options };

      // Get original file info
      const originalInfo = await FileSystem.getInfoAsync(imageUri);
      if (!originalInfo.exists) {
        return {
          success: false,
          error: "Image file does not exist",
        };
      }

      const originalSize = originalInfo.size || 0;

      // If image is already small enough, return as-is
      if (finalOptions.maxSizeKB && originalSize <= finalOptions.maxSizeKB * 1024) {
        return {
          success: true,
          uri: imageUri,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
        };
      }

      // Get image dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Calculate optimal dimensions
      const { width: newWidth, height: newHeight } = this.calculateOptimalDimensions(
        imageInfo.width,
        imageInfo.height,
        finalOptions.maxWidth!,
        finalOptions.maxHeight!,
      );

      // Start with initial compression
      let result = await this.performCompression(imageUri, {
        width: newWidth,
        height: newHeight,
        quality: finalOptions.quality!,
        format: finalOptions.format!,
      });

      // If still too large, iteratively reduce quality
      if (finalOptions.maxSizeKB) {
        result = await this.iterativeCompress(
          result.uri,
          finalOptions.maxSizeKB,
          finalOptions.format!,
          newWidth,
          newHeight,
        );
      }

      const compressedInfo = await FileSystem.getInfoAsync(result.uri);
      const compressedSize = compressedInfo.exists ? compressedInfo.size || 0 : 0;

      return {
        success: true,
        uri: result.uri,
        originalSize,
        compressedSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
      };
    } catch (error) {
      console.warn("Image compression failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Compression failed",
      };
    }
  }

  /**
   * Compress multiple images in batch
   */
  async compressImages(imageUris: string[], options: CompressionOptions = {}): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    for (const uri of imageUris) {
      const result = await this.compressImage(uri, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    // Scale down if too wide
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    // Scale down if too tall
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }

  /**
   * Perform image compression with specified parameters
   */
  private async performCompression(
    uri: string,
    params: {
      width: number;
      height: number;
      quality: number;
      format: string;
    },
  ): Promise<{ uri: string }> {
    const actions: ImageManipulator.Action[] = [];

    // Add resize action
    actions.push({
      resize: {
        width: params.width,
        height: params.height,
      },
    });

    const format = params.format === "png" ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;

    return await ImageManipulator.manipulateAsync(uri, actions, {
      compress: params.quality,
      format,
    });
  }

  /**
   * Iteratively compress until target size is reached
   */
  private async iterativeCompress(
    uri: string,
    maxSizeKB: number,
    format: string,
    width: number,
    height: number,
  ): Promise<{ uri: string }> {
    let currentUri = uri;
    let quality = 0.8;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const fileInfo = await FileSystem.getInfoAsync(currentUri);
      const fileSizeKB = (fileInfo.exists ? fileInfo.size || 0 : 0) / 1024;

      if (fileSizeKB <= maxSizeKB) {
        break;
      }

      // Reduce quality for next attempt
      quality = Math.max(0.1, quality - 0.15);

      const result = await this.performCompression(currentUri, {
        width,
        height,
        quality,
        format,
      });

      currentUri = result.uri;
      attempts++;
    }

    return { uri: currentUri };
  }

  /**
   * Get compression recommendations based on use case
   */
  getRecommendedOptions(useCase: "profile" | "review" | "thumbnail"): CompressionOptions {
    switch (useCase) {
      case "profile":
        return {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.85,
          format: "jpeg",
          maxSizeKB: 200,
        };

      case "review":
        return {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          format: "jpeg",
          maxSizeKB: 800,
        };

      case "thumbnail":
        return {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.7,
          format: "jpeg",
          maxSizeKB: 100,
        };

      default:
        return ImageCompressionService.DEFAULT_OPTIONS;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }
}

export const imageCompressionService = new ImageCompressionService();
