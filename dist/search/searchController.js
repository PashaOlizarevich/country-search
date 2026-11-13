import { classifySearchError } from '../api/errors.js';
import { searchCountries } from '../api/searchCountries.js';
import { debounce } from '../utils/debounce.js';
export function createSearchController({ onState, request = searchCountries, debounceMs = 300, timeoutMs = 10_000, }) {
    let state = { kind: 'idle', query: '' };
    let query = '';
    let revision = 0;
    let destroyed = false;
    let active;
    function publish(next) {
        state = next;
        onState(next);
    }
    function release(task) {
        clearTimeout(task.timer);
        task.timer = undefined;
        if (active === task)
            active = undefined;
    }
    function isCurrent(task, version) {
        return !destroyed && version === revision && active === task;
    }
    async function run(currentQuery, version) {
        if (destroyed || version !== revision)
            return;
        const task = { controller: new AbortController(), timer: undefined };
        active = task;
        publish({ kind: 'loading', query: currentQuery });
        // Observers may synchronously clear, retry or destroy the controller.
        if (!isCurrent(task, version))
            return;
        task.timer = setTimeout(() => {
            if (!isCurrent(task, version))
                return;
            const error = new DOMException('Search timed out', 'TimeoutError');
            release(task);
            task.controller.abort(error);
            // An abort listener can itself change the current query.
            if (!destroyed && version === revision) {
                publish({ kind: 'error', query: currentQuery, errorKind: 'timeout', error });
            }
        }, timeoutMs);
        let countries;
        try {
            countries = await request(currentQuery, task.controller.signal);
        }
        catch (error) {
            if (!isCurrent(task, version))
                return;
            release(task);
            const kind = classifySearchError(error);
            if (kind === 'aborted')
                publish({ kind: 'idle', query: currentQuery });
            else if (kind === 'empty')
                publish({ kind: 'empty', query: currentQuery });
            else
                publish({ kind: 'error', query: currentQuery, errorKind: kind, error });
            return;
        }
        if (!isCurrent(task, version))
            return;
        release(task);
        publish(countries.length
            ? { kind: 'results', query: currentQuery, countries }
            : { kind: 'empty', query: currentQuery });
    }
    const scheduled = debounce((value, version) => {
        void run(value, version);
    }, debounceMs);
    function cancelCurrent() {
        const version = ++revision;
        scheduled.cancel();
        if (active) {
            const previous = active;
            release(previous);
            previous.controller.abort();
        }
        return version;
    }
    function setQuery(value) {
        if (destroyed)
            return;
        const version = cancelCurrent();
        // An abort listener may have already started a newer user action.
        if (destroyed || version !== revision)
            return;
        query = value.trim();
        publish({ kind: query ? 'waiting' : 'idle', query });
        if (!destroyed && version === revision && query)
            scheduled(query, version);
    }
    onState(state);
    return {
        getState: () => state,
        setQuery,
        clear: () => setQuery(''),
        retry() {
            if (destroyed || !query)
                return;
            const version = cancelCurrent();
            if (!destroyed && version === revision)
                void run(query, version);
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            cancelCurrent();
        },
    };
}
