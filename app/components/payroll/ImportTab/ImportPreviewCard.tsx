import { FileText } from 'lucide-react';
import type { ImportPreview } from './useCsvFileImport';

export function ImportPreviewCard({
  preview,
  type,
}: {
  preview: ImportPreview;
  type: ImportPreview['type'];
}) {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-start space-x-3">
        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{preview.filename}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Type:{' '}
            <span className="font-medium">{type === 'staff' ? 'Staff CSV' : 'Hours CSV'}</span>
            {preview.detected && type === preview.type && (
              <span className="ml-2 text-xs text-green-700">(detected from the columns)</span>
            )}
            {!preview.detected && (
              <span className="ml-2 text-xs text-amber-700">
                (couldn&apos;t tell from the columns, check the type above)
              </span>
            )}
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
  );
}

export function CsvFormatInstructions() {
  return (
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
  );
}
