import { useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";

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

  const [isConnected, setIsConnected] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setIsConnected(connected);
      setIsOnline(connected);

      if (onConnectionChange) {
        onConnectionChange(connected);
      }
    });

    // Check initial state
    NetInfo.fetch().then(state => {
      const connected = !!(state.isConnected && state.isInternetReachable);
      setIsConnected(connected);
      setIsOnline(connected);
    });

    return unsubscribe;
  }, [onConnectionChange]);

  const retry = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    if (!isConnected) {
      throw new Error("No internet connection");
    }
    
    return fn();
  }, [isConnected]);

  const retryWithBackoff = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check connection before each attempt
        const netState = await NetInfo.fetch();
        if (!netState.isConnected || !netState.isInternetReachable) {
          throw new Error("No internet connection");
        }
        
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's a connection error
        if (error instanceof Error && error.message.includes("internet connection")) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries - 1) {
          break;
        }
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
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
        throw new Error("No internet connection");
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
