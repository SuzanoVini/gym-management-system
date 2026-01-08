import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/store/useUIStore';
import { useSignups } from '@/hooks/useSignups';
import { useSelectionStore } from '@/store/useSelectionStore';
import { SignupForm } from '../forms/SignupForm';
import { fetchSettings, updateSettings } from '@/lib/supabase/settings';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

const SignupModalIcons = {
  X,
  Plus,
  Edit2,
  Trash2,
};

interface SignupModalsProps {
  importPreviewData: any[];
  confirmCSVImport: () => Promise<void>;
}

export function SignupModals({ importPreviewData, confirmCSVImport }: SignupModalsProps) {
  const { modals, closeModal } = useUIStore();
  const { addSignup, editSignup } = useSignups();
  const { selectedSignup, setSelectedSignup } = useSelectionStore();

  const [membershipTypes, setMembershipTypes] = useState<string[]>([]);
  const [newMembershipType, setNewMembershipType] = useState('');
  const [editingMembershipIndex, setEditingMembershipIndex] = useState<number | null>(null);

  const loadSettings = async () => {
    const types = await fetchSettings('membership_types');
    if (types) {
      setMembershipTypes(types);
    }
  };

  useEffect(() => {
    if (modals.settings) {
      loadSettings();
    }
  }, [modals.settings]);

  const handleAddMembershipType = async () => {
    if (newMembershipType.trim() && !membershipTypes.includes(newMembershipType.trim())) {
      const updated = [...membershipTypes, newMembershipType.trim()].sort();
      setMembershipTypes(updated);
      try {
        await updateSettings('membership_types', updated);
        setNewMembershipType('');
      } catch (error) {
        console.error('Error saving membership type:', error);
        alert('Failed to save membership type');
      }
    }
  };

  const handleDeleteMembershipType = async (index: number) => {
    if (confirm('Are you sure you want to delete this membership type?')) {
      const updated = membershipTypes.filter((_, i) => i !== index);
      setMembershipTypes(updated);
      try {
        await updateSettings('membership_types', updated);
      } catch (error) {
        console.error('Error deleting membership type:', error);
        alert('Failed to delete membership type');
      }
    }
  };

  const handleUpdateMembershipType = async (index: number, newValue: string) => {
    const updated = [...membershipTypes];
    updated[index] = newValue.trim();
    const sorted = updated.sort();
    setMembershipTypes(sorted);
    setEditingMembershipIndex(null);
    try {
      await updateSettings('membership_types', sorted);
    } catch (error) {
      console.error('Error updating membership type:', error);
      alert('Failed to update membership type');
    }
  };

  return (
    <>
      <Modal
        isOpen={modals.addSignup}
        onClose={() => closeModal('addSignup')}
        title="Add New Sign-up"
      >
        <SignupForm
          onSubmit={addSignup}
          onCancel={() => closeModal('addSignup')}
          membershipTypes={membershipTypes}
        />
      </Modal>
      <Modal
        isOpen={modals.editSignup}
        onClose={() => closeModal('editSignup')}
        title="Edit Sign-up"
      >
        <SignupForm
          signup={selectedSignup}
          onSubmit={(data) => editSignup(selectedSignup!.id, data)}
          onCancel={() => {
            closeModal('editSignup');
            setSelectedSignup(null);
          }}
          membershipTypes={membershipTypes}
        />
      </Modal>
      <Modal
        isOpen={modals.importPreview}
        onClose={() => closeModal('importPreview')}
        title="Confirm CSV Import"
        size="xl"
      >
        <div className="border rounded overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Membership</th>
                <th className="px-4 py-2 text-left">Sign Up Date</th>
                <th className="px-4 py-2 text-left">First Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {importPreviewData.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{row.month}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2">{row.membership}</td>
                  <td className="px-4 py-2">{row.membership_date || '-'}</td>
                  <td className="px-4 py-2">{row.first_payment_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => closeModal('importPreview')}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
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
        title="Manage Membership Types"
        size="lg"
      >
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Membership Type
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMembershipType}
                onChange={(e) => setNewMembershipType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMembershipType()}
                placeholder="Enter membership type"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleAddMembershipType}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <SignupModalIcons.Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700 mb-3">
              Current Membership Types ({membershipTypes.length})
            </h4>
            {membershipTypes.map((type, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                {editingMembershipIndex === index ? (
                  <input
                    type="text"
                    defaultValue={type}
                    onBlur={(e) => handleUpdateMembershipType(index, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateMembershipType(index, (e.target as HTMLInputElement).value);
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded"
                  />
                ) : (
                  <span className="flex-1">{type}</span>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingMembershipIndex(index)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <SignupModalIcons.Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMembershipType(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <SignupModalIcons.Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => closeModal('settings')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}
