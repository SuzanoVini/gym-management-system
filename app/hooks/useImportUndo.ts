const TTL_MS = 86_400_000; // 24 hours in milliseconds

type TabKey = 'intros' | 'signups' | 'cancellations' | 'holds';

interface ImportBatch {
  ids: string[];
  count: number;
  savedAt: number; // Date.now() in milliseconds
}

const storageKey = (tab: TabKey) => `lastImport_${tab}`;

export function useImportUndo() {
  const saveImportBatch = (tab: TabKey, ids: string[]) => {
    const batch: ImportBatch = {
      ids,
      count: ids.length, // derived from ids — equals newRecords.length because .select('id') returns exactly inserted rows
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(tab), JSON.stringify(batch));
  };

  const getImportBatch = (tab: TabKey): ImportBatch | null => {
    try {
      const raw = localStorage.getItem(storageKey(tab));
      if (!raw) {
        return null;
      }
      const batch: ImportBatch = JSON.parse(raw);
      if (Date.now() - batch.savedAt > TTL_MS) {
        localStorage.removeItem(storageKey(tab));
        return null;
      }
      return batch;
    } catch {
      return null;
    }
  };

  const clearImportBatch = (tab: TabKey) => {
    localStorage.removeItem(storageKey(tab));
  };

  return { saveImportBatch, getImportBatch, clearImportBatch };
}
