// hooks/useSignups.ts
import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { supabase } from '@/lib/supabase/client';
import { markMostRecentIntroAsSignedUp } from '@/lib/supabase/intros';
import { checkMemberStatus } from '@/lib/supabase/memberStatus';
import { createSignup, deleteSignup, fetchSignups, updateSignup } from '@/lib/supabase/signups';
import { signupSchema, validate } from '@/lib/validations';
import type { Signup, SignupFormData } from '@/types';

export const useSignups = () => {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSignups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSignups();
      setSignups(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load signups');
      setError(error);
      errorHandler.handle(error, 'loadSignups');
    } finally {
      setLoading(false);
    }
  }, []);

  const addSignup = useCallback(
    async (signup: SignupFormData) => {
      // Validate data before sending to database
      const validation = validate(signupSchema, signup);

      if (!validation.success || !validation.data) {
        const errorMessage = validation.errors?.join('\n') || 'Validation failed';
        errorHandler.notify(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      try {
        // 1. Exact-date duplicate guard
        const { data: exactDup } = await supabase
          .from('signups')
          .select('id')
          .ilike('name', validation.data.name.trim())
          .eq('membership_date', validation.data.membership_date ?? '')
          .limit(1)
          .maybeSingle();
        if (exactDup) {
          errorHandler.notify(
            `A signup for "${validation.data.name}" on this date already exists.`,
            'warning'
          );
        }

        // 2. Lifecycle check
        const memberStatus = await checkMemberStatus(validation.data.name.trim());
        if (memberStatus.isCurrentMember) {
          errorHandler.notify(
            `${validation.data.name} is already an active member (signed up ${memberStatus.signupDate}). Saving anyway.`,
            'warning'
          );
        }
        await createSignup(validation.data);
        await markMostRecentIntroAsSignedUp(validation.data.name).catch(() => {
          // Silently ignore sync errors
        });
        await loadSignups();
        errorHandler.notify('Signup added successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'addSignup');
        throw err;
      }
    },
    [loadSignups]
  );

  const editSignup = useCallback(
    async (id: string, updates: Partial<SignupFormData>) => {
      try {
        await updateSignup(id, updates);
        if (updates.name) {
          await markMostRecentIntroAsSignedUp(updates.name).catch(() => {
            // Silently ignore sync errors
          });
        }
        await loadSignups();
        errorHandler.notify('Signup updated successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'editSignup');
        throw err;
      }
    },
    [loadSignups]
  );

  const removeSignup = useCallback(
    async (id: string, name: string) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete signup for ${name}?`);
        if (!confirmed) {
          return;
        }
      }

      try {
        await deleteSignup(id);
        await loadSignups();
        errorHandler.notify('Signup deleted successfully', 'success');
      } catch (err) {
        errorHandler.handle(err, 'removeSignup');
        throw err;
      }
    },
    [loadSignups]
  );

  useEffect(() => {
    loadSignups();
  }, [loadSignups]);

  return {
    signups,
    loading,
    error,
    refresh: loadSignups,
    addSignup,
    editSignup,
    removeSignup,
  };
};
