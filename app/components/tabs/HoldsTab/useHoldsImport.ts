import { useCallback, useState } from 'react';
import { useImportUndo } from '@/hooks/useImportUndo';
import { type HoldCsvRecord, parseHoldsCSV } from '@/lib/csv';
import { logger } from '@/lib/logger';
import { deleteHoldsByIds, importHolds } from '@/lib/services/membership-tabs';
import type { Hold } from '@/types';

interface UseHoldsImportOptions {
  holds: Hold[];
  refresh: () => Promise<void>;
  openImportPreview: () => void;
  closeImportPreview: () => void;
}

function filterNewRecords(records: HoldCsvRecord[], holds: Hold[]): HoldCsvRecord[] {
  return records.filter((row) => {
    if (!row.name || !row.month) {
      return false;
    }
    const isDuplicate = holds.some(
      (hold) =>
        hold.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
        hold.month === row.month &&
        hold.start === row.start
    );
    return !isDuplicate;
  });
}

export function useHoldsImport({
  holds,
  refresh,
  openImportPreview,
  closeImportPreview,
}: UseHoldsImportOptions) {
  const [previewData, setPreviewData] = useState<HoldCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('holds'));

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setImportFile(file);
      parseHoldsCSV(
        file,
        (data) => {
          setPreviewData(data);
          openImportPreview();
        },
        importYear
      );
      event.target.value = '';
    },
    [importYear, openImportPreview]
  );

  const handleYearChange = useCallback(
    (year: number) => {
      setImportYear(year);
      if (importFile) {
        parseHoldsCSV(importFile, setPreviewData, year);
      }
    },
    [importFile]
  );

  const importRecords = useCallback(
    async (newRecords: HoldCsvRecord[], duplicateCount: number) => {
      const { data, error } = await importHolds(newRecords);
      if (error) {
        logger.error('Error bulk importing holds', 'HoldsTab', { error });
        alert(`Error importing: ${error.message}`);
        return;
      }

      const importedIds: string[] = (data ?? []).map((record: { id: string }) => record.id);
      saveImportBatch('holds', importedIds);
      setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
      await refresh();
      closeImportPreview();
      setPreviewData([]);
      setImportFile(null);
      alert(
        `Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
      );
    },
    [closeImportPreview, refresh, saveImportBatch]
  );

  const confirmImport = useCallback(async () => {
    if (previewData.length === 0) {
      alert('No data to import');
      return;
    }
    try {
      const newRecords = filterNewRecords(previewData, holds);
      const duplicateCount = previewData.length - newRecords.length;
      if (newRecords.length === 0) {
        alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
        closeImportPreview();
        setPreviewData([]);
        setImportFile(null);
        return;
      }
      await importRecords(newRecords, duplicateCount);
    } catch (error) {
      logger.error('Fatal error importing holds CSV', 'HoldsTab', { error });
      alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [closeImportPreview, holds, importRecords, previewData]);

  const undoImport = useCallback(async () => {
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
      const { error } = await deleteHoldsByIds(undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('holds');
      setUndoBatch(null);
      await refresh();
    } catch {
      alert('Failed to undo import. Please try again.');
    }
  }, [clearImportBatch, refresh, undoBatch]);

  const clearImportPreview = useCallback(() => {
    setImportFile(null);
    setPreviewData([]);
  }, []);

  return {
    previewData,
    importYear,
    undoBatch,
    handleFileChange,
    handleYearChange,
    confirmImport,
    undoImport,
    clearImportPreview,
  };
}
