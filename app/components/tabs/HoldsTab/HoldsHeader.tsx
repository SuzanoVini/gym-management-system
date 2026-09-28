import { Download, Plus, RotateCcw, Settings, Upload } from 'lucide-react';

interface UndoBatch {
  count: number;
}

interface HoldsHeaderProps {
  year: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  undoBatch: UndoBatch | null;
  onOpenSettings: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUndoImport: () => Promise<void>;
  onExport: () => void;
  onAddHold: () => void;
}

export default function HoldsHeader({
  year,
  fileInputRef,
  undoBatch,
  onOpenSettings,
  onFileChange,
  onUndoImport,
  onExport,
  onAddHold,
}: HoldsHeaderProps) {
  return (
    <div className="section-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{year === 'all' ? 'All Holds' : `${year} Holds`}</h2>
        <div className="flex space-x-3">
          <button type="button" onClick={onOpenSettings} className="btn btn-secondary">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary-blue"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          {undoBatch && (
            <button
              type="button"
              onClick={() => {
                void onUndoImport();
              }}
              className="btn btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo Import ({undoBatch.count})</span>
            </button>
          )}
          <button type="button" onClick={onExport} className="btn btn-primary">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button type="button" onClick={onAddHold} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Hold</span>
          </button>
        </div>
      </div>
    </div>
  );
}
