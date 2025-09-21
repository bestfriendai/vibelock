import { createAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

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
  private analysisQueue: { uri: string; resolve: Function; reject: Function }[] = [];
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
      const player = createAudioPlayer(audioUri, { updateInterval: ANALYSIS_INTERVAL_MS });

      // Wait for the audio to load
      await new Promise<void>((resolve, reject) => {
        const checkLoaded = () => {
          if (player.isLoaded) {
            resolve();
          } else if (!player.isLoaded) {
            // Wait a bit and check again
            setTimeout(checkLoaded, 100);
          } else {
            reject(new Error("Failed to load audio for analysis"));
          }
        };
        checkLoaded();
      });

      if (!player.isLoaded || !player.duration) {
        player.remove();
        throw new Error("Failed to load audio for analysis");
      }

      const duration = player.duration;
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
      player.remove();

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
      const player = createAudioPlayer(audioUri);

      // Wait for the audio to load
      await new Promise<void>((resolve, reject) => {
        const checkLoaded = () => {
          if (player.isLoaded) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        setTimeout(() => reject(new Error("Timeout loading audio")), 5000);
        checkLoaded();
      });

      if (!player.isLoaded || !player.duration) {
        player.remove();
        throw new Error("Failed to load audio for duration");
      }

      const duration = player.duration;
      player.remove();

      return duration;
    } catch (error) {
      console.error("Error getting audio duration:", error);
      return 0;
    }
  }

  /**
   * Analyze audio levels for real-time monitoring
   */
  async analyzeAudioLevels(audioUri: string, callback: (level: number) => void, intervalMs = 100): Promise<() => void> {
    let isAnalyzing = true;
    let player: any = null;
    let intervalId: NodeJS.Timeout | null = null;

    const analyze = async () => {
      try {
        player = createAudioPlayer(audioUri);

        // Wait for loading
        await new Promise<void>((resolve, reject) => {
          const checkLoaded = () => {
            if (player.isLoaded) {
              resolve();
            } else {
              setTimeout(checkLoaded, 50);
            }
          };
          setTimeout(() => reject(new Error("Timeout loading audio")), 5000);
          checkLoaded();
        });

        if (!player.isLoaded) {
          throw new Error("Failed to load audio for analysis");
        }

        // Start playing
        player.play();

        // Simulate level analysis with interval
        intervalId = setInterval(() => {
          if (!isAnalyzing) return;

          if (player.isLoaded && player.playing) {
            // Simulate level analysis based on playback position
            const position = player.currentTime / (player.duration || 1);
            const level = 0.3 + Math.sin(position * Math.PI * 4) * 0.3 + Math.random() * 0.2;
            callback(Math.max(0, Math.min(1, level)));
          }
        }, intervalMs);
      } catch (error) {
        console.error("Error analyzing audio levels:", error);
        callback(0);
      }
    };

    analyze();

    // Return cleanup function
    return async () => {
      isAnalyzing = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (player) {
        try {
          player.pause();
          player.remove();
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
      const player = createAudioPlayer(audioUri);

      // Wait for loading
      await new Promise<void>((resolve, reject) => {
        const checkLoaded = () => {
          if (player.isLoaded) {
            resolve();
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        setTimeout(() => reject(new Error("Timeout loading audio")), 5000);
        checkLoaded();
      });

      if (!player.isLoaded) {
        player.remove();
        throw new Error("Failed to load audio for metadata");
      }

      const metadata: AudioMetadata = {
        duration: player.duration || 0,
      };

      // Note: Platform-specific metadata fields are not directly available from expo-audio
      // Additional metadata extraction would require native modules or third-party libraries

      player.remove();

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
