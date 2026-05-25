'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  loading: boolean;
  error: string | null;
  modals: {
    addIntro: boolean;
    editIntro: boolean;
    followUp: boolean;
    settings: boolean;
    addCancellation: boolean;
    editCancellation: boolean;
    addHold: boolean;
    editHold: boolean;
    addSignup: boolean;
    editSignup: boolean;
    importPreview: boolean;
    notesManager: boolean;
  };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
}

const initialState = {
  loading: false,
  error: null,
  modals: {
    addIntro: false,
    editIntro: false,
    followUp: false,
    settings: false,
    addCancellation: false,
    editCancellation: false,
    addHold: false,
    editHold: false,
    addSignup: false,
    editSignup: false,
    importPreview: false,
    notesManager: false,
  },
};

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      ...initialState,
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      openModal: (modal) =>
        set((state) => ({
          modals: { ...state.modals, [modal]: true },
        })),
      closeModal: (modal) =>
        set((state) => ({
          modals: { ...state.modals, [modal]: false },
        })),
      closeAllModals: () =>
        set({
          modals: initialState.modals,
        }),
    }),
    {
      name: 'ui-store',
    }
  )
);
