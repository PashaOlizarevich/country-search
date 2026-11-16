import { describe, expect, it } from 'vitest';
import { HttpError, classifySearchError } from './errors.js';

describe('search error semantics', () => {
  it('preserves HTTP status and a useful error identity', () => {
    const error = new HttpError(503);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(503);
    expect(error.message).toContain('503');
  });
  it.each([
    [new DOMException('Cancelled', 'AbortError'), 'aborted'],
    [new DOMException('Too slow', 'TimeoutError'), 'timeout'],
    [new HttpError(404), 'empty'],
    [new HttpError(500), 'http'],
    [new TypeError('Network failed'), 'error'],
    [null, 'error'],
    ['AbortError', 'error'],
    [{ name: 'AbortError' }, 'aborted'],
    [{ name: 'TimeoutError' }, 'timeout'],
    [{ status: 404 }, 'error'],
  ])('classifies %j as %s', (error, expected) => {
    expect(classifySearchError(error)).toBe(expected);
  });
});
