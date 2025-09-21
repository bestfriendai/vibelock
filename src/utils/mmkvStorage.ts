import AsyncStorage from "@react-native-async-storage/async-storage";

// Try to import MMKV, but fall back to AsyncStorage if not available (Expo Go)
let storage: any = null;
let isMMKVAvailable = false;

try {
  const { MMKV } = require("react-native-mmkv");
  storage = new MMKV({
    id: "lockerroom-storage",
    encryptionKey: process.env.MMKV_ENCRYPTION_KEY || "default-key-change-in-production",
  });
  isMMKVAvailable = true;
  console.log("✅ MMKV storage initialized");
} catch (error) {
  console.log("⚠️ MMKV not available, falling back to AsyncStorage");
  storage = AsyncStorage;
  isMMKVAvailable = false;
}

// AsyncStorage-compatible adapter with MMKV fallback
export const mmkvStorage = {
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

  // Performance monitoring
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

// One-time migration from AsyncStorage to MMKV (only if MMKV is available)
export async function migrateFromAsyncStorage() {
  if (!isMMKVAvailable) {
    console.log("⚠️ MMKV not available, skipping migration");
    return;
  }

  try {
    console.log("Starting migration to MMKV...");
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
    console.log(`Migration completed: ${migrated} items migrated to MMKV`);

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
