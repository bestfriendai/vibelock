/**
 * Configuration options for retry operations
 */
interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds between retries (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelay?: number;
  /** Whether to add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Array of error patterns that should trigger retries (empty = all errors) */
  retryableErrors?: string[];
  /** Callback function called before each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitter: true,
  retryableErrors: [],
  onRetry: () => {},
};

/**
 * Custom error class for retry operation failures
 */
export class RetryError extends Error {
  /**
   * Creates a new RetryError instance
   * @param message - Error message describing the failure
   * @param attempts - Number of attempts made before failure
   * @param lastError - The last error that occurred
   */
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error,
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Calculates the delay duration for a retry attempt using exponential backoff
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @param jitter - Whether to apply random jitter
 * @returns Calculated delay in milliseconds
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: boolean): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

  if (jitter) {
    return exponentialDelay * (0.5 + Math.random() * 0.5);
  }

  return exponentialDelay;
}

/**
 * Determines if an error should trigger a retry based on configured patterns
 * @param error - The error to check
 * @param retryableErrors - Array of error patterns to match against
 * @returns True if the error should trigger a retry
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  if (retryableErrors.length === 0) return true;

  return retryableErrors.some((pattern) => {
    if (error.message.includes(pattern)) return true;
    if (error.name === pattern) return true;
    return false;
  });
}

/**
 * Executes an async function with automatic retry logic
 * @param fn - Async function to execute with retry logic
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects with RetryError
 * @throws {RetryError} When all retry attempts fail
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts || !isRetryableError(lastError, opts.retryableErrors)) {
        throw new RetryError(`Failed after ${attempt} attempt(s): ${lastError.message}`, attempt, lastError);
      }

      opts.onRetry(attempt, lastError);

      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay, opts.jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new RetryError(`Failed after ${opts.maxAttempts} attempts: ${lastError.message}`, opts.maxAttempts, lastError);
}

/**
 * Creates a retry wrapper function with pre-configured default options
 * @param defaultOptions - Default retry options to apply to all wrapped functions
 * @returns Function that wraps async functions with retry logic
 */
export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return <T>(fn: () => Promise<T>, overrideOptions: RetryOptions = {}) => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Manages retry operations with state tracking and rate limiting
 */
export class RetryManager {
  private retryCount = new Map<string, number>();
  private lastAttempt = new Map<string, number>();

  /**
   * Creates a new RetryManager instance
   * @param options - Default retry options for this manager
   */
  constructor(private options: RetryOptions = {}) {}

  /**
   * Executes an async function with retry logic and rate limiting
   * @param key - Unique identifier for tracking retry attempts
   * @param fn - Async function to execute
   * @param options - Override retry options for this execution
   * @returns Promise that resolves with the function result
   * @throws {RetryError} When all retry attempts fail
   */
  async execute<T>(key: string, fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const attempts = this.retryCount.get(key) || 0;
    const lastTime = this.lastAttempt.get(key) || 0;
    const now = Date.now();

    // Reset counter if more than 60 seconds have passed since last attempt
    if (now - lastTime < 60000) {
      this.retryCount.set(key, attempts + 1);
    } else {
      this.retryCount.set(key, 1);
    }

    this.lastAttempt.set(key, now);

    try {
      const result = await withRetry(fn, { ...this.options, ...options });
      this.retryCount.delete(key);
      this.lastAttempt.delete(key);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resets retry tracking for a specific key or all keys
   * @param key - Optional specific key to reset, or reset all if undefined
   */
  reset(key?: string) {
    if (key) {
      this.retryCount.delete(key);
      this.lastAttempt.delete(key);
    } else {
      this.retryCount.clear();
      this.lastAttempt.clear();
    }
  }
}
