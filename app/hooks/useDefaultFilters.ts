'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type DefaultFilterPreferences,
  FILTERABLE_TABS,
  resolveOverviewDefault,
  resolveTabDefaults,
} from '@/lib/preferences/defaultFilters';
import { fetchPreferences, savePreferences } from '@/lib/supabase/preferences';
import { type FilterTabKey, type TabFilters, useFilterStore } from '@/store/useFilterStore';

function toFiltersByTab(prefs: DefaultFilterPreferences): Record<FilterTabKey, TabFilters> {
  return Object.fromEntries(
    FILTERABLE_TABS.map((tab) => [tab, resolveTabDefaults(prefs.defaultFilters?.[tab])])
  ) as Record<FilterTabKey, TabFilters>;
}

/**
 * Loads the signed-in user's saved default filters into the store.
 *
 * This must run once at the app shell, not inside individual tabs: a tab that mounts without
 * it simply never sees the saved defaults, which is how every tab except Overview silently
 * kept using the shipped values. Until it resolves the store holds the shipped defaults, so
 * nothing is blank while waiting on the network.
 */
export function useHydrateDefaultFilters() {
  const applyDefaults = useFilterStore((s) => s.applyDefaults);

  useEffect(() => {
    let cancelled = false;
    fetchPreferences().then((prefs) => {
      if (!cancelled) {
        applyDefaults(toFiltersByTab(prefs), resolveOverviewDefault(prefs));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [applyDefaults]);
}

/** Read/write access for the settings panel that edits these preferences. */
export function useDefaultFilters() {
  const applyDefaults = useFilterStore((s) => s.applyDefaults);
  const [preferences, setPreferences] = useState<DefaultFilterPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPreferences().then((prefs) => {
      if (!cancelled) {
        setPreferences(prefs);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (next: DefaultFilterPreferences) => {
      await savePreferences(next);
      setPreferences(next);
      // An explicit save is the user choosing defaults now, so apply them immediately.
      applyDefaults(toFiltersByTab(next), resolveOverviewDefault(next), true);
    },
    [applyDefaults]
  );

  return { preferences, loading, save };
}
