import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * inactivity. Cleans up correctly on unmount.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
