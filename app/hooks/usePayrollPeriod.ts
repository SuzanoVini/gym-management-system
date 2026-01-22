// hooks/usePayrollPeriod.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import {
  closePeriod,
  createPeriod,
  getAllPeriods,
  getCurrentPeriod,
  setCurrentPeriod,
  updatePeriod,
} from '@/lib/services/period.service';
import type { PayrollPeriod } from '@/types';

export const usePayrollPeriod = () => {
  const [currentPeriod, setCurrentPeriodState] = useState<PayrollPeriod | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCurrentPeriod = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const period = await getCurrentPeriod();
      setCurrentPeriodState(period);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load current period');
      setError(error);
      errorHandler.handle(error, 'loadCurrentPeriod');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllPeriods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allPeriods = await getAllPeriods();
      setPeriods(allPeriods);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load periods');
      setError(error);
      errorHandler.handle(error, 'loadAllPeriods');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [current, allPeriods] = await Promise.all([getCurrentPeriod(), getAllPeriods()]);
      setCurrentPeriodState(current);
      setPeriods(allPeriods);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load period data');
      setError(error);
      errorHandler.handle(error, 'loadAll');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPeriod = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        await createPeriod(startDate, endDate);
        await loadAll();
        errorHandler.notify('Payroll period created successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addPeriod');
        throw err;
      }
    },
    [loadAll]
  );

  const editPeriod = useCallback(
    async (id: string, updates: { start_date?: string; end_date?: string }) => {
      try {
        await updatePeriod(id, updates);
        await loadAll();
        errorHandler.notify('Payroll period updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editPeriod');
        throw err;
      }
    },
    [loadAll]
  );

  const switchToPeriod = useCallback(
    async (id: string) => {
      try {
        const period = await setCurrentPeriod(id);
        setCurrentPeriodState(period);
        await loadAllPeriods();
        errorHandler.notify('Switched to selected payroll period', 'success');
      } catch (err) {
        errorHandler.handle(err, 'switchToPeriod');
        throw err;
      }
    },
    [loadAllPeriods]
  );

  const finalizePeriod = useCallback(
    async (id: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          'Close this payroll period? This cannot be undone and will prevent further modifications.'
        );
        if (!confirmed) {
          return;
        }
      }

      try {
        await closePeriod(id);
        await loadAll();
        errorHandler.notify('Payroll period closed successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'finalizePeriod');
        throw err;
      }
    },
    [loadAll]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    currentPeriod,
    periods,
    loading,
    error,
    refresh: loadAll,
    refreshCurrent: loadCurrentPeriod,
    refreshPeriods: loadAllPeriods,
    addPeriod,
    editPeriod,
    switchToPeriod,
    finalizePeriod,
  };
};
