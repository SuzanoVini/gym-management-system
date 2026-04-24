'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface FilterState {
  filters: {
    year: string;
    month: string;
    staff: string;
    class: string;
    status: string; // For intros
    reason: string; // For cancellations and holds
    ageGroup: string; // For cancellations
    membership: string; // For signups
    holdStatus: string; // For holds
    searchTerm: string;
  };
  setFilters: (filters: Partial<FilterState['filters']>) => void;
  clearFilters: () => void;
}

const initialState = {
  filters: {
    year: 'all',
    month: 'all',
    staff: 'all',
    class: 'all',
    status: 'all', // For intros
    reason: 'all', // For cancellations and holds
    ageGroup: 'all', // For cancellations
    membership: 'all', // For signups
    holdStatus: 'all', // For holds
    searchTerm: '',
  },
};

export const useFilterStore = create<FilterState>()(
  devtools(
    (set) => ({
      ...initialState,
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      clearFilters: () =>
        set({
          filters: initialState.filters,
        }),
    }),
    {
      name: 'filter-store',
    }
  )
);
