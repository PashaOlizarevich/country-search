const key = 'country-search.history';
const limit = 5;
function clean(values) {
    if (!Array.isArray(values))
        return [];
    const seen = new Set();
    const result = [];
    for (const value of values) {
        if (typeof value !== 'string')
            continue;
        const query = value.trim();
        const normalized = query.toLowerCase();
        if (!query || query.length > 200 || seen.has(normalized))
            continue;
        seen.add(normalized);
        result.push(query);
        if (result.length === limit)
            break;
    }
    return result;
}
/** Access storage lazily so security/quota failures never interrupt search. */
export function createSearchHistory(getStorage) {
    let entries = [];
    try {
        const raw = JSON.parse(getStorage().getItem(key) ?? '[]');
        entries = clean(raw);
    }
    catch {
        /* History remains usable in memory. */
    }
    return {
        get: () => [...entries],
        add(query) {
            if (!query.trim() || query.trim().length > 200)
                return;
            entries = clean([query, ...entries]);
            try {
                getStorage().setItem(key, JSON.stringify(entries));
            }
            catch {
                /* Keep the in-memory history when persistence is unavailable. */
            }
        },
    };
}
