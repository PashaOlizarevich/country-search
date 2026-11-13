import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from './searchController.js';

describe('search request race', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('aborts the older fetch and keeps the newer result when response order is inverted', async () => {
    const attemptedResolutions: string[] = [];
    const abortedReasons: unknown[] = [];
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const query = decodeURIComponent(String(input).split('/').at(-1) ?? '');
      const signal = init?.signal;
      if (!signal) throw new TypeError('The request must receive an AbortSignal');
      signals.push(signal);

      return new Promise<Response>((resolve, reject) => {
        setTimeout(
          () => {
            attemptedResolutions.push(query);
            resolve(
              new Response(
                JSON.stringify([
                  {
                    name: query === 'spain' ? 'Spain' : 'Old partial result',
                    capital: query === 'spain' ? 'Madrid' : 'Stale',
                  },
                ]),
              ),
            );
          },
          query === 'sp' ? 1_000 : 10,
        );
        signal.addEventListener(
          'abort',
          () => {
            const error = new DOMException('Superseded search', 'AbortError');
            abortedReasons.push(error);
            reject(error);
          },
          { once: true },
        );
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const onState = vi.fn();
    const controller = createSearchController({ onState, debounceMs: 10 });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(10);
    expect(controller.getState()).toMatchObject({ kind: 'loading', query: 'sp' });

    controller.setQuery('spain');
    expect(signals[0]?.aborted).toBe(true);
    expect(abortedReasons).toHaveLength(1);
    expect(abortedReasons[0]).toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(20);
    expect(attemptedResolutions).toEqual(['spain']);
    expect(controller.getState()).toMatchObject({
      kind: 'results',
      query: 'spain',
      countries: [{ name: 'Spain', capital: 'Madrid' }],
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(attemptedResolutions).toEqual(['spain', 'sp']);
    expect(controller.getState()).toMatchObject({
      kind: 'results',
      query: 'spain',
      countries: [{ name: 'Spain', capital: 'Madrid' }],
    });
    expect(signals[1]?.aborted).toBe(false);
    expect(onState.mock.calls.some(([state]) => state.kind === 'error')).toBe(false);
    controller.destroy();
  });
});
