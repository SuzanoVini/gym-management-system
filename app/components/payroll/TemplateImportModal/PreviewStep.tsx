import { CheckCircle2 } from 'lucide-react';
import { AVAILABLE_DB_FIELDS } from '@/lib/services/csv-template-analyzer';
import type { FieldMapping } from '@/types';

export function PreviewStep({
  templateName,
  fieldMappings,
}: {
  templateName: string;
  fieldMappings: FieldMapping[];
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Export Format</h3>
        <p className="text-sm text-gray-600">
          Review your new export format configuration before saving
        </p>
      </div>

      {/* Format Name */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-1">Format Name</h4>
        <p className="text-blue-800">{templateName}</p>
      </div>

      {/* Column Configuration */}
      <div>
        <h4 className="form-label">Column Configuration</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Column Header
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Database Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fieldMappings.map((mapping, index) => {
                const fieldInfo = AVAILABLE_DB_FIELDS.find((f) => f.key === mapping.dbField);
                return (
                  <tr key={mapping.csvColumn}>
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {mapping.csvColumn}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {fieldInfo?.label || mapping.dbField}
                      {fieldInfo?.required && <span className="text-red-600 ml-1">*</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Enabled
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
