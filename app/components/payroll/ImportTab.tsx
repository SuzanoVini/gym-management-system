'use client';

import { AlertCircle, CheckCircle, FileText, Upload, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import type { StaffMember } from '@/types';

interface ImportTabProps {
  onImport: (file: File, type: 'staff' | 'hours') => Promise<void>;
  onQuickImport?: (staffId: string, textData: string) => Promise<void>;
  staff?: StaffMember[];
  loading?: boolean;
}

interface ImportPreview {
  filename: string;
  type: 'staff' | 'hours';
  rowCount: number;
  headers: string[];
}

export default function ImportTab({
  onImport,
  onQuickImport,
  staff = [],
  loading = false,
}: ImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<'staff' | 'hours'>('hours');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Quick text import state
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [quickImportText, setQuickImportText] = useState<string>('');
  const [quickImportLoading, setQuickImportLoading] = useState(false);
  const [quickImportError, setQuickImportError] = useState<string | null>(null);
  const [quickImportSuccess, setQuickImportSuccess] = useState<string | null>(null);

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

  // Filter only active staff
  const activeStaff = staff.filter((s) => s.is_active);

  return (
    <div className="space-y-6">
      {/* Quick Text Import Section */}
      {onQuickImport && (
        <div className="payroll-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold">Quick Text Import</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Import hours quickly using simple text format. Each line represents one entry.
          </p>

          {/* Staff Selector */}
          <div className="mb-4">
            <label htmlFor="staffSelect" className="form-label">
              Select Staff Member
            </label>
            <select
              id="staffSelect"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="form-input w-full"
              disabled={quickImportLoading}
            >
              <option value="">Choose a staff member...</option>
              {activeStaff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.full_name} ({staffMember.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Text Input */}
          <div className="mb-4">
            <label htmlFor="quickImport" className="form-label">
              Hours Data
            </label>
            <textarea
              id="quickImport"
              value={quickImportText}
              onChange={(e) => setQuickImportText(e.target.value)}
              className="form-input w-full font-mono text-sm"
              rows={8}
              placeholder="3 7am mat clean&#10;5 7am mat clean&#10;6 11am 1.5&#10;8 7pm mat clean&#10;13 10am 1.5&#10;15 6pm"
              disabled={quickImportLoading}
            />
          </div>

          {/* Format Guide */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">Format Guide:</p>
            <div className="space-y-1 text-xs text-blue-800">
              <p>
                <code className="bg-blue-100 px-1 py-0.5 rounded">Day Time [mat clean] [1.5]</code>
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
                <li>
                  <strong>mat clean</strong> - Adds 15 minutes (0.25 hours) to regular hours
                </li>
                <li>
                  <strong>1.5</strong> - Marks entry as 1 overtime hour
                </li>
                <li>Default is 1 regular hour per entry</li>
              </ul>
            </div>
          </div>

          {/* Error Message */}
          {quickImportError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Import Error</p>
                <p className="text-sm text-red-700 mt-1">{quickImportError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {quickImportSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Import Successful</p>
                <p className="text-sm text-green-700 mt-1">{quickImportSuccess}</p>
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleQuickImport}
              disabled={quickImportLoading || !selectedStaffId || !quickImportText.trim()}
              className="btn btn-primary"
            >
              {quickImportLoading ? 'Importing...' : 'Import Hours'}
            </button>
          </div>
        </div>
      )}

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
        {preview && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{preview.filename}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Type:{' '}
                  <span className="font-medium">
                    {preview.type === 'staff' ? 'Staff CSV' : 'Hours CSV'}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Rows: <span className="font-medium">{preview.rowCount}</span>
                </p>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Columns detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {preview.headers.map((header) => (
                      <span
                        key={header}
                        className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded"
                      >
                        {header}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
              onClick={handleImport}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Importing...' : `Import ${preview.rowCount} Records`}
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="payroll-card">
        <h4 className="font-semibold text-gray-900 mb-3">CSV Format Requirements</h4>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-700 mb-1">Staff CSV Format:</p>
            <code className="block p-2 bg-gray-100 rounded text-xs">
              Payroll ID, First Name, Last Name, Job Title, Department
            </code>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Hours CSV Format:</p>
            <code className="block p-2 bg-gray-100 rounded text-xs">
              Payroll ID, Date, Hours, Type, Notes
            </code>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: Duplicate entries will be automatically skipped during import.
          </p>
        </div>
      </div>
    </div>
  );
}
