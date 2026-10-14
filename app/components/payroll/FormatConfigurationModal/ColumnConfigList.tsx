import { ArrowDown, ArrowUp } from 'lucide-react';
import type { CSVColumnConfig } from '@/types';

interface ColumnConfigListProps {
  columns: CSVColumnConfig[];
  onToggle: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onLabelChange: (index: number, newLabel: string) => void;
}

export function ColumnConfigList({
  columns,
  onToggle,
  onMove,
  onLabelChange,
}: ColumnConfigListProps) {
  return (
    <div>
      <h4 className="form-label">Column Configuration</h4>
      <p className="text-sm text-gray-500 mb-3">
        Enable/disable columns, reorder them, and customize headers
      </p>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {columns.map((column, index) => (
          <div
            key={column.key}
            className={`flex items-center space-x-2 p-3 border rounded-lg ${
              column.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            {/* Enable/Disable Checkbox */}
            <input
              type="checkbox"
              checked={column.enabled}
              onChange={() => onToggle(index)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />

            {/* Move Buttons */}
            <div className="flex flex-col space-y-1">
              <button
                type="button"
                onClick={() => onMove(index, 'up')}
                disabled={index === 0}
                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 'down')}
                disabled={index === columns.length - 1}
                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            {/* Column Label Input */}
            <div className="flex-1">
              <input
                type="text"
                value={column.label}
                onChange={(e) => onLabelChange(index, e.target.value)}
                className={`form-input w-full text-sm ${column.enabled ? '' : 'opacity-50'}`}
                disabled={!column.enabled}
              />
              <div className="text-xs text-gray-400 mt-0.5">{column.key}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
