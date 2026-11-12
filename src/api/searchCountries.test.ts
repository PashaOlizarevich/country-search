import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { searchCountries } from './searchCountries.js';
import { HttpError } from './errors.js';

const japan = readFileSync(
  new URL('../../tests/fixtures/name-japan.json', import.meta.url),
  'utf8',
);

describe('searchCountries', () => {
  it('trims and encodes a path segment, passes the same signal and maps JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(japan));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    const result = await searchCountries('  Côte /?&日本  ', signal);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `https://countries.dev/name/${encodeURIComponent('Côte /?&日本')}`,
      { signal },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'Japan', capital: 'Tokyo', languages: ['Japanese'] });
  });
  it.each(['', ' \n\t '])('does not fetch an empty query %j', async (query) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchCountries(query, new AbortController().signal)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('handles text 404 before trying to parse JSON', async () => {
    const response = new Response('Country not found', { status: 404 });
    const json = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    expect(await searchCountries('missing', new AbortController().signal)).toEqual([]);
    expect(json).not.toHaveBeenCalled();
  });
  it.each([400, 401, 429, 500, 503])('rejects HTTP %i without parsing its body', async (status) => {
    const response = new Response('server error', { status });
    const json = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const promise = searchCountries('Japan', new AbortController().signal);
    await expect(promise).rejects.toBeInstanceOf(HttpError);
    await expect(promise).rejects.toMatchObject({ status });
    expect(json).not.toHaveBeenCalled();
  });
  it.each([
    new TypeError('offline'),
    new DOMException('cancelled', 'AbortError'),
    new DOMException('deadline', 'TimeoutError'),
  ])('preserves fetch rejection %s', async (error) => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(searchCountries('Japan', new AbortController().signal)).rejects.toBe(error);
  });
  it.each(['AbortError', 'TimeoutError'])('preserves %s while reading the body', async (name) => {
    const error = new DOMException('body interrupted', name);
    const response = new Response(japan);
    vi.spyOn(response, 'json').mockRejectedValue(error);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(searchCountries('Japan', new AbortController().signal)).rejects.toBe(error);
  });
  it('really passes cancellation to an in-flight fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
              once: true,
            });
          }),
      ),
    );
    const controller = new AbortController();
    const promise = searchCountries('Japan', controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
  });
  it('forwards an already aborted signal', async () => {
    const signal = AbortSignal.abort();
    const fetchMock = vi.fn((_url: string, options: RequestInit) =>
      Promise.reject(options.signal?.reason),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchCountries('Japan', signal)).rejects.toBe(signal.reason);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { signal });
  });
  it.each(['null', '{}', '[{}]', 'not JSON'])(
    'rejects invalid success payload %s',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
      await expect(searchCountries('Japan', new AbortController().signal)).rejects.toBeInstanceOf(
        Error,
      );
    },
  );
  it('accepts an empty success array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
    expect(await searchCountries('Japan', new AbortController().signal)).toEqual([]);
  });
});
