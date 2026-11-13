import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from './searchController.js';
import { HttpError } from '../api/errors.js';
import { mapCountryResponse } from '../models/mapCountryResponse.js';
import type { Country } from '../models/country.js';

const japan = mapCountryResponse({ name: 'Japan' });
function pending() {
  let resolve!: (countries: Country[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Country[]>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('search controller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('starts idle, debounces input and publishes results', async () => {
    const request = vi.fn().mockResolvedValue([japan]);
    const onState = vi.fn();
    const controller = createSearchController({ request, onState });
    expect(controller.getState()).toEqual({ kind: 'idle', query: '' });
    controller.setQuery(' Ja ');
    expect(controller.getState()).toEqual({ kind: 'waiting', query: 'Ja' });
    await vi.advanceTimersByTimeAsync(299);
    expect(request).not.toHaveBeenCalled();
    controller.setQuery(' Japan ');
    await vi.advanceTimersByTimeAsync(300);
    expect(request).toHaveBeenCalledExactlyOnceWith('Japan', expect.any(AbortSignal));
    expect(onState.mock.calls.map(([state]) => state.kind)).toEqual([
      'idle',
      'waiting',
      'waiting',
      'loading',
      'results',
    ]);
    expect(controller.getState()).toEqual({ kind: 'results', query: 'Japan', countries: [japan] });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts synchronously on new input before the next debounce fires', async () => {
    let signal!: AbortSignal;
    const request = vi.fn((_query: string, supplied: AbortSignal) => {
      signal = supplied;
      return new Promise<Country[]>((_resolve, reject) =>
        supplied.addEventListener('abort', () => reject(supplied.reason), { once: true }),
      );
    });
    const onState = vi.fn();
    const controller = createSearchController({ request, onState });
    controller.setQuery('old');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('new');
    expect(signal.aborted).toBe(true);
    expect(signal.reason.name).toBe('AbortError');
    await vi.advanceTimersByTimeAsync(299);
    expect(request).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toEqual({ kind: 'waiting', query: 'new' });
    expect(onState.mock.calls.some(([state]) => state.kind === 'error')).toBe(false);
    controller.destroy();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores a stale %s while a newer request is active',
    async (outcome) => {
      const old = pending();
      const next = pending();
      const request = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
      const controller = createSearchController({ request, onState: vi.fn() });
      controller.setQuery('old');
      await vi.advanceTimersByTimeAsync(300);
      controller.setQuery('new');
      await vi.advanceTimersByTimeAsync(300);
      if (outcome === 'resolve') old.resolve([japan]);
      else old.reject(new Error('stale'));
      await vi.advanceTimersByTimeAsync(0);
      expect(controller.getState()).toEqual({ kind: 'loading', query: 'new' });
      const nextSignal: AbortSignal = request.mock.calls[1]?.[1];
      controller.clear();
      expect(nextSignal.aborted).toBe(true);
      next.resolve([japan]);
      await vi.advanceTimersByTimeAsync(0);
      expect(controller.getState()).toEqual({ kind: 'idle', query: '' });
    },
  );

  it('ignores an old success during the next debounce window', async () => {
    const old = pending();
    const request = vi.fn().mockReturnValue(old.promise);
    const controller = createSearchController({ request, onState: vi.fn() });
    controller.setQuery('old');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('new');
    old.resolve([japan]);
    await vi.advanceTimersByTimeAsync(299);
    expect(controller.getState()).toEqual({ kind: 'waiting', query: 'new' });
    expect(request).toHaveBeenCalledTimes(1);
    controller.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears pending debounce and whitespace input without a request', async () => {
    const request = vi.fn();
    const controller = createSearchController({ request, onState: vi.fn() });
    controller.setQuery('Japan');
    controller.clear();
    controller.setQuery(' \n ');
    controller.retry();
    await vi.advanceTimersByTimeAsync(1000);
    expect(request).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ kind: 'idle', query: '' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('removes previous results immediately when input changes', async () => {
    const controller = createSearchController({
      request: vi.fn().mockResolvedValue([japan]),
      onState: vi.fn(),
    });
    controller.setQuery('Japan');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('new');
    expect(controller.getState()).toEqual({ kind: 'waiting', query: 'new' });
    controller.clear();
    expect(controller.getState()).toEqual({ kind: 'idle', query: '' });
  });

  it('times out from request start, aborts transport and ignores a late success', async () => {
    const task = pending();
    const request = vi.fn().mockReturnValue(task.promise);
    const controller = createSearchController({ request, onState: vi.fn(), timeoutMs: 1000 });
    controller.setQuery('Japan');
    await vi.advanceTimersByTimeAsync(1299);
    expect(controller.getState().kind).toBe('loading');
    await vi.advanceTimersByTimeAsync(1);
    const signal: AbortSignal = request.mock.calls[0]?.[1];
    expect(signal.aborted).toBe(true);
    expect(signal.reason.name).toBe('TimeoutError');
    expect(controller.getState()).toMatchObject({
      kind: 'error',
      query: 'Japan',
      errorKind: 'timeout',
    });
    task.resolve([japan]);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().kind).toBe('error');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [new HttpError(503), 'error', 'http'],
    [new TypeError('offline'), 'error', 'error'],
    [new DOMException('deadline', 'TimeoutError'), 'error', 'timeout'],
    [new HttpError(404), 'empty', undefined],
    [new DOMException('cancelled', 'AbortError'), 'idle', undefined],
  ])('classifies request rejection %s', async (error, kind, errorKind) => {
    const controller = createSearchController({
      request: vi.fn().mockRejectedValue(error),
      onState: vi.fn(),
    });
    controller.setQuery('Japan');
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState()).toMatchObject({ kind, query: 'Japan' });
    if (errorKind) expect(controller.getState()).toMatchObject({ errorKind });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('publishes empty results and retries only the latest query immediately', async () => {
    const request = vi.fn().mockResolvedValue([]);
    const controller = createSearchController({ request, onState: vi.fn() });
    controller.setQuery('old');
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getState()).toEqual({ kind: 'empty', query: 'old' });
    controller.setQuery(' latest ');
    controller.retry();
    expect(request).toHaveBeenLastCalledWith('latest', expect.any(AbortSignal));
    await vi.advanceTimersByTimeAsync(500);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('destroy cancels timers and active transport and blocks later notifications/actions', async () => {
    const task = pending();
    const request = vi.fn().mockReturnValue(task.promise);
    const onState = vi.fn();
    const controller = createSearchController({ request, onState });
    controller.setQuery('Japan');
    await vi.advanceTimersByTimeAsync(300);
    const signal: AbortSignal = request.mock.calls[0]?.[1];
    controller.destroy();
    controller.destroy();
    expect(signal.aborted).toBe(true);
    const calls = onState.mock.calls.length;
    controller.setQuery('new');
    controller.retry();
    controller.clear();
    task.resolve([japan]);
    await vi.advanceTimersByTimeAsync(20000);
    expect(onState).toHaveBeenCalledTimes(calls);
    expect(request).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('destroy cancels a pending debounce', async () => {
    const request = vi.fn();
    const controller = createSearchController({ request, onState: vi.fn() });
    controller.setQuery('Japan');
    controller.destroy();
    await vi.advanceTimersByTimeAsync(300);
    expect(request).not.toHaveBeenCalled();
  });

  it('honours reentrant clear during loading notification', async () => {
    const request = vi.fn();
    const controller = createSearchController({
      request,
      onState: (state) => {
        if (state.kind === 'loading') controller.clear();
      },
    });
    controller.setQuery('Japan');
    await vi.advanceTimersByTimeAsync(300);
    expect(request).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({ kind: 'idle', query: '' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the real API wrapper by default with a mocked network', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Country not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = createSearchController({ onState: vi.fn(), debounceMs: 10 });
    controller.setQuery('missing');
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://countries.dev/name/missing', {
      signal: expect.any(AbortSignal),
    });
    expect(controller.getState()).toEqual({ kind: 'empty', query: 'missing' });
  });
});
