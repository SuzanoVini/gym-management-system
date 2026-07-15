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
  setFilters: (tab: FilterTabKey, filters: Partial<TabFilters>) => void;
  clearFilters: (tab: FilterTabKey) => void;
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
            [tab]: defaultFilters(),
          },
        })),
    }),
    {
      name: 'filter-store',
    }
  )
);

export function isDefaultFilters(filters: TabFilters): boolean {
  const defaults = defaultFilters();
  return Object.entries(defaults).every(
    ([key, value]) => filters[key as keyof TabFilters] === value
  );
}
