/**
 * More reliable network connectivity checking
 * This provides an alternative to NetInfo when it's giving false positives
 */

import NetInfo from "@react-native-community/netinfo";

export interface NetworkCheckResult {
  isOnline: boolean;
  isConnected: boolean;
  isStable: boolean;
  latency: number;
  method: "netinfo" | "fetch" | "combined";
  networkType?: "wifi" | "cellular" | "ethernet" | "none" | "unknown";
  details: {
    netinfo?: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
      type: string;
      cellularGeneration?: string;
    };
    fetch?: {
      success: boolean;
      responseTime: number;
      error?: string;
    };
    supabase?: {
      reachable: boolean;
      responseTime: number;
    };
  };
  timestamp: number;
}

/**
 * Check network connectivity using fetch to a reliable endpoint
 */
async function checkNetworkWithFetch(
  timeout: number = 5000,
): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();

  try {
    // Use multiple reliable endpoints with fallback
    const endpoints = [
      { url: "https://www.google.com/generate_204", expected: 204 }, // Google's connectivity check
      { url: "https://cloudflare-dns.com/dns-query", expected: 200 }, // Cloudflare DNS
      { url: "https://api.ipify.org?format=json", expected: 200 }, // IP detection service
    ];

    // Try endpoints in sequence until one succeeds
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout / endpoints.length);

        const response = await fetch(endpoint.url, {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-cache",
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok || response.status === endpoint.expected) {
          return {
            success: true,
            responseTime,
          };
        }
      } catch (err) {
        // Try next endpoint
        continue;
      }
    }

    // All endpoints failed
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: "All endpoints unreachable",
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Supabase connectivity specifically
 */
async function checkSupabaseConnectivity(
  timeout: number = 3000,
): Promise<{ reachable: boolean; responseTime: number }> {
  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return { reachable: false, responseTime: 0 };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Try multiple Supabase endpoints
    const endpoints = [`${supabaseUrl}/realtime/v1/health`, `${supabaseUrl}/rest/v1/`];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          signal: controller.signal,
          cache: "no-cache",
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        // Treat 200, 401, 404 as reachable (network path is alive)
        // 401/404 are expected without auth or for specific endpoints
        if (response.status === 200 || response.status === 401 || response.status === 404) {
          return {
            reachable: true,
            responseTime,
          };
        }
      } catch (err) {
        // Try next endpoint
        continue;
      }
    }

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // All endpoints failed
    return {
      reachable: false,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      reachable: false,
      responseTime,
    };
  }
}

/**
 * Get network state using NetInfo with enhanced mobile detection
 */
async function checkNetworkWithNetInfo(): Promise<{
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  cellularGeneration?: string;
  networkType: "wifi" | "cellular" | "ethernet" | "none" | "unknown";
  computed: boolean;
}> {
  try {
    const state = await NetInfo.fetch();
    const isConnected = Boolean(state.isConnected);
    const hasInternetAccess = state.isInternetReachable === true || (state.isInternetReachable === null && isConnected);

    // Determine network type for mobile
    let networkType: "wifi" | "cellular" | "ethernet" | "none" | "unknown" = "unknown";
    if (state.type === "wifi") networkType = "wifi";
    else if (state.type === "cellular") networkType = "cellular";
    else if (state.type === "ethernet") networkType = "ethernet";
    else if (state.type === "none") networkType = "none";

    // Get cellular generation if applicable
    const cellularGeneration =
      state.type === "cellular" && state.details ? (state.details as any).cellularGeneration : undefined;

    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      cellularGeneration,
      networkType,
      computed: isConnected && hasInternetAccess,
    };
  } catch (error) {
    console.warn("NetInfo check failed:", error);
    return {
      isConnected: null,
      isInternetReachable: null,
      type: "unknown",
      networkType: "unknown",
      computed: false,
    };
  }
}

/**
 * Comprehensive network check with mobile-specific enhancements
 */
export async function reliableNetworkCheck(): Promise<NetworkCheckResult> {
  const timestamp = Date.now();

  try {
    // Run all checks in parallel
    const [netinfoResult, fetchResult, supabaseResult] = await Promise.allSettled([
      checkNetworkWithNetInfo(),
      checkNetworkWithFetch(),
      checkSupabaseConnectivity(),
    ]);

    const netinfo = netinfoResult.status === "fulfilled" ? netinfoResult.value : null;
    const fetch = fetchResult.status === "fulfilled" ? fetchResult.value : null;
    const supabase = supabaseResult.status === "fulfilled" ? supabaseResult.value : null;

    // Calculate average latency
    const latencies = [];
    if (fetch?.responseTime) latencies.push(fetch.responseTime);
    if (supabase?.responseTime) latencies.push(supabase.responseTime);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    // Determine connection stability (stable if latency < 1000ms)
    const isStable = avgLatency > 0 && avgLatency < 1000;

    // Determine if truly online
    let isOnline = false;
    let isConnected = false;
    let method: "netinfo" | "fetch" | "combined" = "combined";

    if (fetch?.success || supabase?.reachable) {
      // If any external check succeeds, we're online
      isOnline = true;
      isConnected = true;
      method = fetch?.success ? "fetch" : "combined";
    } else if (netinfo?.computed) {
      // NetInfo says online but external checks failed
      // Be cautious - likely a connectivity issue
      isConnected = true;
      isOnline = false; // Can't reach external services
      method = "netinfo";
    } else {
      // All methods suggest offline
      isOnline = false;
      isConnected = false;
      method = "combined";
    }

    return {
      isOnline,
      isConnected,
      isStable,
      latency: avgLatency,
      method,
      networkType: netinfo?.networkType,
      details: {
        netinfo: netinfo
          ? {
              isConnected: netinfo.isConnected,
              isInternetReachable: netinfo.isInternetReachable,
              type: netinfo.type,
              cellularGeneration: netinfo.cellularGeneration,
            }
          : undefined,
        fetch: fetch
          ? {
              success: fetch.success,
              responseTime: fetch.responseTime,
              error: fetch.error,
            }
          : undefined,
        supabase: supabase || undefined,
      },
      timestamp,
    };
  } catch (error) {
    console.warn("Reliable network check failed:", error);
    return {
      isOnline: false,
      isConnected: false,
      isStable: false,
      latency: 0,
      method: "combined",
      networkType: "unknown",
      details: {},
      timestamp,
    };
  }
}

/**
 * Wait for stable network connection
 */
export async function waitForStableConnection(maxAttempts: number = 10, delayMs: number = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await reliableNetworkCheck();

    if (result.isConnected && result.isStable) {
      console.log(`[Network] Stable connection established after ${i + 1} attempts`);
      return true;
    }

    if (i < maxAttempts - 1) {
      console.log(`[Network] Waiting for stable connection (attempt ${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.warn("[Network] Could not establish stable connection");
  return false;
}

/**
 * Create a realtime-specific network monitor
 */
export function createRealtimeNetworkMonitor(
  onStateChange: (state: {
    isOnline: boolean;
    isStable: boolean;
    networkType?: string;
    shouldReconnect: boolean;
  }) => void,
  options: {
    checkInterval?: number;
    stableThresholdMs?: number;
  } = {},
) {
  const { checkInterval = 30000, stableThresholdMs = 1000 } = options;

  let previousNetworkType: string | undefined;
  let lastStableCheck = Date.now();
  let intervalId: NodeJS.Timeout | null = null;

  // Monitor network type changes (important for mobile)
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    const currentType = state.type;

    // Detect network type change (WiFi to cellular, etc.)
    if (previousNetworkType && previousNetworkType !== currentType) {
      console.log(`[Network] Type changed: ${previousNetworkType} -> ${currentType}`);

      // Check if we need to reconnect
      const result = await reliableNetworkCheck();

      onStateChange({
        isOnline: result.isOnline,
        isStable: result.isStable,
        networkType: currentType,
        shouldReconnect: result.isOnline && result.isStable,
      });
    }

    previousNetworkType = currentType;
  });

  // Periodic stability checks
  intervalId = setInterval(async () => {
    const result = await reliableNetworkCheck();
    const now = Date.now();

    // Check if connection has been stable
    const isStableLongTerm = result.isStable && now - lastStableCheck > stableThresholdMs;

    if (result.isStable) {
      lastStableCheck = now;
    }

    onStateChange({
      isOnline: result.isOnline,
      isStable: isStableLongTerm,
      networkType: result.networkType,
      shouldReconnect: false, // Don't trigger reconnect on periodic checks
    });
  }, checkInterval);

  // Cleanup function
  return () => {
    unsubscribe();
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Quick network check using just NetInfo (for frequent checks)
 */
export async function quickNetworkCheck(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const isConnected = Boolean(state.isConnected);
    const hasInternetAccess = state.isInternetReachable === true || (state.isInternetReachable === null && isConnected);
    return isConnected && hasInternetAccess;
  } catch (error) {
    console.warn("Quick network check failed:", error);
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
  } = {},
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
      const hasInternetAccess =
        state.isInternetReachable === true || (state.isInternetReachable === null && isConnected);
      const isOnline = isConnected && hasInternetAccess;

      // Determine network type for quick check
      let networkType: "wifi" | "cellular" | "ethernet" | "none" | "unknown" = "unknown";
      if (state.type === "wifi") networkType = "wifi";
      else if (state.type === "cellular") networkType = "cellular";
      else if (state.type === "ethernet") networkType = "ethernet";
      else if (state.type === "none") networkType = "none";

      const result: NetworkCheckResult = {
        isOnline,
        isConnected,
        isStable: false, // Quick check doesn't determine stability
        latency: 0, // Quick check doesn't measure latency
        method: "netinfo",
        networkType: networkType,
        details: {
          netinfo: {
            isConnected: state.isConnected,
            isInternetReachable: state.isInternetReachable,
            type: state.type,
          },
        },
        timestamp: Date.now(),
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
