import { useCallback, useEffect, useRef, useState } from 'react';

export interface Toast {
  id: string;
  message: string;
  insightId: string;
}

const withoutToast = (id: string) => (prev: Toast[]) => prev.filter((t) => t.id !== id);

export function useInsightToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast management
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const addToast = useCallback((insightId: string, message: string) => {
    const id = `${insightId}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, insightId }]);
    toastTimers.current[id] = setTimeout(() => {
      setToasts(withoutToast(id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    clearTimeout(toastTimers.current[toastId]);
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const removeToastsFor = useCallback((insightId: string) => {
    setToasts((prev) => prev.filter((t) => t.insightId !== insightId));
  }, []);

  // Clean up timers on unmount
  useEffect(
    () => () => {
      for (const timer of Object.values(toastTimers.current)) {
        clearTimeout(timer);
      }
    },
    []
  );

  return { toasts, addToast, dismissToast, removeToastsFor };
}
