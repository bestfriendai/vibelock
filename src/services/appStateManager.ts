// AppState Management Service for React Native
// Monitors app state changes and coordinates with the chat system

import { AppState, AppStateStatus } from "react-native";
import { reliableNetworkCheck } from "../utils/reliableNetworkCheck";
import { consolidatedRealtimeService } from "./consolidatedRealtimeService";

interface AppStateChangeHandler {
  (nextAppState: AppStateStatus, prevAppState: AppStateStatus): void;
}

interface AppStateDebugInfo {
  currentState: string;
  isInitialized: boolean;
  listenersCount: number;
  foregroundCallbacksCount: number;
  backgroundCallbacksCount: number;
  backgroundTimestamp: number | null;
  lastStateChange: number;
}

interface AppStateListener {
  id: string;
  handler: AppStateChangeHandler;
  priority: "high" | "normal" | "low";
}

class AppStateManager {
  private currentState: AppStateStatus = AppState.currentState;
  private listeners: Map<string, AppStateListener> = new Map();
  private appStateSubscription: any = null;
  private isInitialized = false;

  // Debouncing configuration
  private stateChangeDebounce: NodeJS.Timeout | null = null;
  private debounceMs = 500; // Prevent rapid state changes
  private lastStateChange = Date.now();
  private minTimeBetweenChanges = 300; // Minimum time between state changes

  // Background/foreground tracking
  private backgroundTimestamp: number | null = null;
  private foregroundCallbacks: (() => void)[] = [];
  private backgroundCallbacks: (() => void)[] = [];

  // Network recovery
  private networkCheckTimeout: NodeJS.Timeout | null = null;
  private maxNetworkCheckAttempts = 3;
  private networkCheckDelayMs = 1000;

  /**
   * Initialize the AppState manager
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Set initial state
    this.currentState = AppState.currentState;
    // Subscribe to AppState changes
    this.appStateSubscription = AppState.addEventListener("change", this.handleAppStateChange.bind(this));

    this.isInitialized = true;
  }

  /**
   * Handle AppState changes with debouncing
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const prevState = this.currentState;

    // Check if this is too rapid a change
    const now = Date.now();
    if (now - this.lastStateChange < this.minTimeBetweenChanges) {
      return;
    }

    this.lastStateChange = now;

    // Clear existing debounce
    if (this.stateChangeDebounce) {
      clearTimeout(this.stateChangeDebounce);
    }

    // Debounce the state change
    this.stateChangeDebounce = setTimeout(() => {
      this.processStateChange(nextAppState, prevState);
    }, this.debounceMs);
  }

  /**
   * Process the debounced state change
   */
  private async processStateChange(nextAppState: AppStateStatus, prevState: AppStateStatus): Promise<void> {
    this.currentState = nextAppState;

    // Handle specific state transitions
    if (nextAppState === "background" && prevState === "active") {
      await this.handleGoingToBackground();
    } else if (nextAppState === "active" && (prevState === "background" || prevState === "inactive")) {
      await this.handleReturningToForeground();
    } else if (nextAppState === "inactive") {
      console.log("App became inactive");
    }

    // Notify all registered listeners in priority order
    await this.notifyListeners(nextAppState, prevState);
  }

  /**
   * Handle app going to background
   */
  private async handleGoingToBackground(): Promise<void> {
    this.backgroundTimestamp = Date.now();

    try {
      // Pause real-time subscriptions gracefully
      // Clear typing indicators
      const activeRooms = consolidatedRealtimeService.getActiveRoomIds();
      for (const roomId of activeRooms) {
        consolidatedRealtimeService.stopTyping(roomId);
      }

      // Pause all realtime subscriptions
      await consolidatedRealtimeService.pauseAll();

      // Execute background callbacks
      for (const callback of this.backgroundCallbacks) {
        try {
          callback();
        } catch (error) {
          console.error("[AppStateManager] Background callback error:", error);
        }
      }
    } catch (error) {
      console.error("[AppStateManager] Error handling background transition:", error);
    }
  }

  /**
   * Handle app returning to foreground
   */
  private async handleReturningToForeground(): Promise<void> {
    const timeInBackground = this.backgroundTimestamp ? Date.now() - this.backgroundTimestamp : 0;

    this.backgroundTimestamp = null;

    try {
      // Check network connectivity before reconnecting
      const networkStatus = await this.checkNetworkWithRetry();

      if (!networkStatus.isConnected) {
        this.scheduleNetworkRecheck();
        return;
      }

      // Execute foreground callbacks
      for (const callback of this.foregroundCallbacks) {
        try {
          callback();
        } catch (error) {
          console.error("[AppStateManager] Foreground callback error:", error);
        }
      }
    } catch (error) {
      console.error("[AppStateManager] Error handling foreground transition:", error);
    }
  }

  /**
   * Check network connectivity with retries
   */
  private async checkNetworkWithRetry(attempts = 0): Promise<{ isConnected: boolean }> {
    try {
      const result = await reliableNetworkCheck();
      return { isConnected: result.isConnected && result.isStable };
    } catch (error) {
      console.error(`[AppStateManager] Network check attempt ${attempts + 1} failed:`, error);

      if (attempts < this.maxNetworkCheckAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.networkCheckDelayMs));
        return this.checkNetworkWithRetry(attempts + 1);
      }

      return { isConnected: false };
    }
  }

  /**
   * Schedule a network recheck for later
   */
  private scheduleNetworkRecheck(): void {
    if (this.networkCheckTimeout) {
      clearTimeout(this.networkCheckTimeout);
    }

    this.networkCheckTimeout = setTimeout(async () => {
      const networkStatus = await this.checkNetworkWithRetry();
      if (networkStatus.isConnected) {
        for (const callback of this.foregroundCallbacks) {
          try {
            callback();
          } catch (error) {
            console.error("[AppStateManager] Deferred foreground callback error:", error);
          }
        }
      } else {
        // Schedule another check
        this.scheduleNetworkRecheck();
      }
    }, 5000);
  }

  /**
   * Register a listener for AppState changes
   */
  registerListener(id: string, handler: AppStateChangeHandler, priority: "high" | "normal" | "low" = "normal"): void {
    this.listeners.set(id, { id, handler, priority });
  }

  /**
   * Unregister a listener
   */
  unregisterListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Register a callback for foreground transitions
   */
  onForeground(callback: () => void): () => void {
    this.foregroundCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.foregroundCallbacks.indexOf(callback);
      if (index > -1) {
        this.foregroundCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for background transitions
   */
  onBackground(callback: () => void): () => void {
    this.backgroundCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.backgroundCallbacks.indexOf(callback);
      if (index > -1) {
        this.backgroundCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all registered listeners in priority order
   */
  private async notifyListeners(nextAppState: AppStateStatus, prevAppState: AppStateStatus): Promise<void> {
    // Sort listeners by priority
    const sortedListeners = Array.from(this.listeners.values()).sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Notify each listener
    for (const listener of sortedListeners) {
      try {
        await Promise.resolve(listener.handler(nextAppState, prevAppState));
      } catch (error) {
        console.error(`[AppStateManager] Listener error (${listener.id}):`, error);
      }
    }
  }

  /**
   * Get current app state
   */
  getCurrentState(): AppStateStatus {
    return this.currentState;
  }

  /**
   * Check if app is in foreground
   */
  isInForeground(): boolean {
    return this.currentState === "active";
  }

  /**
   * Check if app is in background
   */
  isInBackground(): boolean {
    return this.currentState === "background";
  }

  /**
   * Clean up and destroy the manager
   */
  destroy(): void {
    // Clear all timeouts
    if (this.stateChangeDebounce) {
      clearTimeout(this.stateChangeDebounce);
    }
    if (this.networkCheckTimeout) {
      clearTimeout(this.networkCheckTimeout);
    }

    // Remove AppState listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Clear all callbacks and listeners
    this.listeners.clear();
    this.foregroundCallbacks = [];
    this.backgroundCallbacks = [];

    this.isInitialized = false;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): AppStateDebugInfo {
    return {
      currentState: this.currentState,
      isInitialized: this.isInitialized,
      listenersCount: this.listeners.size,
      foregroundCallbacksCount: this.foregroundCallbacks.length,
      backgroundCallbacksCount: this.backgroundCallbacks.length,
      backgroundTimestamp: this.backgroundTimestamp,
      lastStateChange: this.lastStateChange,
    };
  }
}

// Export singleton instance
export const appStateManager = new AppStateManager();
export default appStateManager;
