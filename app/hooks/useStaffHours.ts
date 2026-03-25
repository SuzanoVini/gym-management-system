// hooks/useStaffHours.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import {
  addMatCleaningBonus,
  addTimeEntry,
  calculateTotalHours,
  createOrUpdateHours,
  deleteTimeEntry,
  getHoursForPeriod,
  getTimeEntries,
  updateStaffHoursField,
  updateTimeEntry,
} from '@/lib/services/hours.service';
import type { StaffHours, StaffHoursFormData, TimeEntry, TimeEntryFormData } from '@/types';

export const useStaffHours = (periodId: string | null) => {
  const [hours, setHours] = useState<StaffHours[]>([]);
  const [selectedStaffHours, setSelectedStaffHours] = useState<StaffHours | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadHours = useCallback(async () => {
    if (!periodId) {
      setHours([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getHoursForPeriod(periodId);
      setHours(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load staff hours');
      setError(error);
      errorHandler.handle(error, 'loadHours');
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  const loadTimeEntries = useCallback(async (staffHoursId: string) => {
    try {
      setLoading(true);
      setError(null);
      const entries = await getTimeEntries(staffHoursId);
      setTimeEntries(entries);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load time entries');
      setError(error);
      errorHandler.handle(error, 'loadTimeEntries');
    } finally {
      setLoading(false);
    }
  }, []);

  const addOrUpdateHours = useCallback(
    async (staffId: string, hoursData: Partial<StaffHoursFormData>) => {
      if (!periodId) {
        throw new Error('No active payroll period selected');
      }

      try {
        const staffHours = await createOrUpdateHours(periodId, staffId, hoursData);
        await loadHours();
        errorHandler.notify('Hours updated successfully', 'success');
        return staffHours;
      } catch (err) {
        errorHandler.handle(err, 'addOrUpdateHours');
        throw err;
      }
    },
    [periodId, loadHours]
  );

  const createTimeEntry = useCallback(
    async (staffHoursId: string, entry: TimeEntryFormData) => {
      try {
        await addTimeEntry(staffHoursId, entry);
        await loadHours();
        if (selectedStaffHours?.id === staffHoursId) {
          await loadTimeEntries(staffHoursId);
        }
        errorHandler.notify('Time entry added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'createTimeEntry');
        throw err;
      }
    },
    [loadHours, loadTimeEntries, selectedStaffHours]
  );

  const editTimeEntry = useCallback(
    async (id: string, updates: Partial<TimeEntryFormData>) => {
      try {
        const entry = await updateTimeEntry(id, updates);
        await loadHours();
        if (selectedStaffHours?.id === entry.staff_hours_id) {
          await loadTimeEntries(entry.staff_hours_id);
        }
        errorHandler.notify('Time entry updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editTimeEntry');
        throw err;
      }
    },
    [loadHours, loadTimeEntries, selectedStaffHours]
  );

  const removeTimeEntry = useCallback(
    async (id: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Delete this time entry?');
        if (!confirmed) {
          return;
        }
      }

      try {
        await deleteTimeEntry(id);
        await loadHours();
        if (selectedStaffHours) {
          await loadTimeEntries(selectedStaffHours.id);
        }
        errorHandler.notify('Time entry deleted successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'removeTimeEntry');
        throw err;
      }
    },
    [loadHours, loadTimeEntries, selectedStaffHours]
  );

  const addMatCleaning = useCallback(
    async (staffHoursId: string, entryDate: string, notes?: string) => {
      try {
        await addMatCleaningBonus(staffHoursId, entryDate, notes);
        await loadHours();
        if (selectedStaffHours?.id === staffHoursId) {
          await loadTimeEntries(staffHoursId);
        }
        errorHandler.notify('Mat cleaning bonus added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addMatCleaning');
        throw err;
      }
    },
    [loadHours, loadTimeEntries, selectedStaffHours]
  );

  const recalculateHours = useCallback(
    async (staffHoursId: string) => {
      try {
        await calculateTotalHours(staffHoursId);
        await loadHours();
        if (selectedStaffHours?.id === staffHoursId) {
          await loadTimeEntries(staffHoursId);
        }
        errorHandler.notify('Hours recalculated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'recalculateHours');
        throw err;
      }
    },
    [loadHours, loadTimeEntries, selectedStaffHours]
  );

  const selectStaffHours = useCallback(
    async (staffHours: StaffHours | null) => {
      setSelectedStaffHours(staffHours);
      if (staffHours) {
        await loadTimeEntries(staffHours.id);
      } else {
        setTimeEntries([]);
      }
    },
    [loadTimeEntries]
  );

  const updateHoursField = useCallback(
    async (
      staffHoursId: string,
      field: 'regular_hours' | 'overtime_hours' | 'vacation_hours' | 'sick_hours',
      value: number
    ) => {
      try {
        await updateStaffHoursField(staffHoursId, field, value);
        await loadHours();
        errorHandler.notify('Hours updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'updateHoursField');
        throw err;
      }
    },
    [loadHours]
  );

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  return {
    hours,
    selectedStaffHours,
    timeEntries,
    loading,
    error,
    refresh: loadHours,
    refreshTimeEntries: loadTimeEntries,
    addOrUpdateHours,
    createTimeEntry,
    editTimeEntry,
    removeTimeEntry,
    addMatCleaning,
    recalculateHours,
    selectStaffHours,
    updateHoursField,
  };
};
