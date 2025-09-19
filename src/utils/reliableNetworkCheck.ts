/**
 * More reliable network connectivity checking
 * This provides an alternative to NetInfo when it's giving false positives
 */

import NetInfo from "@react-native-community/netinfo";

export interface NetworkCheckResult {
  isOnline: boolean;
  method: 'netinfo' | 'fetch' | 'combined';
  details: {
    netinfo?: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
      type: string;
    };
    fetch?: {
      success: boolean;
      responseTime: number;
      error?: string;
    };
  };
  timestamp: number;
}

/**
 * Check network connectivity using fetch to a reliable endpoint
 */
async function checkNetworkWithFetch(timeout: number = 5000): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Use multiple reliable endpoints
    const endpoints = [
      'https://www.google.com/generate_204', // Google's connectivity check
      'https://httpbin.org/status/200',      // HTTPBin status endpoint
      'https://jsonplaceholder.typicode.com/posts/1' // JSONPlaceholder
    ];
    
    // Try the first endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(endpoints[0], {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok || response.status === 204,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get network state using NetInfo
 */
async function checkNetworkWithNetInfo(): Promise<{
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  computed: boolean;
}> {
  try {
    const state = await NetInfo.fetch();
    const isConnected = Boolean(state.isConnected);
    const hasInternetAccess = state.isInternetReachable === true || 
                            (state.isInternetReachable === null && isConnected);
    
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      computed: isConnected && hasInternetAccess
    };
  } catch (error) {
    console.warn('NetInfo check failed:', error);
    return {
      isConnected: null,
      isInternetReachable: null,
      type: 'unknown',
      computed: false
    };
  }
}

/**
 * Comprehensive network check using both methods
 */
export async function reliableNetworkCheck(): Promise<NetworkCheckResult> {
  const timestamp = Date.now();
  
  try {
    // Run both checks in parallel
    const [netinfoResult, fetchResult] = await Promise.allSettled([
      checkNetworkWithNetInfo(),
      checkNetworkWithFetch()
    ]);
    
    const netinfo = netinfoResult.status === 'fulfilled' ? netinfoResult.value : null;
    const fetch = fetchResult.status === 'fulfilled' ? fetchResult.value : null;
    
    // Determine final result
    let isOnline = false;
    let method: 'netinfo' | 'fetch' | 'combined' = 'combined';
    
    if (fetch?.success) {
      // If fetch succeeds, we're definitely online
      isOnline = true;
      method = 'fetch';
    } else if (netinfo?.computed) {
      // If NetInfo says we're online but fetch failed, be cautious
      // Only trust NetInfo if fetch didn't explicitly fail due to network
      if (!fetch || fetch.error?.includes('network') || fetch.error?.includes('timeout')) {
        isOnline = false;
        method = 'fetch';
      } else {
        isOnline = true;
        method = 'netinfo';
      }
    } else {
      // Both methods suggest offline
      isOnline = false;
      method = 'combined';
    }
    
    return {
      isOnline,
      method,
      details: {
        netinfo: netinfo ? {
          isConnected: netinfo.isConnected,
          isInternetReachable: netinfo.isInternetReachable,
          type: netinfo.type
        } : undefined,
        fetch: fetch ? {
          success: fetch.success,
          responseTime: fetch.responseTime,
          error: fetch.error
        } : undefined
      },
      timestamp
    };
  } catch (error) {
    console.warn('Reliable network check failed:', error);
    return {
      isOnline: false,
      method: 'combined',
      details: {},
      timestamp
    };
  }
}

/**
 * Quick network check using just NetInfo (for frequent checks)
 */
export async function quickNetworkCheck(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const isConnected = Boolean(state.isConnected);
    const hasInternetAccess = state.isInternetReachable === true || 
                            (state.isInternetReachable === null && isConnected);
    return isConnected && hasInternetAccess;
  } catch (error) {
    console.warn('Quick network check failed:', error);
    return false;
  }
}

/**
 * Create a network monitor that uses reliable checking
 */
export function createReliableNetworkMonitor(
  onStateChange: (isOnline: boolean, details: NetworkCheckResult) => void,
  options: {
    useReliableCheck?: boolean;
    checkInterval?: number;
    debounceMs?: number;
  } = {}
) {
  const { useReliableCheck = false, checkInterval = 30000, debounceMs = 1000 } = options;
  
  let isActive = true;
  let debounceTimeout: NodeJS.Timeout | null = null;
  let intervalId: NodeJS.Timeout | null = null;
  
  const notifyStateChange = (isOnline: boolean, details: NetworkCheckResult) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    debounceTimeout = setTimeout(() => {
      if (isActive) {
        onStateChange(isOnline, details);
      }
      debounceTimeout = null;
    }, debounceMs);
  };
  
  // Listen to NetInfo for immediate updates
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (!isActive) return;
    
    if (useReliableCheck) {
      // Use comprehensive check
      const result = await reliableNetworkCheck();
      notifyStateChange(result.isOnline, result);
    } else {
      // Use quick check
      const isConnected = Boolean(state.isConnected);
      const hasInternetAccess = state.isInternetReachable === true || 
                              (state.isInternetReachable === null && isConnected);
      const isOnline = isConnected && hasInternetAccess;
      
      const result: NetworkCheckResult = {
        isOnline,
        method: 'netinfo',
        details: {
          netinfo: {
            isConnected: state.isConnected,
            isInternetReachable: state.isInternetReachable,
            type: state.type
          }
        },
        timestamp: Date.now()
      };
      
      notifyStateChange(isOnline, result);
    }
  });
  
  // Periodic reliable checks if enabled
  if (useReliableCheck && checkInterval > 0) {
    intervalId = setInterval(async () => {
      if (!isActive) return;
      
      const result = await reliableNetworkCheck();
      notifyStateChange(result.isOnline, result);
    }, checkInterval);
  }
  
  // Cleanup function
  return () => {
    isActive = false;
    unsubscribe();
    
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}
