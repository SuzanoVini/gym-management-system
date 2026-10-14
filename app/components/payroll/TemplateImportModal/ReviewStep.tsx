import { AlertCircle, AlertTriangle } from 'lucide-react';
import type { TemplateAnalysisResult } from '@/types';

export function ReviewStep({ analysis }: { analysis: TemplateAnalysisResult }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Template Analysis Complete</h3>
        <p className="text-sm text-gray-600">
          Review the detected columns and automatic field mappings
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">{analysis.headers.length}</div>
          <div className="text-sm text-blue-700">Columns Detected</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-900">{analysis.fieldMappings.length}</div>
          <div className="text-sm text-green-700">Auto-Mapped</div>
        </div>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{analysis.rowCount}</div>
          <div className="text-sm text-gray-700">Sample Rows</div>
        </div>
      </div>

      {/* Warnings */}
      {analysis.missingFields.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-900">Missing Required Fields</h4>
              <p className="text-sm text-red-700 mt-1">
                The following required fields were not found: {analysis.missingFields.join(', ')}
              </p>
              <p className="text-sm text-red-700 mt-1">
                You'll need to manually map these in the next step.
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis.unmappedColumns.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900">Unmapped Columns</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {analysis.unmappedColumns.length} column(s) could not be automatically mapped:
              </p>
              <p className="text-sm text-yellow-700 mt-1 font-mono">
                {analysis.unmappedColumns.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sample Data Preview */}
      <div>
        <h4 className="form-label">Sample Data Preview</h4>
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {analysis.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.sampleData.map((row, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Sample data rows have no unique ID
                <tr key={idx}>
                  {analysis.headers.map((header) => (
                    <td
                      key={`${idx}-${header}`}
                      className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                    >
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
