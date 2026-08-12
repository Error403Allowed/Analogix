import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init: ResponseInit & { headers?: Record<string, string> }) => ({
      status: init?.status || 200,
      body,
      headers: init?.headers || {},
    })),
  },
}));

import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

describe('rateLimitKey', () => {
  it('extracts IP from x-forwarded-for', () => {
    const req = { headers: new Map([['x-forwarded-for', '1.2.3.4, 5.6.7.8']]) } as unknown as Request;
    expect(rateLimitKey(req, 'api')).toBe('1.2.3.4:api');
  });

  it('falls back to "unknown" when no header', () => {
    const req = { headers: new Map() } as unknown as Request;
    expect(rateLimitKey(req, 'test')).toBe('unknown:test');
  });

  it('defaults suffix to "global"', () => {
    const req = { headers: new Map([['x-forwarded-for', '1.2.3.4']]) } as unknown as Request;
    expect(rateLimitKey(req)).toBe('1.2.3.4:global');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows first request for a new key', () => {
    const result = checkRateLimit('test-key', 3, 10000);
    expect(result).toBeNull();
  });

  it('allows requests up to maxRequests', () => {
    const key = 'burst-test';
    expect(checkRateLimit(key, 3, 10000)).toBeNull();
    expect(checkRateLimit(key, 3, 10000)).toBeNull();
    expect(checkRateLimit(key, 3, 10000)).toBeNull();
  });

  it('rejects request when limit exceeded', () => {
    const key = 'exceed-test';
    checkRateLimit(key, 2, 10000);
    checkRateLimit(key, 2, 10000);
    const result = checkRateLimit(key, 2, 10000);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it('resets after window expires', () => {
    const key = 'reset-test';
    const shortWindow = 10;
    checkRateLimit(key, 1, shortWindow);
    const blocked = checkRateLimit(key, 1, shortWindow);
    expect(blocked).not.toBeNull();

    // Manually expire by setting Date.now() forward
    const realNow = Date.now;
    const future = realNow() + shortWindow + 1;
    vi.setSystemTime(future);
    Date.now = vi.fn(() => future);

    const allowed = checkRateLimit(key, 1, shortWindow);
    expect(allowed).toBeNull();

    Date.now = realNow;
    vi.useRealTimers();
  });

  it('uses default maxRequests of 30', () => {
    const key = 'default-limit';
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit(key)).toBeNull();
    }
  });
});
