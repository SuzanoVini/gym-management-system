// hooks/useIntros.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
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
        await createIntro(sanitized);
        await loadIntros();
        errorHandler.notify('Intro added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addIntro');
        throw err;
      }
    },
    [loadIntros]
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
    addIntro,
    editIntro,
    removeIntro,
  };
};
