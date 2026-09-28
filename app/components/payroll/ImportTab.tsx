'use client';

import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import type { StaffMember } from '@/types';
import { CsvFormatInstructions, ImportPreviewCard } from './ImportTab/ImportPreviewCard';
import { QuickTextImportCard } from './ImportTab/QuickTextImportCard';
import { useCsvFileImport } from './ImportTab/useCsvFileImport';
import { useQuickImport } from './ImportTab/useQuickImport';

interface ImportTabProps {
  onImport: (file: File, type: 'staff' | 'hours') => Promise<void>;
  onQuickImport?: (staffId: string, textData: string) => Promise<void>;
  staff?: StaffMember[];
  loading?: boolean;
}

export default function ImportTab({
  onImport,
  onQuickImport,
  staff = [],
  loading = false,
}: ImportTabProps) {
  const {
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
  } = useCsvFileImport(onImport);

  // Quick text import state
  const quickImport = useQuickImport(onQuickImport);

  // Filter only active staff
  const activeStaff = staff.filter((s) => s.is_active);

  return (
    <div className="space-y-6">
      {/* Quick Text Import Section */}
      {onQuickImport && <QuickTextImportCard activeStaff={activeStaff} quickImport={quickImport} />}

      <div className="payroll-card">
        <h3 className="text-lg font-semibold mb-4">Import CSV Data</h3>

        {/* File Type Selector */}
        <div className="mb-6">
          <div className="form-label mb-2">Import Type</div>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="fileType"
                value="staff"
                checked={fileType === 'staff'}
                onChange={(e) => setFileType(e.target.value as 'staff' | 'hours')}
                className="rounded-full border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Staff CSV</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="fileType"
                value="hours"
                checked={fileType === 'hours'}
                onChange={(e) => setFileType(e.target.value as 'staff' | 'hours')}
                className="rounded-full border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Hours CSV</span>
            </label>
          </div>
        </div>

        {/* Upload Area */}
        {/* biome-ignore lint/a11y/useSemanticElements: Drag-and-drop zone requires div for proper event handling */}
        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">Drag and drop your CSV file here, or</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload CSV file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="btn btn-secondary"
          >
            Browse Files
          </button>
          <p className="text-xs text-gray-500 mt-2">CSV files only</p>
        </div>

        {/* Preview */}
        {preview && <ImportPreviewCard preview={preview} />}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Import Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Import Successful</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Import Button */}
        {preview && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void handleImport();
              }}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Importing...' : `Import ${preview.rowCount} Records`}
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <CsvFormatInstructions />
    </div>
  );
}
