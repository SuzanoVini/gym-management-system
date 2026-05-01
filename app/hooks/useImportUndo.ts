const TTL_MS = 86_400_000; // 24 hours in milliseconds

type TabKey = 'intros' | 'signups' | 'cancellations' | 'holds';

interface StoredBatch {
  ids: string[];
  savedAt: number; // Date.now() in milliseconds
}

export interface ImportBatch {
  ids: string[];
  count: number; // derived from ids.length at read time
  savedAt: number;
}

const storageKey = (tab: TabKey) => `lastImport_${tab}`;

export function useImportUndo() {
  const saveImportBatch = (tab: TabKey, ids: string[]) => {
    try {
      const batch: StoredBatch = {
        ids,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey(tab), JSON.stringify(batch));
    } catch {
      // no-op: localStorage unavailable or quota exceeded
    }
  };

  const getImportBatch = (tab: TabKey): ImportBatch | null => {
    try {
      const raw = localStorage.getItem(storageKey(tab));
      if (!raw) {
        return null;
      }
      const batch: StoredBatch = JSON.parse(raw);
      if (Date.now() - batch.savedAt > TTL_MS) {
        localStorage.removeItem(storageKey(tab));
        return null;
      }
      return { ...batch, count: batch.ids.length };
    } catch {
      return null;
    }
  };

  const clearImportBatch = (tab: TabKey) => {
    try {
      localStorage.removeItem(storageKey(tab));
    } catch {
      // no-op
    }
  };

  return { saveImportBatch, getImportBatch, clearImportBatch };
}
