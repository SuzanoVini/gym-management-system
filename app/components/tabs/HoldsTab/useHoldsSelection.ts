import { useSelectionStore } from '@/store/useSelectionStore';

const SELECTION_TAB = 'holds' as const;

export function useHoldsSelection() {
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[SELECTION_TAB]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const setSelectedHold = useSelectionStore((state) => state.setSelectedHold);
  return {
    selectionTab: SELECTION_TAB,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectedHold,
  };
}
