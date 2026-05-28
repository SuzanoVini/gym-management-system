// hooks/useHolds.ts
import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { errorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase/client';
import {
  createHold,
  deleteHold,
  fetchHolds,
  subscribeToHolds,
  updateHold,
} from '@/lib/supabase/holds';
import { holdSchema, validate } from '@/lib/validations';
import type { Hold, HoldFormData } from '@/types';

export const useHolds = () => {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const stripUndefined = <T extends object>(data: T): T => {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
  };

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

  const silentRefresh = useCallback(async () => {
    try {
      const data = await fetchHolds();
      setHolds(data);
    } catch (err) {
      errorHandler.handle(err, 'useHolds.silentRefresh');
    }
  }, []);

  const addHold = useCallback(
    async (hold: HoldFormData) => {
      // Validate data before sending to database
      const validation = validate(holdSchema, hold);

      if (!validation.success || !validation.data) {
        const errorMessage = validation.errors?.join('\n') || 'Validation failed';
        errorHandler.notify(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      try {
        const sanitized = stripUndefined(validation.data) as HoldFormData;
        const { data: exactDup } = await supabase
          .from('holds')
          .select('id')
          .ilike('name', sanitized.name.trim())
          .eq('start', sanitized.start ?? '')
          .limit(1)
          .maybeSingle();
        if (exactDup) {
          errorHandler.notify(
            `A hold for "${sanitized.name}" with the same start date already exists.`,
            'warning'
          );
        }
        await createHold({
          ...sanitized,
          year: new Date(validation.data.start).getFullYear(),
        });
        await loadHolds();
        errorHandler.notify('Hold added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addHold');
        throw err;
      }
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: stripUndefined is a stable utility function
    [loadHolds, stripUndefined]
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

  useRealtimeRefresh(subscribeToHolds, silentRefresh);

  return {
    holds,
    loading,
    error,
    refresh: loadHolds,
    silentRefresh,
    addHold,
    editHold,
    removeHold,
  };
};
