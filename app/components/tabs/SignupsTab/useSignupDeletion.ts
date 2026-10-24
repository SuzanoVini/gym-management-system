import { logger } from '@/lib/logger';
import { deleteSignupsByIds } from '@/lib/services/membership-tabs';

interface SignupDeletionOptions {
  selectedIds: Set<string>;
  refresh: () => Promise<void>;
  clearSelection: () => void;
  setCurrentPage: (page: number) => void;
}

function confirmSelectedSignupDeletion(selectedIds: Set<string>) {
  if (selectedIds.size === 0) {
    alert('Please select sign-ups to delete');
    return false;
  }
  if (selectedIds.size > 1000) {
    alert('Maximum 1000 items at once. Please select fewer items.');
    return false;
  }
  return confirm(`Delete ${selectedIds.size} selected sign-ups?`);
}

export function useSignupDeletion({
  selectedIds,
  refresh,
  clearSelection,
  setCurrentPage,
}: SignupDeletionOptions) {
  return async function handleDeleteSelected() {
    if (!confirmSelectedSignupDeletion(selectedIds)) {
      return;
    }

    try {
      await deleteSignupBatches(Array.from(selectedIds), refresh, clearSelection, setCurrentPage);
    } catch (error) {
      logger.error('Error deleting sign-ups', 'SignupsTab', { error });
      alert('Error deleting sign-ups');
    }
  };
}

async function deleteSignupBatches(
  idsToDelete: string[],
  refresh: () => Promise<void>,
  clearSelection: () => void,
  setCurrentPage: (page: number) => void
) {
  const batchSize = 50;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error } = await deleteSignupsByIds(batch);
    if (error) {
      throw error;
    }
  }
  await refresh();
  clearSelection();
  setCurrentPage(1);
  alert(`Deleted ${idsToDelete.length} sign-ups`);
}
