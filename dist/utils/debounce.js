/** Trailing-edge scheduling; the callback receives the latest arguments. */
export function debounce(callback, delay) {
    let timer;
    const cancel = () => {
        clearTimeout(timer);
        timer = undefined;
    };
    const delayed = (...args) => {
        cancel();
        timer = setTimeout(() => {
            timer = undefined;
            callback(...args);
        }, delay);
    };
    delayed.cancel = cancel;
    return delayed;
}
