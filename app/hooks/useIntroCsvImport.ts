import { type Dispatch, type SetStateAction, useRef, useState } from 'react';
import { type ImportBatch, useImportUndo } from '@/hooks/useImportUndo';
import { type IntroCsvRecord, parseIntrosCSV } from '@/lib/csv';
import { reportConsoleError } from '@/lib/logger';
import { buildSpamContacts, detectSpamSignals } from '@/lib/spam/detectSpamSignals';
import { fetchSpamIntros } from '@/lib/supabase/intros';
import { deleteIntroIds, insertIntroImport } from '@/lib/supabase/introTableActions';
import type { useUIStore } from '@/store/useUIStore';
import type { Intro } from '@/types';

type ModalActions = Pick<ReturnType<typeof useUIStore.getState>, 'openModal' | 'closeModal'>;
type ImportOptions = ModalActions & { intros: Intro[]; refresh: () => Promise<void> };
interface ConfirmImportOptions extends Pick<ImportOptions, 'intros' | 'refresh' | 'closeModal'> {
  importPreviewData: IntroCsvRecord[];
  setImportPreviewData: Dispatch<SetStateAction<IntroCsvRecord[]>>;
  saveImportBatch: ReturnType<typeof useImportUndo>['saveImportBatch'];
  setUndoBatch: Dispatch<SetStateAction<ImportBatch | null>>;
}

export function useIntroCsvImport({ intros, refresh, openModal, closeModal }: ImportOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<IntroCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('intros'));

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFile(file);
    parseIntrosCSV(
      file,
      (data) => {
        setImportPreviewData(data);
        openModal('importPreview');
      },
      importYear
    );
    event.target.value = '';
  };

  const handleImportYearChange = (year: number) => {
    setImportYear(year);
    if (importFile) {
      parseIntrosCSV(importFile, setImportPreviewData, year);
    }
  };

  const confirmCSVImport = () =>
    confirmImport({
      importPreviewData,
      intros,
      closeModal,
      setImportPreviewData,
      saveImportBatch,
      setUndoBatch,
      refresh,
    });

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
      const { error } = await deleteIntroIds(undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('intros');
      setUndoBatch(null);
      await refresh();
    } catch {
      // Preserve localStorage so user can retry
      alert('Failed to undo import. Please try again.');
    }
  };

  return {
    fileInputRef,
    importPreviewData,
    setImportPreviewData,
    setImportFile,
    importYear,
    undoBatch,
    handleCSVImport,
    handleImportYearChange,
    confirmCSVImport,
    handleUndoImport,
  };
}

async function finishImport(
  importedIds: string[],
  importedCount: number,
  duplicateCount: number,
  {
    saveImportBatch,
    setUndoBatch,
    refresh,
    closeModal,
    setImportPreviewData,
  }: Pick<
    ConfirmImportOptions,
    'saveImportBatch' | 'setUndoBatch' | 'refresh' | 'closeModal' | 'setImportPreviewData'
  >
) {
  saveImportBatch('intros', importedIds);
  setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
  await refresh();
  closeModal('importPreview');
  setImportPreviewData([]);
  alert(
    `Successfully imported ${importedCount} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
  );
}

// Drops rows that duplicate a known intro, then scores the rest for spam.
async function selectNewRecords(importPreviewData: IntroCsvRecord[], intros: Intro[]) {
  // Spam rows are hidden from `intros` but must still block re-import.
  const spamIntros = await fetchSpamIntros();
  const knownIntros = [...intros, ...spamIntros];
  const spamContacts = buildSpamContacts(spamIntros);
  return (
    importPreviewData
      .filter((row) => {
        if (!row.name || !row.month) {
          return false;
        }
        return !knownIntros.some(
          (i) =>
            i.name.toLowerCase().trim() === row.name.toLowerCase().trim() && i.month === row.month
        );
      })
      // Coerce date: string|undefined → string|null to satisfy DB Insert type
      .map((r) => ({
        ...r,
        date: r.date ?? null,
        spam_signals: detectSpamSignals(
          { name: r.name, email: r.email, phone: r.phone },
          spamContacts
        ),
      }))
  );
}

async function confirmImport({
  importPreviewData,
  intros,
  closeModal,
  setImportPreviewData,
  saveImportBatch,
  setUndoBatch,
  refresh,
}: ConfirmImportOptions) {
  if (!importPreviewData || importPreviewData.length === 0) {
    alert('No data to import');
    return;
  }

  try {
    const newRecords = await selectNewRecords(importPreviewData, intros);
    const duplicateCount = importPreviewData.length - newRecords.length;

    if (newRecords.length === 0) {
      alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
      closeModal('importPreview');
      setImportPreviewData([]);
      return;
    }

    const { data, error } = await insertIntroImport(newRecords);

    if (error) {
      reportConsoleError('Error bulk importing:', error);
      alert(`Error importing: ${error.message}`);
    } else {
      const importedIds = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
      await finishImport(importedIds, newRecords.length, duplicateCount, {
        saveImportBatch,
        setUndoBatch,
        refresh,
        closeModal,
        setImportPreviewData,
      });
    }
  } catch (error) {
    reportConsoleError('Fatal error importing CSV:', error);
    alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
