import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class RequestThrottle {
    maxConcurrent: number;
    minDelay: number;
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    activeRequests = 0;
    requestQueue: Array<{ resolve: () => void; reject: (reason: any) => void; timestamp: number }> = [];
    lastRequestTime = 0;
    debug = false;

    constructor(options: any = {}) {
        this.maxConcurrent = options.maxConcurrent ?? 2;
        this.minDelay = options.minDelay ?? 500;
        this.maxRetries = options.maxRetries ?? 3;
        this.baseDelay = options.baseDelay ?? 1000;
        this.maxDelay = options.maxDelay ?? 10000;
    }

    async execute(requestFn: () => Promise<any>, signal?: AbortSignal) {
        let lastError: Error | null = null;
        let attempt = 0;
        while (attempt <= this.maxRetries) {
            try {
                await this.acquireLock(signal);
                const result = await requestFn();
                this.releaseLock();
                return result;
            } catch (error: any) {
                const isRateLimitError = this.isRateLimitError(error);
                const isAbortError = error?.name === "AbortError";
                if (isAbortError) throw error;
                if (!isRateLimitError) throw error;
                lastError = error instanceof Error ? error : new Error(String(error));
                attempt++;
                if (attempt > this.maxRetries) {
                    this.releaseLock();
                    break;
                }
                const backoffDelay = Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
                await this.waitWithBackoff(backoffDelay, signal);
            }
        }
        throw lastError || new Error("Request failed after max retries");
    }

    acquireLock(signal?: AbortSignal) {
        return new Promise<void>((resolve, reject) => {
            const checkAbort = () => {
                if (signal?.aborted) {
                    reject(new Error("Request aborted"));
                    return true;
                }
                return false;
            };
            if (checkAbort()) return;
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (this.activeRequests < this.maxConcurrent && timeSinceLastRequest >= this.minDelay) {
                this.activeRequests++;
                this.lastRequestTime = now;
                resolve();
                return;
            }
            const queuedRequest = {
                resolve: () => {
                    this.activeRequests++;
                    this.lastRequestTime = Date.now();
                    resolve();
                },
                reject,
                timestamp: now,
            };
            this.requestQueue.push(queuedRequest);
            signal?.addEventListener("abort", () => {
                const index = this.requestQueue.indexOf(queuedRequest);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error("Request aborted"));
                }
            });
        });
    }

    releaseLock() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
            const nextRequest = this.requestQueue.shift();
            if (nextRequest) {
                setTimeout(() => nextRequest.resolve(), this.minDelay);
            }
        }
    }

    isRateLimitError(error: any) {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes("rate limit") || message.includes("429") ||
                message.includes("too many requests") || message.includes("throttl") ||
                message.includes("overloaded") || message.includes("503") ||
                message.includes("service unavailable");
        }
        return false;
    }

    waitWithBackoff(delay: number, signal?: AbortSignal) {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                signal?.removeEventListener("abort", handleAbort);
                resolve();
            }, delay);
            const handleAbort = () => {
                clearTimeout(timeout);
                reject(new Error("Request aborted"));
            };
            signal?.addEventListener("abort", handleAbort, { once: true });
        });
    }

    getStatus() {
        return {
            activeRequests: this.activeRequests,
            queuedRequests: this.requestQueue.length,
            isThrottled: this.activeRequests >= this.maxConcurrent || this.requestQueue.length > 0,
        };
    }

    clearQueue() {
        this.requestQueue.forEach((request) => {
            request.reject(new Error("Request cancelled"));
        });
        this.requestQueue = [];
    }
}

describe('RequestThrottle', () => {
    let throttle: RequestThrottle;

    beforeEach(() => {
        throttle = new RequestThrottle({ maxConcurrent: 2, minDelay: 10, baseDelay: 10 });
    });

    describe('acquireLock / releaseLock', () => {
        let fastThrottle: RequestThrottle;

        beforeEach(() => {
            fastThrottle = new RequestThrottle({ maxConcurrent: 2, minDelay: 0, baseDelay: 10 });
        });

        it('acquires lock immediately when under limit', async () => {
            await fastThrottle.acquireLock();
            expect(fastThrottle.activeRequests).toBe(1);
        });

        it('releases lock correctly', async () => {
            await fastThrottle.acquireLock();
            fastThrottle.releaseLock();
            expect(fastThrottle.activeRequests).toBe(0);
        });

        it('queues requests when at capacity', async () => {
            await fastThrottle.acquireLock();
            await fastThrottle.acquireLock();
            const acquirePromise = fastThrottle.acquireLock();
            expect(fastThrottle.requestQueue.length).toBe(1);
            fastThrottle.releaseLock();
            await expect(acquirePromise).resolves.toBeUndefined();
            expect(fastThrottle.activeRequests).toBe(2);
        });

        it('rejects on abort signal while queued', async () => {
            await fastThrottle.acquireLock();
            await fastThrottle.acquireLock();
            const ac = new AbortController();
            const acquirePromise = fastThrottle.acquireLock(ac.signal);
            ac.abort();
            await expect(acquirePromise).rejects.toThrow('Request aborted');
        });
    });

    describe('execute', () => {
        async function delay(ms: number) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        it('executes a successful request', async () => {
            const result = await throttle.execute(async () => 'done');
            expect(result).toBe('done');
        });

        it('retries on rate limit error', async () => {
            let calls = 0;
            const result = await throttle.execute(async () => {
                calls++;
                if (calls === 1) throw new Error('Rate limit exceeded');
                return 'success';
            });
            expect(result).toBe('success');
            expect(calls).toBe(2);
        });

        it('throws non-rate-limit errors immediately', async () => {
            await expect(throttle.execute(async () => {
                throw new Error('Some other error');
            })).rejects.toThrow('Some other error');
        });

        it('throws abort errors immediately', async () => {
            await expect(throttle.execute(async () => {
                const err = new Error('Aborted');
                err.name = 'AbortError';
                throw err;
            })).rejects.toThrow('Aborted');
        });
    });

    describe('waitWithBackoff', () => {
        it('resolves after delay', async () => {
            const start = Date.now();
            await throttle.waitWithBackoff(50);
            expect(Date.now() - start).toBeGreaterThanOrEqual(45);
        });

        it('rejects on abort', async () => {
            const ac = new AbortController();
            const promise = throttle.waitWithBackoff(1000, ac.signal);
            ac.abort();
            await expect(promise).rejects.toThrow('Request aborted');
        });

        it('cleans up abort listener on resolve', async () => {
            const ac = new AbortController();
            const spy = vi.spyOn(ac.signal, 'removeEventListener');
            await throttle.waitWithBackoff(10, ac.signal);
            // The listener should have been removed
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('clearQueue', () => {
        it('rejects all queued requests', async () => {
            const t = new RequestThrottle({ maxConcurrent: 1, minDelay: 0 });
            await t.acquireLock();
            const p1 = t.acquireLock();
            const p2 = t.acquireLock();
            t.clearQueue();
            await expect(p1).rejects.toThrow('Request cancelled');
            await expect(p2).rejects.toThrow('Request cancelled');
            expect(t.requestQueue.length).toBe(0);
        });
    });

    describe('getStatus', () => {
        it('reports not throttled when idle', () => {
            expect(throttle.getStatus().isThrottled).toBe(false);
        });

        it('reports throttled when at capacity', async () => {
            const t = new RequestThrottle({ maxConcurrent: 1, minDelay: 0 });
            await t.acquireLock();
            expect(t.getStatus().isThrottled).toBe(true);
        });
    });
});
