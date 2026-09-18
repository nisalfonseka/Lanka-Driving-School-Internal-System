"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has stopped changing for `delay` ms, so work
 * driven by typing (filtering, network lookups) runs once per pause instead of
 * once per keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
