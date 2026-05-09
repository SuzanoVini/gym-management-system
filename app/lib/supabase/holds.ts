// app/lib/supabase/holds.ts

import type { Hold, HoldFormData } from '@/types';
import { supabase } from './client';

// HOLDS
export const fetchHolds = async (): Promise<Hold[]> => {
  const { data, error } = await supabase
    .from('holds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
};

export const createHold = async (hold: HoldFormData) => {
  const { data, error } = await supabase.from('holds').insert([hold]).select().single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateHold = async (id: string, updates: Partial<HoldFormData>) => {
  const { data, error } = await supabase
    .from('holds')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteHold = async (id: string) => {
  const { error } = await supabase.from('holds').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

export const closeActiveHold = async (name: string, cancellationDate: string): Promise<void> => {
  const { data: hold } = await supabase
    .from('holds')
    .select('id')
    .ilike('name', name.toLowerCase().trim())
    .or(`end.is.null,end.gte.${cancellationDate}`)
    .order('start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!hold) {
    return;
  }

  const { error } = await supabase
    .from('holds')
    .update({ end: cancellationDate })
    .eq('id', hold.id);

  if (error) {
    throw error;
  }
};
