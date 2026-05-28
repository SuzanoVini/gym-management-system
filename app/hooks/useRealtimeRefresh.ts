import { useEffect, useRef } from 'react';

interface RealtimeSubscription {
  unsubscribe: () => Promise<unknown>;
}

type SubscribeFn = (callback: (payload: unknown) => void) => RealtimeSubscription;

export function useRealtimeRefresh(
  subscribe: SubscribeFn,
  refresh: () => Promise<void>,
  debounceMs = 300
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const channel = subscribe(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        void refreshRef.current();
      }, debounceMs);
    });

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      void channel.unsubscribe();
    };
  }, [subscribe, debounceMs]);
}
