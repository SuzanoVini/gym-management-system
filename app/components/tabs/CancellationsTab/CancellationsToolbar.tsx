import { Download, Plus, RotateCcw, Settings, Upload } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';

interface Props {
  year: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  undoCount: number | null;
  onOpenSettings: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onUndoImport: () => void;
  onExport: () => void;
  onAdd: () => void;
}

export default function CancellationsToolbar({
  year,
  fileInputRef,
  undoCount,
  onOpenSettings,
  onImport,
  onUndoImport,
  onExport,
  onAdd,
}: Props) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">
          {year === 'all' ? 'All Cancellations' : `${year} Cancellations`}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenSettings} className="btn btn-secondary">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={onImport}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary-blue"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          {undoCount !== null && (
            <button type="button" onClick={onUndoImport} className="btn btn-secondary">
              <RotateCcw className="w-4 h-4" />
              <span>Undo Import ({undoCount})</span>
            </button>
          )}
          <button type="button" onClick={onExport} className="btn btn-primary">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button type="button" onClick={onAdd} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Cancellation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
