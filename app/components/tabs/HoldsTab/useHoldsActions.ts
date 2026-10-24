import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { deleteHoldsByIds } from '@/lib/services/membership-tabs';

interface UseHoldsActionsOptions {
  refresh: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  selectedIds: Set<string>;
  clearSelection: (tab: 'holds') => void;
}

async function deleteHoldBatches(ids: string[]): Promise<void> {
  const batchSize = 50;
  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const { error } = await deleteHoldsByIds(batch);
    if (error) {
      throw error;
    }
  }
}

export function useHoldsActions({
  refresh,
  setCurrentPage,
  selectedIds,
  clearSelection,
}: UseHoldsActionsOptions) {
  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) {
      alert('Please select holds to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected holds?`)) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedIds);
      await deleteHoldBatches(idsToDelete);
      await refresh();
      clearSelection('holds');
      setCurrentPage(1);
      alert(`Deleted ${idsToDelete.length} holds`);
    } catch (error) {
      logger.error('Error deleting holds', 'HoldsTab', { error });
      alert('Error deleting holds');
    }
  }, [clearSelection, refresh, selectedIds, setCurrentPage]);

  return { deleteSelected };
}
