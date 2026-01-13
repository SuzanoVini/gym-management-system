'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Cancellation, Hold, Intro, Signup } from '@/types';

export type SelectionTabKey = 'intros' | 'signups' | 'cancellations' | 'holds';

type TabSelections = Record<SelectionTabKey, Set<string>>;

interface SelectionState {
  selectedIntro: Intro | null;
  selectedSignup: Signup | null;
  selectedCancellation: Cancellation | null;
  selectedHold: Hold | null;
  selectedIdsByTab: TabSelections;
  setSelectedIntro: (intro: Intro | null) => void;
  setSelectedSignup: (signup: Signup | null) => void;
  setSelectedCancellation: (cancellation: Cancellation | null) => void;
  setSelectedHold: (hold: Hold | null) => void;
  toggleSelection: (tab: SelectionTabKey, id: string) => void;
  selectAll: (tab: SelectionTabKey, ids: string[]) => void;
  clearSelection: (tab: SelectionTabKey, ids?: string[]) => void;
}

const initialState = {
  selectedIntro: null,
  selectedSignup: null,
  selectedCancellation: null,
  selectedHold: null,
  selectedIdsByTab: {
    intros: new Set(),
    signups: new Set(),
    cancellations: new Set(),
    holds: new Set(),
  },
};

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set) => ({
      ...initialState,
      setSelectedIntro: (intro) => set({ selectedIntro: intro }),
      setSelectedSignup: (signup) => set({ selectedSignup: signup }),
      setSelectedCancellation: (cancellation) => set({ selectedCancellation: cancellation }),
      setSelectedHold: (hold) => set({ selectedHold: hold }),
      toggleSelection: (tab, id) =>
        set((state) => {
          const newSelectedIds = new Set(state.selectedIdsByTab[tab]);
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
          } else {
            newSelectedIds.add(id);
          }
          return {
            selectedIdsByTab: {
              ...state.selectedIdsByTab,
              [tab]: newSelectedIds,
            },
          };
        }),
      selectAll: (tab, ids) =>
        set((state) => {
          const newSelectedIds = new Set(state.selectedIdsByTab[tab]);
          for (const id of ids) {
            newSelectedIds.add(id);
          }
          return {
            selectedIdsByTab: {
              ...state.selectedIdsByTab,
              [tab]: newSelectedIds,
            },
          };
        }),
      clearSelection: (tab, ids) =>
        set((state) => {
          if (!ids) {
            return {
              selectedIdsByTab: {
                ...state.selectedIdsByTab,
                [tab]: new Set(),
              },
            };
          }
          const newSelectedIds = new Set(state.selectedIdsByTab[tab]);
          for (const id of ids) {
            newSelectedIds.delete(id);
          }
          return {
            selectedIdsByTab: {
              ...state.selectedIdsByTab,
              [tab]: newSelectedIds,
            },
          };
        }),
    }),
    {
      name: 'selection-store',
    }
  )
);
