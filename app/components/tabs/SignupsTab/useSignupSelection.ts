import { useSelectionStore } from '@/store/useSelectionStore';
import type { Signup } from '@/types';
import { useSignupDeletion } from './useSignupDeletion';

const selectionTab = 'signups' as const;

export function useSignupSelection(
  refresh: () => Promise<void>,
  setCurrentPage: (page: number) => void
) {
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelectionForTab = useSelectionStore((state) => state.clearSelection);
  const setSelectedSignup = useSelectionStore((state) => state.setSelectedSignup);
  const clearSelection = () => clearSelectionForTab(selectionTab);
  const deleteSelected = useSignupDeletion({
    selectedIds,
    refresh,
    clearSelection,
    setCurrentPage,
  });

  return {
    selectedIds,
    toggleSelection: (id: string) => toggleSelection(selectionTab, id),
    selectAll: (ids: string[]) => selectAll(selectionTab, ids),
    clearSelection,
    clearSelectedIds: (ids: string[]) => clearSelectionForTab(selectionTab, ids),
    setSelectedSignup: (signup: Signup) => setSelectedSignup(signup),
    deleteSelected,
  };
}
