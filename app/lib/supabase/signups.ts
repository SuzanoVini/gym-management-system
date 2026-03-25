// app/lib/supabase/signups.ts

import type { Signup, SignupFormData } from '@/types';
import { supabase } from './client';

// SIGNUPS
export const fetchSignups = async (): Promise<Signup[]> => {
  const { data, error } = await supabase
    .from('signups')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 9999); // Up to 10,000 records

  if (error) {
    throw error;
  }
  return data || [];
};

export const createSignup = async (signup: SignupFormData) => {
  const { data, error } = await supabase.from('signups').insert([signup]).select().single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateSignup = async (id: string, updates: Partial<SignupFormData>) => {
  const { data, error } = await supabase
    .from('signups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteSignup = async (id: string) => {
  const { error } = await supabase.from('signups').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

// REAL-TIME SUBSCRIPTIONS
export const subscribeToSignups = (callback: (payload: unknown) => void) => {
  return supabase
    .channel('signups-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'signups' }, callback)
    .subscribe();
};
