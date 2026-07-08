import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, fetchJsonWithRetry } from '@/lib/fetch-wrapper';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success response on first attempt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ data: 'ok' })),
    } as Response);

    const result = await fetchWithRetry('https://example.com/api');
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ data: 'ok' });
  });

  it('retries on network failure', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ data: 'ok' })),
      } as Response);

    const result = await fetchWithRetry('https://example.com/api', { maxRetries: 2, retryDelay: 10 });
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('returns error after all retries exhausted', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));

    const result = await fetchWithRetry('https://example.com/api', { maxRetries: 2, retryDelay: 10 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Failed to fetch');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('marks timeout errors', async () => {
    vi.mocked(fetch).mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));

    const result = await fetchWithRetry('https://example.com/api', { maxRetries: 1, retryDelay: 10, timeoutMs: 1 });
    expect(result.isTimeoutError).toBe(true);
  });

  it('marks network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));

    const result = await fetchWithRetry('https://example.com/api', { maxRetries: 0 });
    expect(result.isNetworkError).toBe(true);
  });

  it('handles non-JSON response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('plain text response'),
    } as Response);

    const result = await fetchWithRetry('https://example.com/api');
    expect(result.ok).toBe(true);
    expect(result.data).toBe('plain text response');
  });

  it('extracts error message from JSON error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: 'Bad request' })),
    } as Response);

    const result = await fetchWithRetry('https://example.com/api');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Bad request');
  });

  it('uses HTTP status for error when no message body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    } as Response);

    const result = await fetchWithRetry('https://example.com/api');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('HTTP 500');
  });
});

describe('fetchJsonWithRetry', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ result: 'value' })),
    } as Response);

    const data = await fetchJsonWithRetry('https://example.com/api');
    expect(data).toEqual({ result: 'value' });
  });

  it('throws on error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ error: 'Server error' })),
    } as Response);

    await expect(fetchJsonWithRetry('https://example.com/api')).rejects.toThrow('Server error');
  });
});
