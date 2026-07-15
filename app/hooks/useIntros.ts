// hooks/useIntros.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase/client';
import { createIntro, deleteIntro, fetchIntros, updateIntro } from '@/lib/supabase/intros';
import { introSchema, validate } from '@/lib/validations';
import type { Intro, IntroFormData } from '@/types';

export const useIntros = () => {
  const [intros, setIntros] = useState<Intro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const stripUndefined = <T extends object>(data: T): T => {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
  };

  const loadIntros = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchIntros();
      setIntros(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load intros');
      setError(error);
      errorHandler.handle(error, 'loadIntros');
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const data = await fetchIntros();
      setIntros(data);
    } catch (err) {
      errorHandler.handle(err, 'silentRefresh');
    }
  }, []);

  const addIntro = useCallback(
    async (intro: IntroFormData) => {
      // Validate data before sending to database
      const validation = validate(introSchema, intro);

      if (!validation.success || !validation.data) {
        const errorMessage = validation.errors?.join('\n') || 'Validation failed';
        errorHandler.notify(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      try {
        const sanitized = stripUndefined(validation.data) as IntroFormData;
        if (sanitized.date) {
          const { data: dup } = await supabase
            .from('intros')
            .select('id')
            .ilike('name', sanitized.name.trim())
            .eq('date', sanitized.date)
            .maybeSingle();
          if (dup) {
            errorHandler.notify(
              `An intro for "${sanitized.name}" on this date already exists.`,
              'warning'
            );
          }
        }
        const created = await createIntro(sanitized);
        await loadIntros();
        errorHandler.notify('Intro added successfully', 'success');
        return created as Intro;
      } catch (err) {
        errorHandler.handle(err, 'addIntro');
        throw err;
      }
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: stripUndefined is a stable utility function
    [loadIntros, stripUndefined]
  );

  const editIntro = useCallback(
    async (id: string, updates: Partial<IntroFormData>) => {
      try {
        await updateIntro(id, updates);
        await loadIntros();
        errorHandler.notify('Intro updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editIntro');
        throw err;
      }
    },
    [loadIntros]
  );

  const removeIntro = useCallback(
    async (id: string, name: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete intro for ${name}?`);
        if (!confirmed) {
          return;
        }
      }

      try {
        await deleteIntro(id);
        await loadIntros();
        errorHandler.notify('Intro deleted successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'removeIntro');
        throw err;
      }
    },
    [loadIntros]
  );

  useEffect(() => {
    loadIntros();
  }, [loadIntros]);

  return {
    intros,
    loading,
    error,
    refresh: loadIntros,
    silentRefresh,
    addIntro,
    editIntro,
    removeIntro,
  };
};
