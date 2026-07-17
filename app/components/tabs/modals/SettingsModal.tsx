'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import Modal from '@/components/ui/Modal';
import { errorHandler } from '@/lib/errorHandler';
import { DEFAULT_MONTHLY_MEMBERSHIP_REVENUE } from '@/lib/insights/rules';
import { updateSystemNameInMappings } from '@/lib/supabase/classMappings';
import { supabase } from '@/lib/supabase/client';
import {
  fetchNumberSetting,
  fetchSettings,
  updateNumberSetting,
  updateSettings,
} from '@/lib/supabase/settings';
import { useSettingsStore } from '@/store/useSettingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { isOwner } = useAuth();
  const refreshSettings = useSettingsStore((s) => s.refresh);
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [newClassType, setNewClassType] = useState('');
  const [newStaffMember, setNewStaffMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'classes' | 'staff' | 'revenue'>('classes');
  const [revenueInput, setRevenueInput] = useState(String(DEFAULT_MONTHLY_MEMBERSHIP_REVENUE));
  const [revenueSaving, setRevenueSaving] = useState(false);
  const [editingClass, setEditingClass] = useState<{ original: string; value: string } | null>(
    null
  );
  const [editingStaff, setEditingStaff] = useState<{ original: string; value: string } | null>(
    null
  );
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [classes, staff, revenue] = await Promise.all([
          fetchSettings('class_types'),
          fetchSettings('staff_members'),
          fetchNumberSetting('avg_monthly_membership_revenue', DEFAULT_MONTHLY_MEMBERSHIP_REVENUE),
        ]);
        setClassTypes(classes);
        setStaffMembers(staff);
        setRevenueInput(String(revenue));
      } catch (err) {
        errorHandler.handle(err, 'loadSettings');
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const handleSaveRevenue = async () => {
    const value = Number(revenueInput);
    if (!Number.isFinite(value) || value < 0) {
      errorHandler.handle(new Error('Enter a valid non-negative amount'), 'saveRevenue');
      return;
    }
    try {
      setRevenueSaving(true);
      await updateNumberSetting('avg_monthly_membership_revenue', value);
      errorHandler.notify('Revenue estimate updated', 'success');
    } catch (err) {
      errorHandler.handle(err, 'saveRevenue');
    } finally {
      setRevenueSaving(false);
    }
  };

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
      void refreshSettings();
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
      void refreshSettings();
      errorHandler.notify('Staff member added successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'addStaffMember');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameClass = async (applyToAll: boolean) => {
    if (!editingClass || !editingClass.value.trim()) {
      return;
    }
    const { original, value: newName } = editingClass;
    if (newName === original) {
      setEditingClass(null);
      return;
    }
    setRenameLoading(true);
    try {
      const updated = classTypes.map((ct) => (ct === original ? newName : ct));
      await updateSettings('class_types', updated);
      setClassTypes(updated);

      if (applyToAll) {
        const { error } = await supabase
          .from('intros')
          .update({ class: newName })
          .eq('class', original);
        if (error) {
          await updateSettings('class_types', classTypes);
          setClassTypes(classTypes);
          errorHandler.handle(error, 'renameClassBulk');
          return;
        }
      }

      await updateSystemNameInMappings(original, newName);
      void refreshSettings();
      errorHandler.notify(`Class renamed to "${newName}"`, 'success');
      setEditingClass(null);
    } catch (err) {
      errorHandler.handle(err, 'renameClass');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleRenameStaff = async (applyToAll: boolean) => {
    if (!editingStaff || !editingStaff.value.trim()) {
      return;
    }
    const { original, value: newName } = editingStaff;
    if (newName === original) {
      setEditingStaff(null);
      return;
    }
    setRenameLoading(true);
    try {
      const updated = staffMembers.map((sm) => (sm === original ? newName : sm));
      await updateSettings('staff_members', updated);
      setStaffMembers(updated);

      if (applyToAll) {
        const { error } = await supabase
          .from('intros')
          .update({ staff: newName })
          .eq('staff', original);
        if (error) {
          await updateSettings('staff_members', staffMembers);
          setStaffMembers(staffMembers);
          errorHandler.handle(error, 'renameStaffBulk');
          return;
        }
      }

      void refreshSettings();
      errorHandler.notify(`Staff renamed to "${newName}"`, 'success');
      setEditingStaff(null);
    } catch (err) {
      errorHandler.handle(err, 'renameStaff');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleRemoveClassType = async (classType: string) => {
    try {
      setLoading(true);
      const updated = classTypes.filter((ct) => ct !== classType);
      await updateSettings('class_types', updated);
      setClassTypes(updated);
      void refreshSettings();
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
      void refreshSettings();
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
        <button
          type="button"
          onClick={() => setActiveTab('revenue')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'revenue'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Revenue
        </button>
      </div>

      {/* Content */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Average monthly revenue per member — used to estimate the dollar impact shown on
            Insights cards.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={revenueInput}
              onChange={(e) => setRevenueInput(e.target.value)}
              disabled={!isOwner}
              className="form-input w-32"
            />
            <span className="text-sm text-gray-500">/month</span>
            {isOwner && (
              <button
                type="button"
                onClick={handleSaveRevenue}
                disabled={revenueSaving}
                className="btn btn-primary ml-2"
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-4">
          {isOwner && (
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
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {classTypes.map((classType) =>
              editingClass?.original === classType ? (
                <div key={classType} className="p-2 bg-blue-50 rounded border border-blue-200">
                  <input
                    type="text"
                    value={editingClass.value}
                    onChange={(e) =>
                      setEditingClass({ original: classType, value: e.target.value })
                    }
                    className="form-input w-full text-sm mb-2"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRenameClass(false)}
                      disabled={renameLoading}
                      className="btn btn-secondary text-xs px-2 py-1"
                    >
                      Save (settings only)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenameClass(true)}
                      disabled={renameLoading}
                      className="btn btn-primary text-xs px-2 py-1"
                    >
                      Save + apply to all intros
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingClass(null)}
                      disabled={renameLoading}
                      className="btn btn-secondary text-xs px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={classType}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{classType}</span>
                  {isOwner && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingClass({ original: classType, value: classType })}
                        disabled={loading}
                        className="btn-icon text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveClassType(classType)}
                        disabled={loading}
                        className="btn-icon text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-4">
          {isOwner && (
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
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {staffMembers.map((staffMember) =>
              editingStaff?.original === staffMember ? (
                <div key={staffMember} className="p-2 bg-blue-50 rounded border border-blue-200">
                  <input
                    type="text"
                    value={editingStaff.value}
                    onChange={(e) =>
                      setEditingStaff({ original: staffMember, value: e.target.value })
                    }
                    className="form-input w-full text-sm mb-2"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRenameStaff(false)}
                      disabled={renameLoading}
                      className="btn btn-secondary text-xs px-2 py-1"
                    >
                      Save (settings only)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenameStaff(true)}
                      disabled={renameLoading}
                      className="btn btn-primary text-xs px-2 py-1"
                    >
                      Save + apply to all intros
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStaff(null)}
                      disabled={renameLoading}
                      className="btn btn-secondary text-xs px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={staffMember}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{staffMember}</span>
                  {isOwner && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStaff({ original: staffMember, value: staffMember })
                        }
                        disabled={loading}
                        className="btn-icon text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaffMember(staffMember)}
                        disabled={loading}
                        className="btn-icon text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
