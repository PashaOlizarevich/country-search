export class HttpError extends Error {
    status;
    constructor(status) {
        super(`HTTP ${status}`);
        this.status = status;
        this.name = 'HttpError';
    }
}
/** Name checks also support DOM exceptions originating in another realm. */
export function classifySearchError(error) {
    if (error instanceof HttpError)
        return error.status === 404 ? 'empty' : 'http';
    if (typeof error === 'object' && error !== null && 'name' in error) {
        if (error.name === 'AbortError')
            return 'aborted';
        if (error.name === 'TimeoutError')
            return 'timeout';
    }
    return 'error';
}
