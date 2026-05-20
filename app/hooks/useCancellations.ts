// hooks/useCancellations.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import {
  createCancellation,
  deleteCancellation,
  fetchCancellations,
  updateCancellation,
} from '@/lib/supabase/cancellations';
import { supabase } from '@/lib/supabase/client';
import { closeActiveHold } from '@/lib/supabase/holds';
import { checkMemberStatus } from '@/lib/supabase/memberStatus';
import { cancellationSchema, validate } from '@/lib/validations';
import type { Cancellation, CancellationFormData } from '@/types';

export const useCancellations = () => {
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCancellations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCancellations();
      setCancellations(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load cancellations');
      setError(error);
      errorHandler.handle(error, 'loadCancellations');
    } finally {
      setLoading(false);
    }
  }, []);

  const addCancellation = useCallback(
    async (cancellation: CancellationFormData) => {
      // Validate data before sending to database
      const validation = validate(cancellationSchema, cancellation);

      if (!validation.success || !validation.data) {
        const errorMessage = validation.errors?.join('\n') || 'Validation failed';
        errorHandler.notify(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      try {
        // 1. Exact-date duplicate guard
        const { data: exactDup } = await supabase
          .from('cancellations')
          .select('id')
          .ilike('name', validation.data.name.trim())
          .eq('date', validation.data.date ?? '')
          .limit(1)
          .maybeSingle();
        if (exactDup) {
          errorHandler.notify(
            `A cancellation for "${validation.data.name}" on this date already exists.`,
            'warning'
          );
        }

        // 2. Lifecycle check
        const memberStatus = await checkMemberStatus(validation.data.name.trim());
        if (!memberStatus.isCurrentMember) {
          errorHandler.notify(
            `No active membership found for "${validation.data.name}". They may have already cancelled.`,
            'warning'
          );
        }
        await createCancellation(validation.data);
        if (validation.data.date) {
          await closeActiveHold(validation.data.name, validation.data.date).catch(() => {
            // Silently ignore sync errors
          });
        }
        await loadCancellations();
        errorHandler.notify('Cancellation added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addCancellation');
        throw err;
      }
    },
    [loadCancellations]
  );

  const editCancellation = useCallback(
    async (id: string, updates: Partial<CancellationFormData>) => {
      try {
        await updateCancellation(id, updates);
        await loadCancellations();
        errorHandler.notify('Cancellation updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editCancellation');
        throw err;
      }
    },
    [loadCancellations]
  );

  const removeCancellation = useCallback(
    async (id: string, name: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete cancellation for ${name}?`);
        if (!confirmed) {
          return;
        }
      }

      try {
        await deleteCancellation(id);
        await loadCancellations();
        errorHandler.notify('Cancellation deleted successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'removeCancellation');
        throw err;
      }
    },
    [loadCancellations]
  );

  useEffect(() => {
    loadCancellations();
  }, [loadCancellations]);

  return {
    cancellations,
    loading,
    error,
    refresh: loadCancellations,
    addCancellation,
    editCancellation,
    removeCancellation,
  };
};
