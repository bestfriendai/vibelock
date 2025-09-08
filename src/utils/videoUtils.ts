import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Format video duration from seconds to MM:SS format
 */
export function formatVideoDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format video duration from milliseconds to MM:SS format
 */
export function formatVideoDurationFromMs(milliseconds: number): string {
  return formatVideoDuration(milliseconds / 1000);
}

/**
 * Check if a URI is a video file based on extension
 */
export function isVideoFile(uri: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const lowerUri = uri.toLowerCase();
  return videoExtensions.some(ext => lowerUri.includes(ext));
}

/**
 * Get video file size in bytes
 */
export async function getVideoFileSize(uri: string): Promise<number | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists ? fileInfo.size || null : null;
  } catch (error) {
    console.error('Failed to get video file size:', error);
    return null;
  }
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if video duration is within allowed limits
 */
export function isVideoDurationValid(duration: number, maxDurationSeconds: number = 60): boolean {
  return duration > 0 && duration <= maxDurationSeconds;
}

/**
 * Get video MIME type based on file extension
 */
export function getVideoMimeType(uri: string): string {
  const extension = uri.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    case 'webm':
      return 'video/webm';
    case 'm4v':
      return 'video/x-m4v';
    default:
      return 'video/mp4'; // Default fallback
  }
}

/**
 * Check if video thumbnails are supported on current platform
 */
export function areVideoThumbnailsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Validate video file before processing
 */
export async function validateVideoFile(uri: string, maxSizeMB: number = 50): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { isValid: false, error: 'Video file does not exist' };
    }

    // Check file size
    if (fileInfo.size && fileInfo.size > maxSizeMB * 1024 * 1024) {
      return { 
        isValid: false, 
        error: `Video file is too large. Maximum size is ${maxSizeMB}MB` 
      };
    }

    // Check if it's a video file
    if (!isVideoFile(uri)) {
      return { isValid: false, error: 'File is not a supported video format' };
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

/**
 * Generate a unique filename for video
 */
export function generateVideoFileName(originalUri: string, prefix: string = 'video'): string {
  const extension = originalUri.split('.').pop() || 'mp4';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Check if video player is supported on current platform
 */
export function isVideoPlayerSupported(): boolean {
  // expo-video supports iOS and Android
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
