'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type FilterTabKey = 'intros' | 'signups' | 'cancellations' | 'holds';

export interface TabFilters {
  year: string;
  month: string;
  staff: string;
  class: string;
  reason: string; // For cancellations and holds
  ageGroup: string; // For cancellations
  membership: string; // For signups
  holdStatus: string; // For holds
  searchTerm: string;
}

type FiltersByTab = Record<FilterTabKey, TabFilters>;

interface FilterState {
  filtersByTab: FiltersByTab;
  /** Baseline each tab resets to — user preferences when set, shipped defaults otherwise. */
  defaultsByTab: FiltersByTab;
  setFilters: (tab: FilterTabKey, filters: Partial<TabFilters>) => void;
  clearFilters: (tab: FilterTabKey) => void;
  /** True once saved preferences have been applied, so hydration only resets filters once. */
  hydrated: boolean;
  /** Applies saved preferences once they arrive from the database. */
  applyDefaults: (defaults: FiltersByTab, resetActive?: boolean) => void;
}

function defaultFilters(): TabFilters {
  const currentDate = new Date();
  return {
    year: currentDate.getFullYear().toString(),
    month: currentDate.toLocaleString('en-US', { month: 'short' }),
    staff: 'all',
    class: 'all',
    reason: 'all',
    ageGroup: 'all',
    membership: 'all',
    holdStatus: 'all',
    searchTerm: '',
  };
}

const TAB_KEYS: FilterTabKey[] = ['intros', 'signups', 'cancellations', 'holds'];

function initialFiltersByTab(): FiltersByTab {
  return Object.fromEntries(TAB_KEYS.map((tab) => [tab, defaultFilters()])) as FiltersByTab;
}

export const useFilterStore = create<FilterState>()(
  devtools(
    (set) => ({
      filtersByTab: initialFiltersByTab(),
      defaultsByTab: initialFiltersByTab(),
      hydrated: false,
      setFilters: (tab, filters) =>
        set((state) => ({
          filtersByTab: {
            ...state.filtersByTab,
            [tab]: { ...state.filtersByTab[tab], ...filters },
          },
        })),
      clearFilters: (tab) =>
        set((state) => ({
          filtersByTab: {
            ...state.filtersByTab,
            [tab]: state.defaultsByTab[tab],
          },
        })),
      // Hydration must not clobber filters the user has already set: this hook runs on every
      // mount of Overview and of the settings panel, so an unconditional reset would wipe an
      // in-progress filter the moment they opened Settings. Only the first hydration seeds
      // the active filters; an explicit save passes resetActive to apply the new choice now.
      applyDefaults: (defaults, resetActive) =>
        set((state) => {
          const shouldReset = resetActive ?? !state.hydrated;
          return {
            defaultsByTab: defaults,
            filtersByTab: shouldReset ? defaults : state.filtersByTab,
            hydrated: true,
          };
        }),
    }),
    {
      name: 'filter-store',
    }
  )
);

/** `tab` is required: defaults differ per tab, so comparing against another tab's is wrong. */
export function isDefaultFilters(filters: TabFilters, tab: FilterTabKey): boolean {
  const defaults = useFilterStore.getState().defaultsByTab[tab];
  return Object.entries(defaults).every(
    ([key, value]) => filters[key as keyof TabFilters] === value
  );
}
