'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Intro, Signup, Cancellation, Hold } from '@/types';

interface SelectionState {
  selectedIntro: Intro | null;
  selectedSignup: Signup | null;
  selectedCancellation: Cancellation | null;
  selectedHold: Hold | null;
  selectedIds: Set<string>;
  setSelectedIntro: (intro: Intro | null) => void;
  setSelectedSignup: (signup: Signup | null) => void;
  setSelectedCancellation: (cancellation: Cancellation | null) => void;
  setSelectedHold: (hold: Hold | null) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

const initialState = {
  selectedIntro: null,
  selectedSignup: null,
  selectedCancellation: null,
  selectedHold: null,
  selectedIds: new Set(),
};

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set) => ({
      ...initialState,
      setSelectedIntro: (intro) => set({ selectedIntro: intro }),
      setSelectedSignup: (signup) => set({ selectedSignup: signup }),
      setSelectedCancellation: (cancellation) => set({ selectedCancellation: cancellation }),
      setSelectedHold: (hold) => set({ selectedHold: hold }),
      toggleSelection: (id) =>
        set((state) => {
          const newSelectedIds = new Set(state.selectedIds);
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
          } else {
            newSelectedIds.add(id);
          }
          return { selectedIds: newSelectedIds };
        }),
      selectAll: (ids) => set({ selectedIds: new Set(ids) }),
      clearSelection: () => set({ selectedIds: new Set() }),
    }),
    {
      name: 'selection-store',
    }
  )
);
