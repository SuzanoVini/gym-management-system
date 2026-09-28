import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AVAILABLE_DB_FIELDS } from '@/lib/services/csv-template-analyzer';
import type { FieldMapping, TemplateAnalysisResult } from '@/types';

interface MappingStepProps {
  analysis: TemplateAnalysisResult;
  fieldMappings: FieldMapping[];
  mappedFields: Set<string>;
  unmappedCsvColumns: string[];
  onMappingChange: (csvColumn: string, newDbField: string) => void;
}

export function MappingStep({
  analysis,
  fieldMappings,
  mappedFields,
  unmappedCsvColumns,
  onMappingChange,
}: MappingStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Adjust Field Mappings</h3>
        <p className="text-sm text-gray-600">
          Review and customize how CSV columns map to database fields
        </p>
      </div>

      <div className="space-y-3">
        {analysis.headers.map((csvColumn) => {
          const currentMapping = fieldMappings.find((m) => m.csvColumn === csvColumn);
          const dbFieldInfo = currentMapping
            ? AVAILABLE_DB_FIELDS.find((f) => f.key === currentMapping.dbField)
            : null;
          const isRequired = dbFieldInfo?.required;

          return (
            <div
              key={csvColumn}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">CSV Column</div>
                  <div className="font-mono text-sm text-gray-900 p-2 bg-gray-50 rounded">
                    {csvColumn}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Map to Database Field
                    {isRequired && <span className="text-red-600 ml-1">*</span>}
                  </div>
                  <select
                    value={currentMapping?.dbField || ''}
                    onChange={(e) => onMappingChange(csvColumn, e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="">-- Not Mapped --</option>
                    {AVAILABLE_DB_FIELDS.map((field) => (
                      <option
                        key={field.key}
                        value={field.key}
                        disabled={
                          mappedFields.has(field.key) && currentMapping?.dbField !== field.key
                        }
                      >
                        {field.label}
                        {field.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {currentMapping?.suggested && (
                <div className="mt-2 text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Auto-mapped ({currentMapping.confidence} match)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unmapped Columns Warning */}
      {unmappedCsvColumns.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900">
                {unmappedCsvColumns.length} Unmapped Column(s)
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                These columns will not be included in the export format.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
