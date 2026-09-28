import { useState } from 'react';
import { useImportUndo } from '@/hooks/useImportUndo';
import { parseSignupsCSV, type SignupCsvRecord } from '@/lib/csv';
import { logger } from '@/lib/logger';
import { deleteSignupsByIds, importSignups } from '@/lib/services/membership-tabs';
import { markMostRecentIntroAsSignedUp } from '@/lib/supabase/intros';
import type { Signup } from '@/types';
import { filterNewSignupRecords } from './signupImportRecords';

interface SignupImportOptions {
  signups: Signup[];
  refresh: () => Promise<void>;
  openPreview: () => void;
  closePreview: () => void;
}

async function syncSignupIntros(records: SignupCsvRecord[]) {
  for (const record of records) {
    if (record.name) {
      await markMostRecentIntroAsSignedUp(record.name).catch(() => {
        // Sync failure does not block import
      });
    }
  }
}

export function useSignupImport({
  signups,
  refresh,
  openPreview,
  closePreview,
}: SignupImportOptions) {
  const [previewData, setPreviewData] = useState<SignupCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('signups'));

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFile(file);
    parseSignupsCSV(
      file,
      (data) => {
        setPreviewData(data);
        openPreview();
      },
      importYear
    );
    event.target.value = '';
  };

  const handleImportYearChange = (year: number) => {
    setImportYear(year);
    if (importFile) {
      parseSignupsCSV(importFile, setPreviewData, year);
    }
  };

  const closeImport = () => {
    setImportFile(null);
    setPreviewData([]);
  };

  const confirmCSVImport = async () => {
    if (previewData.length === 0) {
      alert('No data to import');
      return;
    }
    try {
      await importPreviewRecords({
        previewData,
        signups,
        importYear,
        saveImportBatch,
        setUndoBatch,
        refresh,
        closePreview,
        closeImport,
      });
    } catch (error) {
      logger.error('Fatal error importing sign-ups CSV', 'SignupsTab', { error });
      alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
      const { error } = await deleteSignupsByIds(undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('signups');
      setUndoBatch(null);
      await refresh();
    } catch {
      alert('Failed to undo import. Please try again.');
    }
  };

  return {
    previewData,
    importYear,
    undoBatch,
    handleCSVImport,
    handleImportYearChange,
    closeImport,
    confirmCSVImport,
    handleUndoImport,
  };
}

interface ImportPreviewRecordsOptions {
  previewData: SignupCsvRecord[];
  signups: Signup[];
  importYear: number;
  saveImportBatch: (tab: 'signups', ids: string[]) => void;
  setUndoBatch: (batch: { ids: string[]; count: number; savedAt: number } | null) => void;
  refresh: () => Promise<void>;
  closePreview: () => void;
  closeImport: () => void;
}

async function importPreviewRecords({
  previewData,
  signups,
  importYear,
  saveImportBatch,
  setUndoBatch,
  refresh,
  closePreview,
  closeImport,
}: ImportPreviewRecordsOptions) {
  const newRecords = filterNewSignupRecords(previewData, signups, importYear);
  const duplicateCount = previewData.length - newRecords.length;
  if (newRecords.length === 0) {
    alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
    closePreview();
    closeImport();
    return;
  }

  const { data, error } = await importSignups(newRecords);
  if (error) {
    logger.error('Error bulk importing sign-ups', 'SignupsTab', { error });
    alert(`Error importing: ${error.message}`);
    return;
  }

  await finishSignupImport({
    data,
    newRecords,
    duplicateCount,
    saveImportBatch,
    setUndoBatch,
    refresh,
    closePreview,
    closeImport,
  });
}

interface FinishSignupImportOptions {
  data: { id: string }[] | null;
  newRecords: SignupCsvRecord[];
  duplicateCount: number;
  saveImportBatch: (tab: 'signups', ids: string[]) => void;
  setUndoBatch: (batch: { ids: string[]; count: number; savedAt: number } | null) => void;
  refresh: () => Promise<void>;
  closePreview: () => void;
  closeImport: () => void;
}

async function finishSignupImport({
  data,
  newRecords,
  duplicateCount,
  saveImportBatch,
  setUndoBatch,
  refresh,
  closePreview,
  closeImport,
}: FinishSignupImportOptions) {
  const importedIds = (data ?? []).map((record) => record.id);
  saveImportBatch('signups', importedIds);
  setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
  await refresh();
  await syncSignupIntros(newRecords);
  closePreview();
  closeImport();
  alert(
    `✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
  );
}
