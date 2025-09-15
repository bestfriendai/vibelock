type BatchCallback<T> = (items: T[]) => void | Promise<void>;

interface BatchingOptions {
  maxBatchSize?: number;
  maxWaitTime?: number;
  debounce?: boolean;
}

const DEFAULT_OPTIONS: Required<BatchingOptions> = {
  maxBatchSize: 50,
  maxWaitTime: 100,
  debounce: false,
};

export class Batcher<T> {
  private batch: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private options: Required<BatchingOptions>;
  private processing = false;

  constructor(
    private callback: BatchCallback<T>,
    options: BatchingOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  add(item: T) {
    if (this.options.debounce && this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.batch.push(item);

    if (this.batch.length >= this.options.maxBatchSize) {
      this.flush();
    } else if (!this.timeout || this.options.debounce) {
      this.timeout = setTimeout(() => this.flush(), this.options.maxWaitTime);
    }
  }

  async flush() {
    if (this.processing || this.batch.length === 0) return;

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.processing = true;
    const items = [...this.batch];
    this.batch = [];

    try {
      await this.callback(items);
    } catch (error) {
      console.error('Batch processing error:', error);
      this.batch.unshift(...items);
    } finally {
      this.processing = false;
    }
  }

  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.batch = [];
  }

  getSize(): number {
    return this.batch.length;
  }
}

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): T {
  const { leading = true, trailing = true } = options;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;

  const invokeFunc = (time: number) => {
    const args = lastArgs;
    lastArgs = null;
    lastInvokeTime = time;
    if (args) {
      return fn(...args);
    }
  };

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      timeSinceLastInvoke >= wait
    );
  };

  const trailingEdge = (time: number) => {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
  };

  const throttled = (...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (!timeout) {
        lastInvokeTime = time;
        if (leading) {
          return fn(...args);
        }
      }

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => trailingEdge(Date.now()), wait);
    }
  };

  (throttled as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
    lastCallTime = 0;
    lastInvokeTime = 0;
  };

  return throttled as T;
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      fn(...args);
    }, wait);
  };

  (debounced as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced as T & { cancel: () => void };
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,
    private refillInterval: number = 1000
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.refillInterval) * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  canProceed(cost: number = 1): boolean {
    this.refill();
    return this.tokens >= cost;
  }

  consume(cost: number = 1): boolean {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }

    return false;
  }

  async waitAndConsume(cost: number = 1): Promise<void> {
    while (!this.consume(cost)) {
      await new Promise(resolve => setTimeout(resolve, this.refillInterval / 10));
    }
  }

  reset() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}