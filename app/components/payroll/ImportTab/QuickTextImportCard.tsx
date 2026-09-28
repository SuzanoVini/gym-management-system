import { AlertCircle, CheckCircle, Zap } from 'lucide-react';
import type { StaffMember } from '@/types';
import type { useQuickImport } from './useQuickImport';

interface QuickTextImportCardProps {
  activeStaff: StaffMember[];
  quickImport: ReturnType<typeof useQuickImport>;
}

export function QuickTextImportCard({ activeStaff, quickImport }: QuickTextImportCardProps) {
  const {
    selectedStaffId,
    setSelectedStaffId,
    quickImportText,
    setQuickImportText,
    quickImportLoading,
    quickImportError,
    quickImportSuccess,
    handleQuickImport,
  } = quickImport;

  return (
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
          onClick={() => {
            void handleQuickImport();
          }}
          disabled={quickImportLoading || !selectedStaffId || !quickImportText.trim()}
          className="btn btn-primary"
        >
          {quickImportLoading ? 'Importing...' : 'Import Hours'}
        </button>
      </div>
    </div>
  );
}
