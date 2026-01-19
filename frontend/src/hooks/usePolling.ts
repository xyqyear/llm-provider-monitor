import { useCallback, useEffect, useRef } from 'react';

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  onData: (data: T) => void,
  intervalMs: number,
  enabled = true
) {
  const timeoutRef = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await fetchFn();
      onData(data);
    } catch (error) {
      console.error('Polling error:', error);
    }

    if (enabled) {
      timeoutRef.current = window.setTimeout(poll, intervalMs);
    }
  }, [fetchFn, onData, intervalMs, enabled]);

  useEffect(() => {
    if (enabled) {
      poll();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [poll, enabled]);
}
