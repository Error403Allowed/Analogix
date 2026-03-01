/**
 * Fetch wrapper with retry logic, timeout handling, and detailed error reporting.
 * Replaces the basic fetch approach in groq.ts
 */

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface FetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  isNetworkError: boolean;
  isTimeoutError: boolean;
}

/**
 * Enhanced fetch with:
 * - Automatic retry on network failures
 * - Request timeout protection
 * - Detailed error messages
 * - Network error detection
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<FetchResult<T>> {
  const {
    method = 'POST',
    headers = {},
    body,
    timeoutMs = 30000,
    maxRetries = 2,
    retryDelay = 1000,
  } = options;

  let lastError: Error | null = null;
  let isNetworkError = false;
  let isTimeoutError = false;
  const debug = process.env.NODE_ENV === "development";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Parse response
      let data: unknown = null;
      const text = await response.text();
      
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is not JSON, store raw text
          data = text;
        }
      }

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;

        if (data && typeof data === 'object') {
          const obj = data as Record<string, unknown>;
          if (obj.error) {
            errorMessage = String(obj.error);
          } else if (obj.message) {
            errorMessage = String(obj.message);
          }
        }

        return {
          ok: false,
          status: response.status,
          error: errorMessage,
          isNetworkError: false,
          isTimeoutError: false,
        };
      }

      // Success
      return {
        ok: true,
        data: data as T,
        status: response.status,
        isNetworkError: false,
        isTimeoutError: false,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Detect error types
      if (lastError.name === 'AbortError') {
        isTimeoutError = true;
      } else if (
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('ECONNREFUSED') ||
        lastError.message.includes('ENOTFOUND')
      ) {
        isNetworkError = true;
      }

      if (debug) {
        console.error(
          `[fetchWithRetry] attempt ${attempt + 1} failed for ${method} ${url}:`,
          lastError.message,
          { isNetworkError, isTimeoutError }
        );
      }
      // Don't retry on timeout or network errors on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // All retries exhausted
  const finalError = lastError?.message || 'Failed to fetch';
  if (debug) {
    console.error(`[fetchWithRetry] all retries failed for ${method} ${url}:`, finalError);
  }
  return {
    ok: false,
    error: finalError,
    isNetworkError,
    isTimeoutError,
  };
}

/**
 * Wrapper for fetchWithRetry that throws on error (for backward compatibility).
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const result = await fetchWithRetry<T>(url, options);

  if (!result.ok) {
    const errorDetails = [
      result.error,
      result.isNetworkError && '(Network Error)',
      result.isTimeoutError && '(Timeout)',
    ]
      .filter(Boolean)
      .join(' ');

    throw new Error(errorDetails);
  }

  return result.data as T;
}
