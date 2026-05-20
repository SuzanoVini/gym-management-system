'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    void load();
  }, [load]);

  // One-shot retry after 4 s if initial fetch failed (e.g. transient auth delay)
  useEffect(() => {
    if (loaded) {
      return;
    }
    const timer = setTimeout(() => {
      if (!useSettingsStore.getState().loaded) {
        void load();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [loaded, load]);

  return <>{children}</>;
}
