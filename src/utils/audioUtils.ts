import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { AudioError } from "../types";

/**
 * Format audio duration from seconds to MM:SS or HH:MM:SS
 */
export function formatAudioDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Alias for formatAudioDuration for compatibility
 */
export const formatDuration = formatAudioDuration;

/**
 * Validate if audio file exists and is playable
 */
export async function validateAudioFile(uri: string): Promise<boolean> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return false;
    }

    // Try to create a sound object to verify it's playable
    const { sound } = await Audio.Sound.createAsync({ uri });
    // If creation succeeds, assume it's valid
    await sound.unloadAsync();

    return true;
  } catch (error) {
    console.error("Audio validation failed");
    return false;
  }
}

/**
 * Get audio metadata including duration, format, and sample rate
 */
export async function getAudioMetadata(uri: string): Promise<{
  duration: number;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
} | null> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });

    // Get status to retrieve duration
    const status = await sound.getStatusAsync();

    if (!status.isLoaded) {
      await sound.unloadAsync();
      return null;
    }

    const metadata = {
      duration: status.durationMillis ? status.durationMillis / 1000 : 0,
    };

    await sound.unloadAsync();
    return metadata;
  } catch (error) {
    console.error("Failed to get audio metadata");
    return null;
  }
}

/**
 * Normalize audio level arrays for consistent waveform display
 */
export function normalizeAudioLevels(levels: number[]): number[] {
  if (!levels || levels.length === 0) {
    return [];
  }

  const max = Math.max(...levels);
  const min = Math.min(...levels);
  const range = max - min;

  if (range === 0) {
    return levels.map(() => 0.5);
  }

  return levels.map((level) => {
    const normalized = (level - min) / range;
    // Ensure minimum visibility
    return Math.max(0.1, Math.min(1, normalized));
  });
}

/**
 * Calculate audio progress percentage with edge case handling
 */
export function calculateAudioProgress(currentTime: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  if (currentTime <= 0) return 0;
  if (currentTime >= duration) return 1;

  return currentTime / duration;
}

/**
 * Generate simplified waveform for small displays
 */
export function generateAudioThumbnail(waveformData: number[], targetWidth: number): number[] {
  if (!waveformData || waveformData.length === 0) {
    return Array(targetWidth).fill(0.5);
  }

  if (waveformData.length <= targetWidth) {
    return waveformData;
  }

  const thumbnail: number[] = [];
  const step = waveformData.length / targetWidth;

  for (let i = 0; i < targetWidth; i++) {
    const startIndex = Math.floor(i * step);
    const endIndex = Math.floor((i + 1) * step);

    // Take average of segment
    let sum = 0;
    let count = 0;
    for (let j = startIndex; j < endIndex && j < waveformData.length; j++) {
      const value = waveformData[j];
      if (value !== undefined && value !== null && !isNaN(value)) {
        sum += value;
        count++;
      }
    }

    thumbnail.push(count > 0 ? sum / count : 0);
  }

  return thumbnail;
}

/**
 * Debounce audio seek operations for smooth seeking
 */
export function debounceAudioSeek(
  seekFunction: (position: number) => void,
  delay: number = 100,
): (position: number) => void {
  let timeoutId: NodeJS.Timeout;

  return (position: number) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      seekFunction(position);
    }, delay);
  };
}

/**
 * Check if audio format is supported
 */
export function isAudioSupported(mimeType: string): boolean {
  const supportedTypes = [
    "audio/mp4",
    "audio/m4a",
    "audio/mp3",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
  ];

  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * Convert technical audio errors to user-friendly messages
 */
export function audioErrorToUserMessage(error: Error | AudioError | string): string {
  if (typeof error === "string") {
    return error;
  }

  if ("code" in error) {
    switch (error.code) {
      case "AUDIO_LOAD_FAILED":
        return "Unable to load audio. Please check your connection and try again.";
      case "AUDIO_DECODE_ERROR":
        return "This audio format is not supported. Please try a different file.";
      case "AUDIO_PERMISSION_DENIED":
        return "Microphone permission is required to record audio.";
      case "AUDIO_NETWORK_ERROR":
        return "Network error. Please check your connection and try again.";
      default:
        return error.message || "An error occurred while playing audio.";
    }
  }

  return error.message || "An unexpected error occurred.";
}

/**
 * Compress audio for upload (placeholder - requires native implementation)
 */
export async function compressAudioForUpload(
  uri: string,
  quality: "low" | "medium" | "high" = "medium",
): Promise<string> {
  try {
    // Check file size
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error("Audio file not found");
    }

    const fileSizeInMB = (fileInfo.size || 0) / (1024 * 1024);

    // If file is already small enough, don't compress
    const maxSizes = {
      low: 1,
      medium: 3,
      high: 5,
    };

    if (fileSizeInMB <= maxSizes[quality]) {
      return uri;
    }

    // In production, you would implement actual audio compression here
    // using native modules or a compression service.
    // Placeholder: skip compression in this environment and return the original URI.
    console.log(`Skipping compression for ${fileSizeInMB.toFixed(1)}MB file at quality: ${quality}`);

    return uri;
  } catch (error) {
    console.error("Audio compression failed", error);
    throw new Error("Audio compression failed");
  }
}

/**
 * Calculate optimal buffer size for streaming
 */
export function calculateBufferSize(duration: number, bitrate?: number): number {
  const defaultBitrate = 128000; // 128 kbps
  const effectiveBitrate = bitrate || defaultBitrate;

  // Buffer 5 seconds or 10% of duration, whichever is smaller
  const bufferSeconds = Math.min(5, duration * 0.1);
  const bufferSize = (effectiveBitrate * bufferSeconds) / 8; // Convert bits to bytes

  return Math.floor(bufferSize);
}

/**
 * Generate unique audio file name
 */
export function generateAudioFileName(extension: string = "m4a"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `voice_${timestamp}_${random}.${extension}`;
}

/**
 * Estimate audio file size based on duration and quality
 */
export function estimateAudioFileSize(durationSeconds: number, quality: "low" | "medium" | "high" = "medium"): number {
  // Bitrates in kbps
  const bitrates = {
    low: 64,
    medium: 128,
    high: 256,
  };

  const bitrate = bitrates[quality];
  const sizeInBytes = (bitrate * 1000 * durationSeconds) / 8;

  return Math.ceil(sizeInBytes);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Check if device has enough storage for recording
 */
export async function hasEnoughStorageForRecording(estimatedSizeBytes: number): Promise<boolean> {
  try {
    const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
    // Require at least 2x the estimated size for safety
    return freeDiskStorage > estimatedSizeBytes * 2;
  } catch (error) {
    console.error("Failed to check storage");
    return true; // Assume there's enough space if check fails
  }
}

/**
 * Clean up temporary audio files
 */
export async function cleanupTempAudioFiles(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const tempDir = `${(FileSystem as any).documentDirectory}audio_temp/`;
    const dirInfo = await FileSystem.getInfoAsync(tempDir);

    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = `${tempDir}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists && fileInfo.modificationTime) {
        const age = now - fileInfo.modificationTime * 1000;
        if (age > olderThanMs) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      }
    }
  } catch (error) {
    console.error("Failed to cleanup temp audio files");
  }
}
