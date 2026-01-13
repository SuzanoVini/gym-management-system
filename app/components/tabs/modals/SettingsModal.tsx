'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { errorHandler } from '@/lib/errorHandler';
import { fetchSettings, updateSettings } from '@/lib/supabase/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [newClassType, setNewClassType] = useState('');
  const [newStaffMember, setNewStaffMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'classes' | 'staff'>('classes');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [classes, staff] = await Promise.all([
          fetchSettings('class_types'),
          fetchSettings('staff_members'),
        ]);
        setClassTypes(classes);
        setStaffMembers(staff);
      } catch (err) {
        errorHandler.handle(err, 'loadSettings');
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const handleAddClassType = async () => {
    if (!newClassType.trim()) {
      return;
    }

    try {
      setLoading(true);
      const updated = [...classTypes, newClassType.trim()];
      await updateSettings('class_types', updated);
      setClassTypes(updated);
      setNewClassType('');
      errorHandler.notify('Class type added successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'addClassType');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaffMember = async () => {
    if (!newStaffMember.trim()) {
      return;
    }

    try {
      setLoading(true);
      const updated = [...staffMembers, newStaffMember.trim()];
      await updateSettings('staff_members', updated);
      setStaffMembers(updated);
      setNewStaffMember('');
      errorHandler.notify('Staff member added successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'addStaffMember');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClassType = async (classType: string) => {
    try {
      setLoading(true);
      const updated = classTypes.filter((ct) => ct !== classType);
      await updateSettings('class_types', updated);
      setClassTypes(updated);
      errorHandler.notify('Class type removed successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'removeClassType');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaffMember = async (staffMember: string) => {
    try {
      setLoading(true);
      const updated = staffMembers.filter((sm) => sm !== staffMember);
      await updateSettings('staff_members', updated);
      setStaffMembers(updated);
      errorHandler.notify('Staff member removed successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'removeStaffMember');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'classes'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Class Types
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'staff'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Staff Members
        </button>
      </div>

      {/* Content */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newClassType}
              onChange={(e) => setNewClassType(e.target.value)}
              placeholder="Add new class type"
              className="form-input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAddClassType()}
            />
            <button
              type="button"
              onClick={handleAddClassType}
              disabled={loading || !newClassType.trim()}
              className="btn btn-primary"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {classTypes.map((classType) => (
              <div
                key={classType}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm font-medium">{classType}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveClassType(classType)}
                  disabled={loading}
                  className="btn-icon text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newStaffMember}
              onChange={(e) => setNewStaffMember(e.target.value)}
              placeholder="Add new staff member"
              className="form-input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAddStaffMember()}
            />
            <button
              type="button"
              onClick={handleAddStaffMember}
              disabled={loading || !newStaffMember.trim()}
              className="btn btn-primary"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {staffMembers.map((staffMember) => (
              <div
                key={staffMember}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm font-medium">{staffMember}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStaffMember(staffMember)}
                  disabled={loading}
                  className="btn-icon text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
