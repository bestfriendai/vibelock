/**
 * Comprehensive Caching Service
 * Provides intelligent caching for database queries and API responses
 * with automatic invalidation and memory management
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
  tags: string[]; // For tag-based invalidation
}

interface CacheConfig {
  defaultTTL: number; // Default 5 minutes
  maxMemoryEntries: number; // Maximum entries in memory cache
  persistentStorage: boolean; // Whether to use AsyncStorage
  compressionThreshold: number; // Compress data larger than this size
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheHits: Map<string, number> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> set of keys

  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxMemoryEntries: 500,
    persistentStorage: true,
    compressionThreshold: 10000, // 10KB
  };

  private readonly STORAGE_PREFIX = "@cache:";
  private readonly METADATA_KEY = "@cache:metadata";

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeCache();
  }

  /**
   * Initialize cache and load metadata from persistent storage
   */
  private async initializeCache(): Promise<void> {
    if (!this.config.persistentStorage) return;

    try {
      const metadata = await AsyncStorage.getItem(this.METADATA_KEY);
      if (metadata) {
        const { tagIndex } = JSON.parse(metadata);
        this.tagIndex = new Map(Object.entries(tagIndex).map(([tag, keys]) => [tag, new Set(keys as string[])]));
      }
    } catch (error) {}
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Add tags to tag index
   */
  private addToTagIndex(key: string, tags: string[]): void {
    tags.forEach((tag) => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });
  }

  /**
   * Remove key from tag index
   */
  private removeFromTagIndex(key: string, tags: string[]): void {
    tags.forEach((tag) => {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(key);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });
  }

  /**
   * Cleanup expired entries and manage memory
   */
  private async cleanup(): Promise<void> {
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key);
    }

    // If still over limit, remove least recently used entries
    if (this.memoryCache.size > this.config.maxMemoryEntries) {
      const sortedByHits = Array.from(this.memoryCache.keys()).sort(
        (a, b) => (this.cacheHits.get(a) || 0) - (this.cacheHits.get(b) || 0),
      );

      const toRemove = sortedByHits.slice(0, this.memoryCache.size - this.config.maxMemoryEntries);
      for (const key of toRemove) {
        await this.delete(key);
      }
    }
  }

  /**
   * Save metadata to persistent storage
   */
  private async saveMetadata(): Promise<void> {
    if (!this.config.persistentStorage) return;

    try {
      const metadata = {
        tagIndex: Object.fromEntries(Array.from(this.tagIndex.entries()).map(([tag, keys]) => [tag, Array.from(keys)])),
      };
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {}
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.cacheHits.set(key, (this.cacheHits.get(key) || 0) + 1);
      return memoryEntry.data;
    }

    // Check persistent storage
    if (this.config.persistentStorage) {
      try {
        const stored = await AsyncStorage.getItem(this.STORAGE_PREFIX + key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Move to memory cache
            this.memoryCache.set(key, entry);
            this.cacheHits.set(key, (this.cacheHits.get(key) || 0) + 1);
            return entry.data;
          } else {
            // Remove expired entry
            await AsyncStorage.removeItem(this.STORAGE_PREFIX + key);
          }
        }
      } catch (error) {}
    }

    return null;
  }

  /**
   * Set cached data
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
      persistent?: boolean;
    } = {},
  ): Promise<void> {
    const ttl = options.ttl || this.config.defaultTTL;
    const tags = options.tags || [];
    const persistent = options.persistent !== false && this.config.persistentStorage;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags,
    };

    // Add to memory cache
    this.memoryCache.set(key, entry);
    this.addToTagIndex(key, tags);

    // Add to persistent storage if enabled
    if (persistent) {
      try {
        await AsyncStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch (error) {}
    }

    // Cleanup if needed
    if (this.memoryCache.size > this.config.maxMemoryEntries * 1.1) {
      await this.cleanup();
    }

    await this.saveMetadata();
  }

  /**
   * Delete cached entry
   */
  async delete(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.removeFromTagIndex(key, entry.tags);
    }

    this.memoryCache.delete(key);
    this.cacheHits.delete(key);

    if (this.config.persistentStorage) {
      try {
        await AsyncStorage.removeItem(this.STORAGE_PREFIX + key);
      } catch (error) {}
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>();

    tags.forEach((tag) => {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.forEach((key) => keysToDelete.add(key));
      }
    });

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    await this.saveMetadata();
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.cacheHits.clear();
    this.tagIndex.clear();

    if (this.config.persistentStorage) {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter((key) => key.startsWith(this.STORAGE_PREFIX));
        await AsyncStorage.multiRemove([...cacheKeys, this.METADATA_KEY]);
      } catch (error) {}
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    totalHits: number;
    tags: number;
    hitRate: number;
  } {
    const totalHits = Array.from(this.cacheHits.values()).reduce((sum, hits) => sum + hits, 0);
    const totalRequests = totalHits + this.memoryCache.size; // Approximation

    return {
      memoryEntries: this.memoryCache.size,
      totalHits,
      tags: this.tagIndex.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    };
  }

  /**
   * Wrapper for caching function results
   */
  async cached<T>(
    cacheKey: string,
    fn: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      forceRefresh?: boolean;
    } = {},
  ): Promise<T> {
    if (!options.forceRefresh) {
      const cached = await this.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const result = await fn();
    await this.set(cacheKey, result, options);
    return result;
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Specialized cache instances for different use cases
export const locationCache = new CacheService({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for location data
  maxMemoryEntries: 100,
});

export const searchCache = new CacheService({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for search results
  maxMemoryEntries: 200,
});

export const userCache = new CacheService({
  defaultTTL: 15 * 60 * 1000, // 15 minutes for user data
  maxMemoryEntries: 50,
});

export default cacheService;
