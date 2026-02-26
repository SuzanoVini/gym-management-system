// hooks/usePayrollStaff.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import {
  createStaff,
  deleteStaff,
  getActiveStaff,
  getAllStaff,
  getContractors,
  reactivateStaff,
  updateStaff,
} from '@/lib/services/staff.service';
import type { StaffMember, StaffMemberFormData } from '@/types';

export const usePayrollStaff = (activeOnly = false) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = activeOnly ? await getActiveStaff() : await getAllStaff();

      if (result.error) {
        throw result.error;
      }

      setStaff(result.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load staff');
      setError(error);
      errorHandler.handle(error, 'loadStaff');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  const addStaff = useCallback(
    async (staffData: StaffMemberFormData) => {
      try {
        const result = await createStaff(staffData);

        if (result.error) {
          throw result.error;
        }

        await loadStaff();
        errorHandler.notify('Staff member added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addStaff');
        throw err;
      }
    },
    [loadStaff]
  );

  const editStaff = useCallback(
    async (id: string, updates: Partial<StaffMemberFormData>) => {
      try {
        const result = await updateStaff(id, updates);

        if (result.error) {
          throw result.error;
        }

        await loadStaff();
        errorHandler.notify('Staff member updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editStaff');
        throw err;
      }
    },
    [loadStaff]
  );

  const removeStaff = useCallback(
    async (id: string, name: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          `Mark ${name} as inactive? They will no longer appear in active staff lists.`
        );
        if (!confirmed) {
          return;
        }
      }

      try {
        const result = await deleteStaff(id);

        if (result.error) {
          throw result.error;
        }

        await loadStaff();
        errorHandler.notify('Staff member marked as inactive', 'success');
      } catch (err) {
        errorHandler.handle(err, 'removeStaff');
        throw err;
      }
    },
    [loadStaff]
  );

  const activateStaff = useCallback(
    async (id: string, name: string) => {
      try {
        const result = await reactivateStaff(id);

        if (result.error) {
          throw result.error;
        }

        await loadStaff();
        errorHandler.notify(`${name} reactivated successfully`, 'success');
      } catch (err) {
        errorHandler.handle(err, 'activateStaff');
        throw err;
      }
    },
    [loadStaff]
  );

  const getContractorsList = useCallback(async () => {
    try {
      const result = await getContractors();

      if (result.error) {
        throw result.error;
      }

      return result.data || [];
    } catch (err) {
      errorHandler.handle(err, 'getContractorsList');
      return [];
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return {
    staff,
    loading,
    error,
    refresh: loadStaff,
    addStaff,
    editStaff,
    removeStaff,
    activateStaff,
    getContractorsList,
  };
};
