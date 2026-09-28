import { useRef, useState } from 'react';
import { useImportUndo } from '@/hooks/useImportUndo';
import { type CancellationCsvRecord, parseCancellationsCSV } from '@/lib/csv';
import { logger } from '@/lib/logger';
import { deleteCancellationsByIds, importCancellations } from '@/lib/services/membership-tabs';
import { closeActiveHold } from '@/lib/supabase/holds';
import type { Cancellation } from '@/types';

interface Options {
  cancellations: Cancellation[];
  refresh: () => Promise<void>;
  openImportPreview: () => void;
  closeImportPreview: () => void;
}

interface ImportActions {
  setImportPreviewData: (records: CancellationCsvRecord[]) => void;
  setImportFile: (file: File | null) => void;
  setUndoBatch: (batch: { ids: string[]; count: number; savedAt: number } | null) => void;
  saveImportBatch: (tab: 'cancellations', ids: string[]) => void;
  closeImportPreview: () => void;
  refresh: () => Promise<void>;
}

async function syncCancellationHolds(records: CancellationCsvRecord[]) {
  for (const record of records) {
    if (record.name && record.date) {
      await closeActiveHold(record.name, record.date).catch(() => {
        // Sync failure does not block import
      });
    }
  }
}

function resetImport(actions: ImportActions) {
  actions.closeImportPreview();
  actions.setImportPreviewData([]);
  actions.setImportFile(null);
}

function findNewCancellations(
  imported: CancellationCsvRecord[],
  existing: Cancellation[]
): { records: CancellationCsvRecord[]; duplicateCount: number } {
  const records = imported.filter((row) => {
    if (!row.name || !row.month) {
      return false;
    }
    return !existing.some(
      (c) =>
        c.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
        c.month === row.month &&
        c.date === row.date
    );
  });
  return { records, duplicateCount: imported.length - records.length };
}

async function finishImport(
  records: CancellationCsvRecord[],
  duplicateCount: number,
  data: unknown,
  actions: ImportActions
) {
  const importedIds = ((data as { id: string }[] | null) ?? []).map((record) => record.id);
  actions.saveImportBatch('cancellations', importedIds);
  actions.setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
  await actions.refresh();
  await syncCancellationHolds(records);
  resetImport(actions);
  alert(
    `✅ Successfully imported ${records.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
  );
}

async function confirmImport(
  importPreviewData: CancellationCsvRecord[],
  cancellations: Cancellation[],
  actions: ImportActions
) {
  if (importPreviewData.length === 0) {
    alert('No data to import');
    return;
  }

  try {
    const { records, duplicateCount } = findNewCancellations(importPreviewData, cancellations);
    if (records.length === 0) {
      alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
      resetImport(actions);
      return;
    }

    const { data, error } = await importCancellations(records);
    if (error) {
      logger.error('Error bulk importing cancellations', 'CancellationsTab', { error });
      alert(`Error importing: ${error.message}`);
      return;
    }
    await finishImport(records, duplicateCount, data, actions);
  } catch (error) {
    logger.error('Fatal error importing cancellations CSV', 'CancellationsTab', { error });
    alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // setLoading(false);
  }
}

export function useCancellationImports({
  cancellations,
  refresh,
  openImportPreview,
  closeImportPreview,
}: Options) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<CancellationCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('cancellations'));
  const actions: ImportActions = {
    setImportPreviewData,
    setImportFile,
    setUndoBatch,
    saveImportBatch,
    closeImportPreview,
    refresh,
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFile(file);
    parseCancellationsCSV(
      file,
      (data) => {
        setImportPreviewData(data);
        openImportPreview();
      },
      importYear
    );
    event.target.value = '';
  };

  const handleImportYearChange = (year: number) => {
    setImportYear(year);
    if (importFile) {
      parseCancellationsCSV(importFile, setImportPreviewData, year);
    }
  };

  const confirmCSVImport = () => confirmImport(importPreviewData, cancellations, actions);

  const handleUndoImport = async () => {
    if (!undoBatch) {
      return;
    }
    if (
      !confirm(
        `Delete the ${undoBatch.count} records from the last import? This is permanent and cannot be reversed.`
      )
    ) {
      return;
    }
    try {
      const { error } = await deleteCancellationsByIds(undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('cancellations');
      setUndoBatch(null);
      await refresh();
    } catch {
      alert('Failed to undo import. Please try again.');
    }
  };

  return {
    fileInputRef,
    importPreviewData,
    importYear,
    undoBatch,
    setImportFile,
    setImportPreviewData,
    handleCSVImport,
    handleImportYearChange,
    confirmCSVImport,
    handleUndoImport,
  };
}
