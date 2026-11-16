export type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel(): void;
};

/** Trailing-edge scheduling; the callback receives the latest arguments. */
export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };
  const delayed = (...args: Args): void => {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, delay);
  };
  delayed.cancel = cancel;
  return delayed;
}
