// app/lib/supabase/intros/followUpGroups.ts

import type { PostgrestResponse } from '@supabase/supabase-js';
import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';
import type { FollowUpNote, Intro } from '@/types';
import { supabase } from '../client';

export const fetchFollowUpNotes = async (introId: string) => {
  const { data, error } = (await supabase
    .from('follow_up_notes')
    .select('*')
    .eq('intro_id', introId)
    .order('created_at', { ascending: false })) as PostgrestResponse<FollowUpNote>;

  if (error) {
    throw error;
  }
  return data;
};

// Fetch all intro IDs for a person group (same normalized email via ilike, then
// client-side filter by exact normalized name + email equality)
const fetchPersonGroupIntroIds = async (name: string, email: string): Promise<string[]> => {
  const key = normalizePersonKey(name, email);
  if (!key) {
    return [];
  }

  const { data, error } = (await supabase
    .from('intros')
    .select('id, name, email')
    .ilike('email', key.email)) as PostgrestResponse<Pick<Intro, 'id' | 'name' | 'email'>>;

  if (error) {
    throw error;
  }

  const targetKey = personKeyString(key);
  return (data ?? [])
    .filter((row) => {
      const rowKey = normalizePersonKey(row.name, row.email);
      return rowKey && personKeyString(rowKey) === targetKey;
    })
    .map((row) => row.id);
};

// Fetch notes for the full person group; falls back to single-intro fetch when
// the person has no email (no grouping possible)
export const fetchFollowUpNotesByPerson = async (
  introId: string,
  name: string,
  email: string | null | undefined
) => {
  const key = normalizePersonKey(name, email);
  if (!key) {
    return fetchFollowUpNotes(introId);
  }

  const introIds = await fetchPersonGroupIntroIds(name, email ?? '');
  if (introIds.length === 0) {
    return fetchFollowUpNotes(introId);
  }

  const { data, error } = (await supabase
    .from('follow_up_notes')
    .select('*')
    .in('intro_id', introIds)
    .order('created_at', { ascending: false })) as PostgrestResponse<FollowUpNote>;

  if (error) {
    throw error;
  }
  return data ?? [];
};

// Resolve write targets for person-level fields: the whole group when the
// person has an email, otherwise just the opened intro
const resolvePersonGroupTargets = async (
  introId: string,
  name: string,
  email: string | null | undefined
): Promise<string[]> => {
  const key = normalizePersonKey(name, email);
  if (!key) {
    return [introId];
  }
  const ids = await fetchPersonGroupIntroIds(name, email ?? '');
  return ids.length > 0 ? ids : [introId];
};

// Best-effort group write: a failure on one intro doesn't block the others
const updatePersonGroup = async (
  targets: string[],
  values: Partial<Pick<Intro, 'followup_reminder_at' | 'followup_dismissed_at'>>
): Promise<void> => {
  await Promise.allSettled(
    targets.map((id) => supabase.from('intros').update(values).eq('id', id))
  );
};

export const setFollowUpReminder = async (
  introId: string,
  name: string,
  email: string | null | undefined,
  reminderUTC: string
): Promise<void> => {
  const targets = await resolvePersonGroupTargets(introId, name, email);
  await updatePersonGroup(targets, { followup_reminder_at: reminderUTC });
};

export const clearFollowUpReminder = async (
  introId: string,
  name: string,
  email: string | null | undefined
): Promise<void> => {
  const targets = await resolvePersonGroupTargets(introId, name, email);
  await updatePersonGroup(targets, { followup_reminder_at: null });
};

export const dismissFollowUp = async (
  introId: string,
  name: string,
  email: string | null | undefined
): Promise<void> => {
  const targets = await resolvePersonGroupTargets(introId, name, email);
  await updatePersonGroup(targets, { followup_dismissed_at: new Date().toISOString() });
};

export const undoDismissFollowUp = async (
  introId: string,
  name: string,
  email: string | null | undefined
): Promise<void> => {
  const targets = await resolvePersonGroupTargets(introId, name, email);
  await updatePersonGroup(targets, { followup_dismissed_at: null });
};
