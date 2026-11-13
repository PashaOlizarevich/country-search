import { classifySearchError } from '../api/errors.js';
import { searchCountries } from '../api/searchCountries.js';
import type { Country } from '../models/country.js';
import { debounce } from '../utils/debounce.js';
import type { SearchState } from './searchState.js';

interface SearchOptions {
  readonly onState: (state: SearchState) => void;
  readonly request?: (query: string, signal: AbortSignal) => Promise<Country[]>;
  readonly debounceMs?: number;
  readonly timeoutMs?: number;
}

interface ActiveRequest {
  readonly controller: AbortController;
  timer: ReturnType<typeof setTimeout> | undefined;
}

export function createSearchController({
  onState,
  request = searchCountries,
  debounceMs = 300,
  timeoutMs = 10_000,
}: SearchOptions) {
  let state: SearchState = { kind: 'idle', query: '' };
  let query = '';
  let revision = 0;
  let destroyed = false;
  let active: ActiveRequest | undefined;

  function publish(next: SearchState): void {
    state = next;
    onState(next);
  }

  function release(task: ActiveRequest): void {
    clearTimeout(task.timer);
    task.timer = undefined;
    if (active === task) active = undefined;
  }

  function isCurrent(task: ActiveRequest, version: number): boolean {
    return !destroyed && version === revision && active === task;
  }

  async function run(currentQuery: string, version: number): Promise<void> {
    if (destroyed || version !== revision) return;
    const task: ActiveRequest = { controller: new AbortController(), timer: undefined };
    active = task;
    publish({ kind: 'loading', query: currentQuery });
    // Observers may synchronously clear, retry or destroy the controller.
    if (!isCurrent(task, version)) return;
    task.timer = setTimeout(() => {
      if (!isCurrent(task, version)) return;
      const error = new DOMException('Search timed out', 'TimeoutError');
      release(task);
      task.controller.abort(error);
      // An abort listener can itself change the current query.
      if (!destroyed && version === revision) {
        publish({ kind: 'error', query: currentQuery, errorKind: 'timeout', error });
      }
    }, timeoutMs);

    let countries: Country[];
    try {
      countries = await request(currentQuery, task.controller.signal);
    } catch (error) {
      if (!isCurrent(task, version)) return;
      release(task);
      const kind = classifySearchError(error);
      if (kind === 'aborted') publish({ kind: 'idle', query: currentQuery });
      else if (kind === 'empty') publish({ kind: 'empty', query: currentQuery });
      else publish({ kind: 'error', query: currentQuery, errorKind: kind, error });
      return;
    }
    if (!isCurrent(task, version)) return;
    release(task);
    publish(
      countries.length
        ? { kind: 'results', query: currentQuery, countries }
        : { kind: 'empty', query: currentQuery },
    );
  }

  const scheduled = debounce((value: string, version: number) => {
    void run(value, version);
  }, debounceMs);

  function cancelCurrent(): number {
    const version = ++revision;
    scheduled.cancel();
    if (active) {
      const previous = active;
      release(previous);
      previous.controller.abort();
    }
    return version;
  }

  function setQuery(value: string): void {
    if (destroyed) return;
    const version = cancelCurrent();
    // An abort listener may have already started a newer user action.
    if (destroyed || version !== revision) return;
    query = value.trim();
    publish({ kind: query ? 'waiting' : 'idle', query });
    if (!destroyed && version === revision && query) scheduled(query, version);
  }

  onState(state);
  return {
    getState: (): SearchState => state,
    setQuery,
    clear: (): void => setQuery(''),
    retry(): void {
      if (destroyed || !query) return;
      const version = cancelCurrent();
      if (!destroyed && version === revision) void run(query, version);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      cancelCurrent();
    },
  };
}
