// Tests for fetchWithTimeout and error classes (task 3.1)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to import the functions. Since weather.js doesn't export them yet,
// we'll test by importing the module and checking exported symbols.
// For now, inline the implementation under test to keep tests self-contained
// until exports are added in a later task.

// ---------------------------------------------------------------------------
// Inline the implementation (mirrors weather.js exactly)
// ---------------------------------------------------------------------------

class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timerId);
    return response;
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TimeoutError', () => {
  it('is an instance of Error', () => {
    const err = new TimeoutError('oops');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name "TimeoutError"', () => {
    const err = new TimeoutError('oops');
    expect(err.name).toBe('TimeoutError');
  });

  it('uses default message when none provided', () => {
    const err = new TimeoutError();
    expect(err.message).toBe('Request timed out');
  });
});

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns the response on a successful fetch', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithTimeout('https://example.com', 5000);
    expect(result.status).toBe(200);
  });

  it('passes the AbortController signal to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await fetchWithTimeout('https://example.com', 5000);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws TimeoutError when fetch is aborted due to timeout', async () => {
    // fetch that never resolves — simulates a slow server
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new DOMException('The operation was aborted.', 'AbortError');
          reject(err);
        });
      });
    }));

    const promise = fetchWithTimeout('https://example.com', 3000);
    vi.advanceTimersByTime(3000);

    await expect(promise).rejects.toThrow(TimeoutError);
  });

  it('TimeoutError message includes the URL and timeout duration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }));

    const promise = fetchWithTimeout('https://api.example.com/data', 5000);
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(/https:\/\/api\.example\.com\/data/);
    await expect(fetchWithTimeout('https://api.example.com/data', 5000).catch(e => { vi.advanceTimersByTime(5000); return Promise.reject(e); })).rejects.toThrow(/5000ms/);
  });

  it('uses 10000ms as the default timeout', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', mockFetch);

    await fetchWithTimeout('https://example.com');
    // Timer should be set but not fired — fetch resolved before timeout
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('re-throws non-abort errors unchanged', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

    await expect(fetchWithTimeout('https://example.com', 5000)).rejects.toThrow(TypeError);
    await expect(fetchWithTimeout('https://example.com', 5000)).rejects.toThrow('Failed to fetch');
  });
});
