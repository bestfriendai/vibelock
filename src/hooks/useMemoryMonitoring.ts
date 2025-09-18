import { useEffect, useRef } from "react";
import { AppState, DeviceEventEmitter, NativeModules } from "react-native";
import { performanceMonitoringService } from "../services/performanceMonitoring";
import { cacheService } from "../services/cacheService";

export function useMemoryMonitoring(threshold = 150) {
  const cleanupTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastCleanupRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleMemoryWarning = () => {
      const now = Date.now();
      // Prevent cleanup spam - wait at least 30 seconds between cleanups
      if (now - lastCleanupRef.current < 30000) {
        return;
      }

      console.warn("Memory pressure detected, running cleanup...");
      lastCleanupRef.current = now;

      // Clear caches
      cacheService.clear();

      // Clear image cache
      if (NativeModules.RNCAsyncStorage) {
        const keys = ["image-cache", "temp-cache", "media-cache"];
        keys.forEach((key) => {
          NativeModules.RNCAsyncStorage.removeItem(key);
        });
      }

      // Force garbage collection if available (Hermes)
      if (global.gc) {
        global.gc();
      }

      // Clear old chat messages from memory
      const chatStore = require("../state/chatStore").useChatStore.getState();
      chatStore.clearOldMessages(7); // Keep only 7 days of messages

      // Notify performance monitoring
      performanceMonitoringService.recordMemoryPressure();
    };

    // iOS memory warning listener
    const memoryWarningSubscription = DeviceEventEmitter.addListener("memoryWarning", handleMemoryWarning);

    // Android memory monitoring via app state
    const appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        // Clean up when app goes to background
        handleMemoryWarning();
      }
    });

    // Periodic memory check
    const checkMemory = () => {
      const usage = performanceMonitoringService.getMemoryUsage();
      if (usage > threshold) {
        handleMemoryWarning();
      }
    };

    cleanupTimerRef.current = setInterval(checkMemory, 30000); // Every 30 seconds

    return () => {
      memoryWarningSubscription?.remove();
      appStateSubscription?.remove();
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [threshold]);
}
