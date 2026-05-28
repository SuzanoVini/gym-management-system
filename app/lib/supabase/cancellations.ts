// app/lib/supabase/cancellations.ts

import type { Cancellation, CancellationFormData } from '@/types';
import { supabase } from './client';

// CANCELLATIONS
export const fetchCancellations = async (): Promise<Cancellation[]> => {
  const { data, error } = await supabase
    .from('cancellations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
};

export const createCancellation = async (cancellation: CancellationFormData) => {
  const { data, error } = await supabase
    .from('cancellations')
    .insert([cancellation])
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateCancellation = async (id: string, updates: Partial<CancellationFormData>) => {
  const { data, error } = await supabase
    .from('cancellations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteCancellation = async (id: string) => {
  const { error } = await supabase.from('cancellations').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

export const subscribeToCancellations = (callback: (payload: unknown) => void) => {
  return supabase
    .channel('cancellations-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cancellations' }, callback)
    .subscribe();
};
