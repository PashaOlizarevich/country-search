import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce.js';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('waits the complete delay and invokes only once', () => {
    const callback = vi.fn();
    const delayed = debounce(callback, 300);
    delayed('Japan');
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('Japan');
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('restarts the delay and forwards only the latest arguments', () => {
    const callback = vi.fn();
    const delayed = debounce(callback, 300);
    delayed('sp', 1);
    vi.advanceTimersByTime(250);
    delayed('spain', 2);
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('spain', 2);
  });
  it('cancels pending work idempotently and can be reused', () => {
    const callback = vi.fn();
    const delayed = debounce(callback, 20);
    delayed('old');
    delayed.cancel();
    delayed.cancel();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    delayed('new');
    vi.advanceTimersByTime(20);
    expect(callback).toHaveBeenCalledExactlyOnceWith('new');
    delayed.cancel();
  });
  it('keeps independent timers for different wrappers', () => {
    const first = vi.fn();
    const second = vi.fn();
    const a = debounce(first, 10);
    const b = debounce(second, 20);
    a();
    b();
    a.cancel();
    vi.advanceTimersByTime(20);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
  it('supports scheduling again from inside the callback', () => {
    const calls: number[] = [];
    const delayed = debounce((value: number) => {
      calls.push(value);
      if (value === 1) delayed(2);
    }, 10);
    delayed(1);
    vi.advanceTimersByTime(20);
    expect(calls).toEqual([1, 2]);
  });
  it('defers a zero delay instead of calling synchronously', () => {
    const callback = vi.fn();
    debounce(callback, 0)();
    expect(callback).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
