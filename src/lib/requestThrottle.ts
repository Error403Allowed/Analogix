/**
 * Request Throttling Utility
 * Prevents AI API overload by limiting concurrent requests and adding delays between requests.
 */

export interface ThrottleOptions {
  /** Maximum number of concurrent requests allowed (default: 2) */
  maxConcurrent?: number;
  /** Minimum delay between requests in ms (default: 500ms) */
  minDelay?: number;
  /** Maximum retry attempts for rate-limited requests (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000ms) */
  baseDelay?: number;
  /** Maximum delay cap for exponential backoff in ms (default: 10000ms) */
  maxDelay?: number;
}

interface QueuedRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class RequestThrottle {
  private maxConcurrent: number;
  private minDelay: number;
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  
  private activeRequests = 0;
  private requestQueue: QueuedRequest[] = [];
  private lastRequestTime = 0;
  private debug = process.env.NODE_ENV === "development";

  constructor(options: ThrottleOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 2;
    this.minDelay = options.minDelay ?? 500;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelay = options.baseDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 10000;
  }

  /**
   * Execute a request with throttling and automatic retry on rate limit errors.
   */
  async execute<T>(requestFn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        // Wait for throttle permission
        await this.acquireLock(signal);
        
        // Execute the request
        const result = await requestFn();
        
        // Release lock after successful request
        this.releaseLock();
        
        return result;
      } catch (error) {
        const isRateLimitError = this.isRateLimitError(error);
        const isAbortError = error instanceof Error && error.name === "AbortError";
        
        if (isAbortError) {
          throw error; // Don't retry abort errors
        }

        if (!isRateLimitError) {
          // Non-rate-limit errors should be thrown immediately
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt > this.maxRetries) {
          this.releaseLock();
          break; // Max retries exceeded
        }

        // Exponential backoff for rate limit errors
        const backoffDelay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );
        
        if (this.debug) {
          console.log(
            `[RequestThrottle] Rate limit hit, retrying in ${backoffDelay}ms (attempt ${attempt}/${this.maxRetries})`
          );
        }

        // Wait before retrying with exponential backoff + jitter
        await this.waitWithBackoff(backoffDelay, signal);
      }
    }

    // All retries exhausted
    throw lastError || new Error("Request failed after max retries");
  }

  /**
   * Acquire a lock to execute a request, waiting in queue if necessary.
   */
  private acquireLock(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkAbort = () => {
        if (signal?.aborted) {
          reject(new Error("Request aborted"));
          return true;
        }
        return false;
      };

      if (checkAbort()) return;

      // If under concurrent limit and enough time has passed, execute immediately
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (this.activeRequests < this.maxConcurrent && timeSinceLastRequest >= this.minDelay) {
        this.activeRequests++;
        this.lastRequestTime = now;
        resolve();
        return;
      }

      // Add to queue
      const queuedRequest: QueuedRequest = {
        resolve: () => {
          this.activeRequests++;
          this.lastRequestTime = Date.now();
          resolve();
        },
        reject,
        timestamp: now,
      };

      this.requestQueue.push(queuedRequest);

      // Listen for abort signal
      signal?.addEventListener("abort", () => {
        const index = this.requestQueue.indexOf(queuedRequest);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error("Request aborted"));
        }
      });
    });
  }

  /**
   * Release a lock and process the next queued request.
   */
  private releaseLock(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    // Process next queued request after minDelay
    if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        setTimeout(() => {
          nextRequest.resolve();
        }, this.minDelay);
      }
    }
  }

  /**
   * Check if an error is a rate limit error.
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("too many requests") ||
        message.includes("throttl") ||
        message.includes("overloaded") ||
        message.includes("503") ||
        message.includes("service unavailable")
      );
    }
    return false;
  }

  /**
   * Wait with exponential backoff, checking for abort signal.
   */
  private waitWithBackoff(delay: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, delay);

      const handleAbort = () => {
        clearTimeout(timeout);
        reject(new Error("Request aborted"));
      };

      signal?.addEventListener("abort", handleAbort, { once: true });

      // Cleanup
      return () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", handleAbort);
      };
    });
  }

  /**
   * Get current throttle status (useful for debugging/UI feedback).
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      isThrottled: this.activeRequests >= this.maxConcurrent || this.requestQueue.length > 0,
    };
  }

  /**
   * Clear all queued requests (useful on unmount/navigation).
   */
  clearQueue(): void {
    this.requestQueue.forEach((request) => {
      request.reject(new Error("Request cancelled"));
    });
    this.requestQueue = [];
  }
}

// Global throttle instance for AI requests
export const aiThrottle = new RequestThrottle({
  maxConcurrent: 2,      // Allow 2 concurrent requests
  minDelay: 500,         // 500ms minimum delay between requests
  maxRetries: 3,         // Retry up to 3 times on rate limit
  baseDelay: 1000,       // Start with 1s backoff
  maxDelay: 10000,       // Cap at 10s backoff
});

// Throttle instance for heavy/long-running AI operations (study guides, document analysis)
export const heavyAiThrottle = new RequestThrottle({
  maxConcurrent: 1,      // Only 1 at a time
  minDelay: 1000,        // 1s minimum delay
  maxRetries: 2,         // Fewer retries for heavy operations
  baseDelay: 2000,       // Start with 2s backoff
  maxDelay: 15000,       // Cap at 15s backoff
});
