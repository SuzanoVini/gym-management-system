// hooks/useHolds.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { createHold, deleteHold, fetchHolds, updateHold } from '@/lib/supabase/holds';
import { holdSchema, validate } from '@/lib/validations';
import type { Hold, HoldFormData } from '@/types';

export const useHolds = () => {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadHolds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHolds();
      setHolds(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load holds');
      setError(error);
      errorHandler.handle(error, 'loadHolds');
    } finally {
      setLoading(false);
    }
  }, []);

  const addHold = useCallback(
    async (hold: HoldFormData) => {
      // Validate data before sending to database
      const validation = validate(holdSchema, hold);

      if (!validation.success) {
        const errorMessage = validation.errors?.join('\n') || 'Validation failed';
        errorHandler.notify(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      try {
        await createHold(validation.data!);
        await loadHolds();
        errorHandler.notify('Hold added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addHold');
        throw err;
      }
    },
    [loadHolds]
  );

  const editHold = useCallback(
    async (id: string, updates: Partial<HoldFormData>) => {
      try {
        await updateHold(id, updates);
        await loadHolds();
        errorHandler.notify('Hold updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editHold');
        throw err;
      }
    },
    [loadHolds]
  );

  const removeHold = useCallback(
    async (id: string, name: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete hold for ${name}?`);
        if (!confirmed) {
          return;
        }
      }

      try {
        await deleteHold(id);
        await loadHolds();
        errorHandler.notify('Hold deleted successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'removeHold');
        throw err;
      }
    },
    [loadHolds]
  );

  useEffect(() => {
    loadHolds();
  }, [loadHolds]);

  return {
    holds,
    loading,
    error,
    refresh: loadHolds,
    addHold,
    editHold,
    removeHold,
  };
};
