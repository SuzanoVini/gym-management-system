import { Plus, RotateCcw, Settings, Upload } from 'lucide-react';
import type { useIntroCsvImport } from '@/hooks/useIntroCsvImport';
import type { useUIStore } from '@/store/useUIStore';

export default function IntrosHeader({
  year,
  csvImport,
  openModal,
}: {
  year: string | number;
  csvImport: ReturnType<typeof useIntroCsvImport>;
  openModal: ReturnType<typeof useUIStore.getState>['openModal'];
}) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">{year === 'all' ? 'All Intros' : `${year} Intros`}</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openModal('settings')} className="btn btn-secondary">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={csvImport.fileInputRef}
            onChange={(e) => {
              void csvImport.handleCSVImport(e);
            }}
          />
          <button
            type="button"
            onClick={() => csvImport.fileInputRef.current?.click()}
            className="btn btn-secondary-blue"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          {csvImport.undoBatch && (
            <button
              type="button"
              onClick={() => {
                void csvImport.handleUndoImport();
              }}
              className="btn btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo Import ({csvImport.undoBatch.count})</span>
            </button>
          )}
          <button type="button" onClick={() => openModal('addIntro')} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Intro</span>
          </button>
        </div>
      </div>
    </div>
  );
}
