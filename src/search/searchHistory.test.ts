import { describe, expect, it, vi } from 'vitest';
import { createSearchHistory } from './searchHistory.js';

describe('search history', () => {
  it('normalizes, deduplicates and bounds newest-first history', () => {
    const storage = { getItem: () => null, setItem: vi.fn() };
    const history = createSearchHistory(() => storage);
    for (const query of ['a', 'b', 'c', 'd', 'e', 'f', ' B ', ' ']) history.add(query);
    expect(history.get()).toEqual(['B', 'f', 'e', 'd', 'c']);
    const copy = history.get();
    copy.pop();
    expect(history.get()).toHaveLength(5);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      'country-search.history',
      JSON.stringify(history.get()),
    );
  });
  it('restores only valid queries from storage', () => {
    const history = createSearchHistory(() => ({
      getItem: () => '[" Japan ",null,12,"japan","Spain",""]',
      setItem: vi.fn(),
    }));
    expect(history.get()).toEqual(['Japan', 'Spain']);
  });
  it.each(['broken', '{}', 'null'])('ignores invalid stored JSON: %s', (value) => {
    expect(createSearchHistory(() => ({ getItem: () => value, setItem: vi.fn() })).get()).toEqual(
      [],
    );
  });
  it('survives blocked storage access and write failures using memory', () => {
    const blocked = createSearchHistory(() => {
      throw new Error('denied');
    });
    blocked.add('Japan');
    expect(blocked.get()).toEqual(['Japan']);
    const full = createSearchHistory(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    }));
    full.add('Spain');
    expect(full.get()).toEqual(['Spain']);
  });
});
