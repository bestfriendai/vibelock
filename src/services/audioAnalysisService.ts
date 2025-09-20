import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

interface AudioMetadata {
  duration: number;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
}

interface AudioAnalysisResult {
  duration: number;
  waveformData: number[];
  peakLevel: number;
  averageLevel: number;
  metadata?: AudioMetadata;
}

const CACHE_PREFIX = "audio_analysis_";
const CACHE_EXPIRY_HOURS = 24;
const WAVEFORM_SAMPLE_SIZE = 50;
const ANALYSIS_INTERVAL_MS = 100;

class AudioAnalysisService {
  private cache = new Map<string, AudioAnalysisResult>();
  private analysisQueue: Array<{ uri: string; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  /**
   * Generate waveform data for audio visualization
   */
  async generateWaveformData(audioUri: string): Promise<number[]> {
    try {
      // Check cache first
      const cached = await this.getCachedAnalysis(audioUri);
      if (cached?.waveformData) {
        return cached.waveformData;
      }

      // Load audio for analysis
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { progressUpdateIntervalMillis: ANALYSIS_INTERVAL_MS }
      );

      if (!status.isLoaded || !status.durationMillis) {
        throw new Error("Failed to load audio for analysis");
      }

      const duration = status.durationMillis / 1000;
      const sampleInterval = duration / WAVEFORM_SAMPLE_SIZE;
      const waveformData: number[] = [];

      // Generate waveform by sampling audio at intervals
      // NOTE: This is a placeholder implementation that generates a realistic-looking waveform
      // In production, you would either:
      // 1. Use precomputed waveform data from the message if available
      // 2. Implement actual audio peak sampling using native modules
      // 3. Use a third-party service for waveform generation
      for (let i = 0; i < WAVEFORM_SAMPLE_SIZE; i++) {
        const position = i / WAVEFORM_SAMPLE_SIZE;
        const centerDistance = Math.abs(position - 0.5) * 2;
        const baseAmplitude = 0.3 + (1 - centerDistance) * 0.5;
        const randomVariation = Math.random() * 0.2 - 0.1;
        const amplitude = Math.max(0.1, Math.min(1, baseAmplitude + randomVariation));
        waveformData.push(amplitude);
      }

      // Clean up
      await sound.unloadAsync();

      // Cache the result
      const analysisResult: AudioAnalysisResult = {
        duration,
        waveformData,
        peakLevel: Math.max(...waveformData),
        averageLevel: waveformData.reduce((a, b) => a + b, 0) / waveformData.length,
      };

      await this.cacheAnalysis(audioUri, analysisResult);

      return waveformData;
    } catch (error) {
      console.error("Error generating waveform data:", error);
      // Return default waveform on error
      return this.generateDefaultWaveform();
    }
  }

  /**
   * Get accurate audio duration
   */
  async getAudioDuration(audioUri: string): Promise<number> {
    try {
      const { sound, status } = await Audio.Sound.createAsync({ uri: audioUri });

      if (!status.isLoaded || !status.durationMillis) {
        throw new Error("Failed to load audio for duration");
      }

      const duration = status.durationMillis / 1000;
      await sound.unloadAsync();

      return duration;
    } catch (error) {
      console.error("Error getting audio duration:", error);
      return 0;
    }
  }

  /**
   * Analyze audio levels for real-time monitoring
   */
  async analyzeAudioLevels(
    audioUri: string,
    callback: (level: number) => void,
    intervalMs = 100
  ): Promise<() => void> {
    let isAnalyzing = true;
    let sound: Audio.Sound | null = null;

    const analyze = async () => {
      try {
        const result = await Audio.Sound.createAsync(
          { uri: audioUri },
          {
            progressUpdateIntervalMillis: intervalMs,
            shouldPlay: true,
          },
          (status) => {
            if (status.isLoaded && status.isPlaying && isAnalyzing) {
              // Simulate level analysis based on playback position
              const position = (status.positionMillis || 0) / (status.durationMillis || 1);
              const level = 0.3 + Math.sin(position * Math.PI * 4) * 0.3 + Math.random() * 0.2;
              callback(Math.max(0, Math.min(1, level)));
            }
          }
        );

        sound = result.sound;
      } catch (error) {
        console.error("Error analyzing audio levels:", error);
        callback(0);
      }
    };

    analyze();

    // Return cleanup function
    return async () => {
      isAnalyzing = false;
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (error) {
          console.error("Error cleaning up audio analysis:", error);
        }
      }
    };
  }

  /**
   * Get comprehensive audio metadata
   */
  async getAudioMetadata(audioUri: string): Promise<AudioMetadata | null> {
    try {
      const { sound, status } = await Audio.Sound.createAsync({ uri: audioUri });

      if (!status.isLoaded) {
        throw new Error("Failed to load audio for metadata");
      }

      const metadata: AudioMetadata = {
        duration: (status.durationMillis || 0) / 1000,
      };

      // Note: Platform-specific metadata fields are not directly available from expo-av status
      // Additional metadata extraction would require native modules or third-party libraries

      await sound.unloadAsync();

      return metadata;
    } catch (error) {
      console.error("Error getting audio metadata:", error);
      return null;
    }
  }

  /**
   * Process audio for optimization (compression, format conversion)
   */
  async processAudioForUpload(audioUri: string, quality: "low" | "medium" | "high" = "medium"): Promise<string> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error("Audio file does not exist");
      }

      // For now, return the original URI
      // In production, you'd implement actual compression using native modules
      return audioUri;
    } catch (error) {
      console.error("Error processing audio for upload:", error);
      throw error;
    }
  }

  /**
   * Generate default waveform pattern
   */
  private generateDefaultWaveform(size: number = WAVEFORM_SAMPLE_SIZE): number[] {
    return Array.from({ length: size }, (_, i) => {
      const position = i / size;
      const centerDistance = Math.abs(position - 0.5) * 2;
      return 0.3 + (1 - centerDistance) * 0.4 + Math.random() * 0.2;
    });
  }

  /**
   * Cache analysis results
   */
  private async cacheAnalysis(audioUri: string, result: AudioAnalysisResult): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${audioUri}`;
      const cacheData = {
        ...result,
        timestamp: Date.now(),
      };

      // Memory cache
      this.cache.set(audioUri, result);

      // Persistent cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Clean up old cache entries
      this.cleanupCache();
    } catch (error) {
      console.error("Error caching audio analysis:", error);
    }
  }

  /**
   * Get cached analysis results
   */
  private async getCachedAnalysis(audioUri: string): Promise<AudioAnalysisResult | null> {
    try {
      // Check memory cache first
      if (this.cache.has(audioUri)) {
        return this.cache.get(audioUri)!;
      }

      // Check persistent cache
      const cacheKey = `${CACHE_PREFIX}${audioUri}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const ageHours = (Date.now() - cacheData.timestamp) / (1000 * 60 * 60);

      if (ageHours > CACHE_EXPIRY_HOURS) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      // Update memory cache
      const result: AudioAnalysisResult = {
        duration: cacheData.duration,
        waveformData: cacheData.waveformData,
        peakLevel: cacheData.peakLevel,
        averageLevel: cacheData.averageLevel,
        metadata: cacheData.metadata,
      };

      this.cache.set(audioUri, result);
      return result;
    } catch (error) {
      console.error("Error retrieving cached audio analysis:", error);
      return null;
    }
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const audioKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      for (const key of audioKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) continue;

        const cacheData = JSON.parse(cached);
        const ageHours = (Date.now() - cacheData.timestamp) / (1000 * 60 * 60);

        if (ageHours > CACHE_EXPIRY_HOURS) {
          await AsyncStorage.removeItem(key);
        }
      }

      // Limit memory cache size
      if (this.cache.size > 50) {
        const entries = Array.from(this.cache.entries());
        this.cache.clear();
        entries.slice(-25).forEach(([key, value]) => {
          this.cache.set(key, value);
        });
      }
    } catch (error) {
      console.error("Error cleaning up audio cache:", error);
    }
  }

  /**
   * Process queued analysis requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.analysisQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.analysisQueue.length > 0) {
      const request = this.analysisQueue.shift();
      if (!request) continue;

      try {
        const waveformData = await this.generateWaveformData(request.uri);
        request.resolve(waveformData);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Queue analysis request for batch processing
   */
  queueAnalysis(audioUri: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.analysisQueue.push({ uri: audioUri, resolve, reject });
      this.processQueue();
    });
  }
}

export default new AudioAnalysisService();