import { errorHandler } from '@/lib/errorHandler';
import { renameIntroField } from '@/lib/services/membership-tabs';
import { updateSystemNameInMappings } from '@/lib/supabase/classMappings';
import { updateNumberSetting, updateSettings } from '@/lib/supabase/settings';
import type { useSettingsStore } from '@/store/useSettingsStore';
import type { SettingsModalState } from './useSettingsModalState';

type RefreshSettings = ReturnType<typeof useSettingsStore.getState>['refresh'];

export function createRevenueHandlers(state: SettingsModalState) {
  const { revenueInput, setRevenueSaving } = state;

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

  return { handleSaveRevenue };
}

// Bulk-apply helpers below restore the previous settings list and report on
// failure, returning false so the rename stops.
export function createClassTypeHandlers(
  state: SettingsModalState,
  refreshSettings: RefreshSettings
) {
  const {
    classTypes,
    setClassTypes,
    newClassType,
    setNewClassType,
    setLoading,
    editingClass,
    setEditingClass,
    setRenameLoading,
  } = state;

  const applyClassRenameToIntros = async (original: string, newName: string) => {
    const { error } = await renameIntroField('class', original, newName);
    if (error) {
      await updateSettings('class_types', classTypes);
      setClassTypes(classTypes);
      errorHandler.handle(error, 'renameClassBulk');
      return false;
    }
    return true;
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

      if (applyToAll && !(await applyClassRenameToIntros(original, newName))) {
        return;
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

  return { handleAddClassType, handleRenameClass, handleRemoveClassType };
}

export function createStaffHandlers(state: SettingsModalState, refreshSettings: RefreshSettings) {
  const {
    staffMembers,
    setStaffMembers,
    newStaffMember,
    setNewStaffMember,
    setLoading,
    editingStaff,
    setEditingStaff,
    setRenameLoading,
  } = state;

  const applyStaffRenameToIntros = async (original: string, newName: string) => {
    const { error } = await renameIntroField('staff', original, newName);
    if (error) {
      await updateSettings('staff_members', staffMembers);
      setStaffMembers(staffMembers);
      errorHandler.handle(error, 'renameStaffBulk');
      return false;
    }
    return true;
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

      if (applyToAll && !(await applyStaffRenameToIntros(original, newName))) {
        return;
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

  return { handleAddStaffMember, handleRenameStaff, handleRemoveStaffMember };
}

// Plain factories (not hooks): called on every render, so each handler closes
// over that render's state exactly as the inline handlers did.
export function createSettingsHandlers(
  state: SettingsModalState,
  refreshSettings: RefreshSettings
) {
  return {
    ...createRevenueHandlers(state),
    ...createClassTypeHandlers(state, refreshSettings),
    ...createStaffHandlers(state, refreshSettings),
  };
}
