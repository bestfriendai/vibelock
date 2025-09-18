import { MMKV } from "react-native-mmkv";

// Create encrypted storage instance for security
const storage = new MMKV({
  id: "lockerroom-storage",
  encryptionKey: process.env.MMKV_ENCRYPTION_KEY || "default-key-change-in-production",
});

// AsyncStorage-compatible adapter for easy migration
export const mmkvStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return storage.getString(key) ?? null;
    } catch (error) {
      console.error("MMKV getItem error:", error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      storage.set(key, value);
    } catch (error) {
      console.error("MMKV setItem error:", error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      storage.delete(key);
    } catch (error) {
      console.error("MMKV removeItem error:", error);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error("MMKV getAllKeys error:", error);
      return [];
    }
  },

  clear: async (): Promise<void> => {
    try {
      storage.clearAll();
    } catch (error) {
      console.error("MMKV clear error:", error);
    }
  },

  // Performance monitoring
  getSize: (): number => {
    return storage.getAllKeys().length;
  },
};

// One-time migration from AsyncStorage to MMKV
export async function migrateFromAsyncStorage() {
  const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");

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
  return !storage.contains("mmkv_migration_completed");
}
