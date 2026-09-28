import { useState } from 'react';

export function useQuickImport(
  onQuickImport: ((staffId: string, textData: string) => Promise<void>) | undefined
) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [quickImportText, setQuickImportText] = useState<string>('');
  const [quickImportLoading, setQuickImportLoading] = useState(false);
  const [quickImportError, setQuickImportError] = useState<string | null>(null);
  const [quickImportSuccess, setQuickImportSuccess] = useState<string | null>(null);

  const handleQuickImport = async () => {
    if (!onQuickImport) {
      setQuickImportError('Quick import is not available');
      return;
    }

    if (!selectedStaffId) {
      setQuickImportError('Please select a staff member');
      return;
    }

    if (!quickImportText.trim()) {
      setQuickImportError('Please enter import data');
      return;
    }

    setQuickImportLoading(true);
    setQuickImportError(null);
    setQuickImportSuccess(null);

    try {
      await onQuickImport(selectedStaffId, quickImportText);
      setQuickImportSuccess('Hours imported successfully');
      setQuickImportText('');
      setSelectedStaffId('');
    } catch (err) {
      setQuickImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setQuickImportLoading(false);
    }
  };

  return {
    selectedStaffId,
    setSelectedStaffId,
    quickImportText,
    setQuickImportText,
    quickImportLoading,
    quickImportError,
    quickImportSuccess,
    handleQuickImport,
  };
}
