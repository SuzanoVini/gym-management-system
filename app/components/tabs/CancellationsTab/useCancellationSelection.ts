import { logger } from '@/lib/logger';
import { deleteCancellationsByIds } from '@/lib/services/membership-tabs';

interface Options {
  selectedIds: Set<string>;
  refresh: () => Promise<void>;
  clearSelection: (tab: 'cancellations') => void;
  setCurrentPage: (page: number) => void;
}

function getSelectedCancellationIds(selectedIds: Set<string>): string[] | null {
  if (selectedIds.size === 0) {
    alert('Please select cancellations to delete');
    return null;
  }
  if (selectedIds.size > 1000) {
    alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
    return null;
  }
  if (!confirm(`Delete ${selectedIds.size} selected cancellations?`)) {
    return null;
  }
  return Array.from(selectedIds);
}

async function deleteSelectedCancellations({
  selectedIds,
  refresh,
  clearSelection,
  setCurrentPage,
}: Options) {
  const idsToDelete = getSelectedCancellationIds(selectedIds);
  if (!idsToDelete) {
    return;
  }

  try {
    const batchSize = 50;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error } = await deleteCancellationsByIds(batch);
      if (error) {
        throw error;
      }
    }
    await refresh();
    clearSelection('cancellations');
    setCurrentPage(1);
    alert(`✅ Deleted ${idsToDelete.length} cancellations`);
  } catch (error) {
    logger.error('Error deleting cancellations', 'CancellationsTab', { error });
    alert('Error deleting cancellations');
  } finally {
    // setLoading(false);
  }
}

export function useCancellationSelection(options: Options) {
  return { handleDeleteSelected: () => deleteSelectedCancellations(options) };
}
