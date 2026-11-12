export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export type SearchErrorKind = 'aborted' | 'timeout' | 'empty' | 'http' | 'error';

/** Name checks also support DOM exceptions originating in another realm. */
export function classifySearchError(error: unknown): SearchErrorKind {
  if (error instanceof HttpError) return error.status === 404 ? 'empty' : 'http';
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if (error.name === 'AbortError') return 'aborted';
    if (error.name === 'TimeoutError') return 'timeout';
  }
  return 'error';
}
