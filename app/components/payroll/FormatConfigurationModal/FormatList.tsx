import { Check, Plus } from 'lucide-react';
import type { CSVExportFormat } from '@/types';

interface FormatListProps {
  formats: CSVExportFormat[];
  selectedFormatId: string | null;
  loading: boolean;
  onCreateNew: () => void;
  onSelectFormat: (formatId: string) => void;
}

export function FormatList({
  formats,
  selectedFormatId,
  loading,
  onCreateNew,
  onSelectFormat,
}: FormatListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Saved Formats</h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="btn btn-sm btn-primary"
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      <div className="space-y-2">
        {formats.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => onSelectFormat(format.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedFormatId === format.id
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{format.format_name}</div>
                {format.is_default && <div className="text-xs text-red-600 mt-1">Default</div>}
              </div>
              {selectedFormatId === format.id && (
                <Check className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
