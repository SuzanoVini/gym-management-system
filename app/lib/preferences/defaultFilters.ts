import type { FilterTabKey, TabFilters } from '@/store/useFilterStore';

/**
 * Sentinel meaning "whatever year/month it is today" rather than a pinned value. The
 * shipped default has always tracked the current period, so storing a literal year would
 * silently freeze a user's roster to 2026 the moment they saved their preferences.
 */
export const CURRENT = 'current';

export type StoredTabFilters = Partial<TabFilters>;

export interface OverviewDefaults {
  dateRange?: string;
}

export interface DefaultFilterPreferences {
  defaultFilters?: Partial<Record<FilterTabKey, StoredTabFilters>> & {
    overview?: OverviewDefaults;
  };
}

export const FILTERABLE_TABS: FilterTabKey[] = ['intros', 'signups', 'cancellations', 'holds'];

/** The behaviour the app shipped with, used whenever a user has saved no preference. */
export function shippedDefaults(now: Date = new Date()): TabFilters {
  return {
    year: now.getFullYear().toString(),
    month: now.toLocaleString('en-US', { month: 'short' }),
    staff: 'all',
    class: 'all',
    reason: 'all',
    ageGroup: 'all',
    membership: 'all',
    holdStatus: 'all',
    searchTerm: '',
  };
}

/**
 * Layers a user's stored choices over the shipped defaults. Missing keys fall through, so
 * a preference saved before a new filter existed stays valid instead of blanking it out.
 */
export function resolveTabDefaults(
  stored: StoredTabFilters | undefined,
  now: Date = new Date()
): TabFilters {
  const base = shippedDefaults(now);
  if (!stored) {
    return base;
  }

  const resolved = { ...base };
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (value === CURRENT) {
      continue; // keep the live current-period value from `base`
    }
    resolved[key as keyof TabFilters] = value as string;
  }
  return resolved;
}

/** Overview tracks a single date range rather than the full filter set. */
export const SHIPPED_OVERVIEW_DATE_RANGE = 'all';

export function resolveOverviewDefault(prefs: DefaultFilterPreferences | null | undefined): string {
  return prefs?.defaultFilters?.overview?.dateRange || SHIPPED_OVERVIEW_DATE_RANGE;
}
