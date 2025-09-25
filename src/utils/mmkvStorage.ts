import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Storage utility that provides MMKV with AsyncStorage fallback
 * MMKV is used when available for better performance, falls back to AsyncStorage in Expo Go
 */

// Try to import MMKV, but fall back to AsyncStorage if not available (Expo Go)
let storage: any = null;
let isMMKVAvailable = false;

try {
  const { MMKV } = require("react-native-mmkv");
  storage = new MMKV({
    id: "lockerroom-storage",
    encryptionKey: process.env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY || "default-key-change-in-production",
  });
  isMMKVAvailable = true;
} catch (error) {
  storage = AsyncStorage;
  isMMKVAvailable = false;
}

/**
 * AsyncStorage-compatible storage adapter with MMKV fallback
 * Provides consistent API regardless of underlying storage implementation
 */
export const mmkvStorage = {
  /**
   * Retrieves an item from storage
   * @param key - Storage key to retrieve
   * @returns Promise resolving to the stored value or null if not found
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isMMKVAvailable) {
        return storage.getString(key) ?? null;
      } else {
        return await storage.getItem(key);
      }
    } catch (error) {
      console.error("Storage getItem error:", error);
      return null;
    }
  },

  /**
   * Stores an item in storage
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise that resolves when storage is complete
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isMMKVAvailable) {
        storage.set(key, value);
      } else {
        await storage.setItem(key, value);
      }
    } catch (error) {
      console.error("Storage setItem error:", error);
      throw error;
    }
  },

  /**
   * Removes an item from storage
   * @param key - Storage key to remove
   * @returns Promise that resolves when removal is complete
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      if (isMMKVAvailable) {
        storage.delete(key);
      } else {
        await storage.removeItem(key);
      }
    } catch (error) {
      console.error("Storage removeItem error:", error);
    }
  },

  /**
   * Retrieves all storage keys
   * @returns Promise resolving to array of all storage keys
   */
  getAllKeys: async (): Promise<string[]> => {
    try {
      if (isMMKVAvailable) {
        return storage.getAllKeys();
      } else {
        return await storage.getAllKeys();
      }
    } catch (error) {
      console.error("Storage getAllKeys error:", error);
      return [];
    }
  },

  /**
   * Clears all storage data
   * @returns Promise that resolves when storage is cleared
   */
  clear: async (): Promise<void> => {
    try {
      if (isMMKVAvailable) {
        storage.clearAll();
      } else {
        await storage.clear();
      }
    } catch (error) {
      console.error("Storage clear error:", error);
    }
  },

  /**
   * Gets the approximate size of stored data
   * @returns Promise resolving to the number of stored items
   */
  getSize: async (): Promise<number> => {
    try {
      if (isMMKVAvailable) {
        return storage.getAllKeys().length;
      } else {
        const keys = await storage.getAllKeys();
        return keys.length;
      }
    } catch (error) {
      console.error("Storage getSize error:", error);
      return 0;
    }
  },
};

/**
 * One-time migration from AsyncStorage to MMKV
 * Only runs if MMKV is available and migration hasn't been performed
 */
export async function migrateFromAsyncStorage() {
  if (!isMMKVAvailable) {
    return;
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const entries = await AsyncStorage.multiGet(keys);

    let migrated = 0;
    for (const [key, value] of entries) {
      if (value) {
        storage.set(key, value);
        migrated++;
      }
    }

    // Clear AsyncStorage after successful migration
    await AsyncStorage.clear();
    // Set migration flag
    storage.set("mmkv_migration_completed", "true");
  } catch (error) {
    console.error("Migration to MMKV failed:", error);
    throw error;
  }
}

// Check if migration is needed
export function needsMigration(): boolean {
  if (!isMMKVAvailable) {
    return false;
  }
  return !storage.contains("mmkv_migration_completed");
}

// Export storage type info for debugging
export const storageInfo = {
  isMMKVAvailable,
  storageType: isMMKVAvailable ? "MMKV" : "AsyncStorage",
};
