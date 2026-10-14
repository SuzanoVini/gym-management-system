import { useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { DEFAULT_MONTHLY_MEMBERSHIP_REVENUE } from '@/lib/insights/rules';
import { fetchNumberSetting, fetchSettings } from '@/lib/supabase/settings';

export type SettingsTab = 'classes' | 'staff' | 'revenue' | 'filters';
export type EditingItem = { original: string; value: string } | null;

export function useSettingsModalState(isOpen: boolean) {
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [newClassType, setNewClassType] = useState('');
  const [newStaffMember, setNewStaffMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('classes');
  const [revenueInput, setRevenueInput] = useState(String(DEFAULT_MONTHLY_MEMBERSHIP_REVENUE));
  const [revenueSaving, setRevenueSaving] = useState(false);
  const [editingClass, setEditingClass] = useState<EditingItem>(null);
  const [editingStaff, setEditingStaff] = useState<EditingItem>(null);
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
      void loadSettings();
    }
  }, [isOpen]);

  return {
    classTypes,
    setClassTypes,
    staffMembers,
    setStaffMembers,
    newClassType,
    setNewClassType,
    newStaffMember,
    setNewStaffMember,
    loading,
    setLoading,
    activeTab,
    setActiveTab,
    revenueInput,
    setRevenueInput,
    revenueSaving,
    setRevenueSaving,
    editingClass,
    setEditingClass,
    editingStaff,
    setEditingStaff,
    renameLoading,
    setRenameLoading,
  };
}

export type SettingsModalState = ReturnType<typeof useSettingsModalState>;
