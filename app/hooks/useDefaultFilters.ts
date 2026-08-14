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
 * Loads the signed-in user's saved default filters and pushes them into the filter store.
 * Runs once per mount; until it resolves the store holds the shipped defaults, so the UI
 * is never blank while waiting on the network.
 */
export function useDefaultFilters() {
  const applyDefaults = useFilterStore((s) => s.applyDefaults);
  const [preferences, setPreferences] = useState<DefaultFilterPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const prefs = await fetchPreferences();
    setPreferences(prefs);
    applyDefaults(toFiltersByTab(prefs));
    setLoading(false);
  }, [applyDefaults]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (next: DefaultFilterPreferences) => {
      await savePreferences(next);
      setPreferences(next);
      // An explicit save is the user choosing defaults now, so apply them immediately.
      applyDefaults(toFiltersByTab(next), true);
    },
    [applyDefaults]
  );

  return {
    preferences,
    loading,
    save,
    overviewDateRange: resolveOverviewDefault(preferences),
  };
}
