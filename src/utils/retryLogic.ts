interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitter: true,
  retryableErrors: [],
  onRetry: () => {},
};

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error,
  ) {
    super(message);
    this.name = "RetryError";
  }
}

function calculateDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: boolean): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

  if (jitter) {
    return exponentialDelay * (0.5 + Math.random() * 0.5);
  }

  return exponentialDelay;
}

function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  if (retryableErrors.length === 0) return true;

  return retryableErrors.some((pattern) => {
    if (error.message.includes(pattern)) return true;
    if (error.name === pattern) return true;
    return false;
  });
}

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

export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return <T>(fn: () => Promise<T>, overrideOptions: RetryOptions = {}) => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions });
  };
}

export class RetryManager {
  private retryCount = new Map<string, number>();
  private lastAttempt = new Map<string, number>();

  constructor(private options: RetryOptions = {}) {}

  async execute<T>(key: string, fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const attempts = this.retryCount.get(key) || 0;
    const lastTime = this.lastAttempt.get(key) || 0;
    const now = Date.now();

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
