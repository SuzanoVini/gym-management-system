import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { HoldCsvRecord } from '@/lib/csv';
import { updateSettings } from '@/lib/supabase/settings';
import { useSelectionStore } from '@/store/useSelectionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import type { HoldFormData } from '@/types';
import { HoldForm } from '../forms/HoldForm';

const HoldModalIcons = {
  X,
  Plus,
  Edit2,
  Trash2,
};

interface HoldModalsProps {
  importPreviewData: HoldCsvRecord[];
  confirmCSVImport: () => Promise<void>;
  importYear: number;
  onImportYearChange: (year: number) => void;
  onImportClose: () => void;
  addHold: (hold: HoldFormData) => Promise<void>;
  editHold: (id: string, updates: Partial<HoldFormData>) => Promise<void>;
}

export function HoldModals({
  importPreviewData,
  confirmCSVImport,
  importYear,
  onImportYearChange,
  onImportClose,
  addHold,
  editHold,
}: HoldModalsProps) {
  const { modals, closeModal } = useUIStore();
  const { selectedHold, setSelectedHold } = useSelectionStore();
  const holdReasons = useSettingsStore((s) => s.holdReasons);
  const refreshSettings = useSettingsStore((s) => s.refresh);

  const [newReason, setNewReason] = useState('');
  const [editingReasonIndex, setEditingReasonIndex] = useState<number | null>(null);

  const handleAddReason = async () => {
    if (newReason.trim() && !holdReasons.includes(newReason.trim())) {
      const updated = [...holdReasons, newReason.trim()].sort();
      try {
        await updateSettings('hold_reasons', updated);
        await refreshSettings();
        setNewReason('');
      } catch (error) {
        console.error('Error saving reason:', error);
        alert('Failed to save reason');
      }
    }
  };

  const handleDeleteReason = async (index: number) => {
    if (confirm('Are you sure you want to delete this reason?')) {
      const updated = holdReasons.filter((_, i) => i !== index);
      try {
        await updateSettings('hold_reasons', updated);
        await refreshSettings();
      } catch (error) {
        console.error('Error deleting reason:', error);
        alert('Failed to delete reason');
      }
    }
  };

  const handleUpdateReason = async (index: number, newValue: string) => {
    const updated = [...holdReasons];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    try {
      await updateSettings('hold_reasons', sorted);
      await refreshSettings();
      setEditingReasonIndex(null);
    } catch (error) {
      console.error('Error updating reason:', error);
      alert('Failed to update reason');
    }
  };

  return (
    <>
      <Modal isOpen={modals.addHold} onClose={() => closeModal('addHold')} title="Add New Hold">
        <HoldForm
          onSubmit={async (data) => {
            await addHold(data);
            closeModal('addHold');
          }}
          onCancel={() => closeModal('addHold')}
          holdReasons={holdReasons}
        />
      </Modal>
      <Modal isOpen={modals.editHold} onClose={() => closeModal('editHold')} title="Edit Hold">
        <HoldForm
          hold={selectedHold}
          onSubmit={async (data) => {
            if (!selectedHold) {
              return;
            }
            await editHold(selectedHold.id, data);
            closeModal('editHold');
            setSelectedHold(null);
          }}
          onCancel={() => {
            closeModal('editHold');
            setSelectedHold(null);
          }}
          holdReasons={holdReasons}
        />
      </Modal>
      <Modal
        isOpen={modals.importPreview}
        onClose={() => {
          closeModal('importPreview');
          onImportClose();
        }}
        title="Confirm CSV Import"
        size="xl"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            Preview of data to be imported. Duplicates will be automatically skipped.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="hold-import-year"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Year
            </label>
            <input
              id="hold-import-year"
              type="number"
              min={2000}
              max={2100}
              value={importYear}
              onChange={(e) => onImportYearChange(Number(e.target.value))}
              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="border rounded overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Start</th>
                <th className="px-4 py-2 text-left">End</th>
                <th className="px-4 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {importPreviewData.map((row, idx) => (
                <tr key={`${row.name}-${row.month}-${row.start ?? ''}`}>
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{row.month}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2">{row.start || '-'}</td>
                  <td className="px-4 py-2">{row.end || '-'}</td>
                  <td className="px-4 py-2">{row.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              closeModal('importPreview');
              onImportClose();
            }}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmCSVImport}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Confirm Import
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        title="Manage Hold Reasons"
        size="lg"
      >
        <div>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="hold-new-reason"
            >
              Add New Reason
            </label>
            <div className="flex gap-2">
              <input
                id="hold-new-reason"
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddReason()}
                placeholder="Enter hold reason"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={handleAddReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <HoldModalIcons.Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700 mb-3">
              Current Reasons ({holdReasons.length})
            </h4>
            {holdReasons.map((reason, index) => (
              <div
                key={reason}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                {editingReasonIndex === index ? (
                  <input
                    type="text"
                    defaultValue={reason}
                    onBlur={(e) => handleUpdateReason(index, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateReason(index, (e.target as HTMLInputElement).value);
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                  />
                ) : (
                  <span className="flex-1">{reason}</span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingReasonIndex(index)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <HoldModalIcons.Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReason(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <HoldModalIcons.Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => closeModal('settings')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <HoldModalIcons.X className="w-6 h-6" />
          </button>
        </div>
      </Modal>
    </>
  );
}
