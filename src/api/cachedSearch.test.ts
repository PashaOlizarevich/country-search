import { describe, expect, it, vi } from 'vitest';
import { createCachedSearch } from './cachedSearch.js';
import { mapCountryResponse } from '../models/mapCountryResponse.js';

const countries = [mapCountryResponse({ name: 'Japan' })];
const signal = () => new AbortController().signal;

describe('cached search', () => {
  it('normalizes keys, caches results and returns independent copies', async () => {
    const request = vi.fn().mockResolvedValue(countries);
    const search = createCachedSearch(request);
    const first = await search(' Japan ', signal());
    first.pop();
    expect(await search('jAPAN', signal())).toEqual(countries);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('shares transport while one consumer can cancel independently', async () => {
    let finish!: (value: typeof countries) => void;
    let transport!: AbortSignal;
    const request = vi.fn((_query: string, supplied: AbortSignal) => {
      transport = supplied;
      return new Promise<typeof countries>((resolve) => {
        finish = resolve;
      });
    });
    const search = createCachedSearch(request);
    const one = new AbortController();
    const first = search('Japan', one.signal);
    const second = search('japan', signal());
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    one.abort();
    await rejected;
    expect(transport.aborted).toBe(false);
    finish(countries);
    expect(await second).toEqual(countries);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('aborts unused transport and isolates its late result from a new flight', async () => {
    const finish: ((value: typeof countries) => void)[] = [];
    const signals: AbortSignal[] = [];
    const request = vi.fn((_query: string, supplied: AbortSignal) => {
      signals.push(supplied);
      return new Promise<typeof countries>((resolve) => finish.push(resolve));
    });
    const search = createCachedSearch(request);
    const owner = new AbortController();
    const old = search('Japan', owner.signal);
    const rejected = expect(old).rejects.toMatchObject({ name: 'TimeoutError' });
    owner.abort(new DOMException('deadline', 'TimeoutError'));
    await rejected;
    expect(signals[0]?.aborted).toBe(true);
    const current = search('Japan', signal());
    finish[0]?.([]);
    await Promise.resolve();
    const shared = search('Japan', signal());
    expect(request).toHaveBeenCalledTimes(2);
    finish[1]?.(countries);
    expect(await current).toEqual(countries);
    expect(await shared).toEqual(countries);
  });
  it('does not cache errors and caches an empty success', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const search = createCachedSearch(request);
    await expect(search('Japan', signal())).rejects.toThrow('offline');
    expect(await search('Japan', signal())).toEqual([]);
    expect(await search('Japan', signal())).toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('expires entries and bounds cache size', async () => {
    let now = 0;
    const request = vi.fn().mockResolvedValue(countries);
    const search = createCachedSearch(request, { ttlMs: 10, maxEntries: 1, now: () => now });
    await search('Japan', signal());
    now = 10;
    await search('Japan', signal());
    await search('Spain', signal());
    await search('Japan', signal());
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('rejects pre-aborted consumers even on cache hits and skips blank searches', async () => {
    const request = vi.fn().mockResolvedValue(countries);
    const search = createCachedSearch(request);
    await search('Japan', signal());
    await expect(search('Japan', AbortSignal.abort())).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(await search(' ', signal())).toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
