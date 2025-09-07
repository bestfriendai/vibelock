import { useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";

// Custom error class for offline conditions
export class OfflineError extends Error {
  constructor(message: string = "No internet connection") {
    super(message);
    this.name = "OfflineError";
  }
}

interface UseOfflineOptions {
  onConnectionChange?: (isConnected: boolean) => void;
  retryDelay?: number;
  maxRetries?: number;
}

interface UseOfflineReturn {
  isConnected: boolean;
  isOnline: boolean;
  retry: <T>(fn: () => Promise<T>) => Promise<T>;
  retryWithBackoff: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function useOffline(options: UseOfflineOptions = {}): UseOfflineReturn {
  const {
    onConnectionChange,
    retryDelay = 1000,
    maxRetries = 3,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // Compute connected and online separately
      const connected = Boolean(state.isConnected);
      const online = connected && (state.isInternetReachable !== false);
      
      setIsConnected(connected);
      setIsOnline(online);

      if (onConnectionChange) {
        onConnectionChange(online);
      }
    });

    // Check initial state
    NetInfo.fetch().then(state => {
      const connected = Boolean(state.isConnected);
      const online = connected && (state.isInternetReachable !== false);
      
      setIsConnected(connected);
      setIsOnline(online);
      
      if (onConnectionChange) {
        onConnectionChange(online);
      }
    });

    return unsubscribe;
  }, [onConnectionChange]);

  const retry = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    if (!isOnline) {
      throw new OfflineError();
    }
    
    return fn();
  }, [isOnline]);

  const retryWithBackoff = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    // Normalize maxRetries to ensure it's at least 1
    const normalizedMaxRetries = Math.max(1, maxRetries);
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < normalizedMaxRetries; attempt++) {
      try {
        // Check connection before each attempt
        const netState = await NetInfo.fetch();
        const online = Boolean(netState.isConnected) && (netState.isInternetReachable !== false);
        if (!online) {
          throw new OfflineError();
        }
        
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's an offline error
        if (error instanceof OfflineError) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === normalizedMaxRetries - 1) {
          break;
        }
        
        // Exponential backoff with jitter
        const baseDelay = retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
        const delay = baseDelay + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Ensure we have an error to throw
    if (!lastError) {
      lastError = new Error('Operation failed after retries');
    }
    throw lastError;
  }, [maxRetries, retryDelay]);

  return {
    isConnected,
    isOnline,
    retry,
    retryWithBackoff,
  };
}

// Helper function to wrap async operations with offline handling
export function withOfflineHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    fallback?: (...args: T) => R | Promise<R>;
    showError?: boolean;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || !netState.isInternetReachable) {
        if (options.fallback) {
          return await options.fallback(...args);
        }
        throw new OfflineError();
      }
      
      return await fn(...args);
    } catch (error) {
      if (options.fallback) {
        return await options.fallback(...args);
      }
      throw error;
    }
  };
}
