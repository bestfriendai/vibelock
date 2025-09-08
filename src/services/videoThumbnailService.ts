import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ThumbnailResult {
  success: boolean;
  uri?: string;
  error?: string;
}

class VideoThumbnailService {
  private thumbnailCache = new Map<string, string>();

  /**
   * Generate thumbnail for video
   * Simplified approach - just return success without actual thumbnail generation
   * The UI will handle showing video icons instead
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
      if (videoUri.startsWith('file://') || videoUri.startsWith('content://')) {
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          return { success: false, error: 'Video file does not exist' };
        }
      }

      // For now, we'll indicate success but not provide a thumbnail URI
      // This tells the UI that the video is valid but to show a video icon instead
      this.thumbnailCache.set(cacheKey, 'video-placeholder');

      return {
        success: true,
        uri: undefined, // No actual thumbnail, UI will show video icon
      };
    } catch (error) {
      console.error('Video thumbnail generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a simple placeholder for video thumbnails
   */
  private async createVideoPlaceholder(): Promise<ThumbnailResult> {
    try {
      // Create a simple colored rectangle as a placeholder
      const result = await ImageManipulator.manipulateAsync(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        [
          { resize: { width: 200, height: 200 } }
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return {
        success: true,
        uri: result.uri,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create placeholder',
      };
    }
  }

  /**
   * Generate multiple thumbnails for video preview
   */
  async generateMultipleThumbnails(
    videoUri: string,
    count: number = 3,
    duration?: number
  ): Promise<ThumbnailResult[]> {
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
    // expo-video-thumbnails works on both iOS and Android
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Preload thumbnail for better UX
   */
  async preloadThumbnail(videoUri: string): Promise<void> {
    try {
      await this.generateThumbnail(videoUri);
    } catch (error) {
      console.warn('Failed to preload video thumbnail:', error);
    }
  }
}

export const videoThumbnailService = new VideoThumbnailService();
