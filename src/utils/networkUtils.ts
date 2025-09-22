// Fallback to standard fetch without pinning

export async function secureFetch(url: string, options: RequestInit = {}) {
  // Certificate pinning not available in standard fetch - using regular fetch
  return fetch(url, options);
}

export function createSupabaseFetch(retries = 3) {
  return async (url: string, options: RequestInit = {}) => {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);

        // Check if response is ok
        if (response.ok) {
          return response;
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : (i + 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For other errors, throw immediately
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx except 429)
        if (error instanceof Error && error.message.includes("HTTP 4")) {
          throw error;
        }

        // Exponential backoff for network errors
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error("Failed to fetch after retries");
  };
}
