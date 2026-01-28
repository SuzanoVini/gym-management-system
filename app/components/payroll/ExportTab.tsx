'use client';

import { Calendar, Download, FileDown } from 'lucide-react';
import { useState } from 'react';
import type { PayrollPeriod } from '@/types';

interface ExportTabProps {
  periods: PayrollPeriod[];
  currentPeriod: PayrollPeriod | null;
  onExport: (periodId: string, format: 'csv') => Promise<void>;
  loading?: boolean;
}

export default function ExportTab({
  periods,
  currentPeriod,
  onExport,
  loading = false,
}: ExportTabProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(currentPeriod?.id || '');
  const [exportFormat, setExportFormat] = useState<'csv'>('csv');

  const handleExport = async () => {
    if (!selectedPeriodId) {
      alert('Please select a period to export');
      return;
    }

    await onExport(selectedPeriodId, exportFormat);
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="space-y-6">
      <div className="payroll-card">
        <h3 className="text-lg font-semibold mb-4">Export Payroll Data</h3>

        {/* Period Selector */}
        <div className="mb-6">
          <label htmlFor="period-select" className="form-label">
            Select Period to Export
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <select
              id="period-select"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="form-select pl-10 w-full"
              aria-label="Select period to export"
            >
              <option value="">Select a period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.period_label}
                  {period.is_current && ' (Current)'}
                  {period.is_closed && ' - Closed'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format Selector */}
        <div className="mb-6">
          <div className="form-label mb-2">Export Format</div>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value as 'csv')}
                className="rounded-full border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">CSV</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            CSV format is compatible with Excel and Google Sheets
          </p>
        </div>

        {/* Preview Card */}
        {selectedPeriod && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <FileDown className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Export Preview</h4>
                <div className="mt-2 space-y-1 text-sm text-blue-800">
                  <p>
                    <span className="font-medium">Period:</span> {selectedPeriod.period_label}
                  </p>
                  <p>
                    <span className="font-medium">Date Range:</span>{' '}
                    {new Date(selectedPeriod.start_date).toLocaleDateString()} -{' '}
                    {new Date(selectedPeriod.end_date).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    {selectedPeriod.is_closed ? 'Closed' : 'Open'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedPeriodId || loading}
            className="btn btn-primary"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {/* Export Information */}
      <div className="payroll-card">
        <h4 className="font-semibold text-gray-900 mb-3">Export Details</h4>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <p>The export will include all staff hours for the selected payroll period</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <p>
              CSV columns: Staff Name, Payroll ID, Regular Hours, Overtime Hours, Vacation Hours,
              Mat Cleaning Count, Total Hours
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <p>Files are automatically downloaded to your browser's default download location</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <p>
              Exported data can be imported into payroll processing software or spreadsheet
              applications
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="payroll-card bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-3">Tips</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Best Practice:</strong> Always export and backup data before closing a payroll
            period
          </p>
          <p>
            <strong>Verification:</strong> Review exported data in a spreadsheet before processing
            payroll
          </p>
          <p>
            <strong>Archive:</strong> Keep exported files organized by period for record-keeping
          </p>
        </div>
      </div>
    </div>
  );
}
