import { useRef, useState } from 'react';

export interface ImportPreview {
  filename: string;
  type: 'staff' | 'hours';
  rowCount: number;
  headers: string[];
}

export function useCsvFileImport(onImport: (file: File, type: 'staff' | 'hours') => Promise<void>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<'staff' | 'hours'>('hours');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Read file for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) {
        setError('Failed to read file');
        return;
      }
      const text = e.target.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length === 0) {
        setError('File is empty');
        return;
      }
      const firstLine = lines[0];
      if (!firstLine) {
        setError('Invalid CSV format');
        return;
      }
      const headers = firstLine.split(',').map((h) => h.trim());

      setPreview({
        filename: file.name,
        type: fileType,
        rowCount: lines.length - 1,
        headers,
      });
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleImport = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('No file selected');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await onImport(fileInputRef.current.files[0], fileType);
      setSuccess(`Successfully imported ${preview?.rowCount} records`);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return {
    fileInputRef,
    fileType,
    setFileType,
    preview,
    error,
    success,
    isDragging,
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleImport,
  };
}
