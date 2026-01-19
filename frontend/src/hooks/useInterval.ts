import { useEffect, useRef } from 'react';

export function useInterval(
  callback: () => Promise<void> | void,
  intervalMs: number,
  enabled = true
) {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const tick = async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        console.error('Interval callback error:', error);
      }

      if (enabled) {
        timeoutRef.current = window.setTimeout(tick, intervalMs);
      }
    };

    // Execute immediately on mount
    tick();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [intervalMs, enabled]);
}
