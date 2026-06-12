// app/lib/supabase/intros.ts

import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';
import type { ClassHistoryFormData, FollowUpNoteFormData, Intro, IntroFormData } from '@/types';
import { supabase } from './client';

// ============= INTRO CLASS HISTORY FUNCTIONS =============
// Fetch class history for a specific intro
export const fetchIntroClassHistory = async (introId: string) => {
  const { data, error } = await supabase
    .from('intro_class_history')
    .select('*')
    .eq('intro_id', introId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
};

// Add a new class to intro history
export const addIntroClassHistory = async (historyEntry: ClassHistoryFormData) => {
  const { data, error } = await supabase
    .from('intro_class_history')
    .insert([historyEntry])
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

// Update a class history entry
export const updateIntroClassHistory = async (
  id: string,
  updates: Partial<ClassHistoryFormData>
) => {
  const { data, error } = await supabase
    .from('intro_class_history')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

// Delete a class history entry
export const deleteIntroClassHistory = async (id: string) => {
  const { error } = await supabase.from('intro_class_history').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

// Fetch intros with their class history
export const fetchIntrosWithHistory = async (): Promise<Intro[]> => {
  const { data, error } = await supabase
    .from('intros')
    .select(`
      *,
      follow_up_notes (
        id,
        note,
        created_at,
        staff_name
      ),
      intro_class_history (
        id,
        month,
        date,
        time,
        class,
        staff,
        attended,
        notes,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
};

// Update intro status
export const updateIntroStatus = async (
  id: string,
  status: 'Active' | 'Cancelled' | 'Completed'
) => {
  const { data, error } = await supabase
    .from('intros')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

// INTROS
export const fetchIntros = async (): Promise<Intro[]> => {
  let allIntros: Intro[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('intros')
      .select(`
        *,
        follow_up_notes (
          id,
          note,
          created_at,
          staff_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      allIntros = [...allIntros, ...data];
      from += pageSize;
      hasMore = data.length === pageSize; // Continue if we got a full page
    } else {
      hasMore = false;
    }
  }

  return allIntros;
};

export const createIntro = async (intro: IntroFormData) => {
  const { data, error } = await supabase.from('intros').insert([intro]).select().single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateIntro = async (id: string, updates: Partial<IntroFormData>) => {
  const { data, error } = await supabase
    .from('intros')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteIntro = async (id: string) => {
  const { error } = await supabase.from('intros').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

// FOLLOW-UP NOTES
export const createFollowUpNote = async (note: FollowUpNoteFormData) => {
  const { data, error } = await supabase.from('follow_up_notes').insert([note]).select().single();

  if (error) {
    throw error;
  }

  // Update last_follow_up on intro
  await supabase
    .from('intros')
    .update({
      last_follow_up: new Date().toISOString(),
      follow_up_status: 'Contacted',
    })
    .eq('id', note.intro_id);

  return data;
};

export const fetchFollowUpNotes = async (introId: string) => {
  const { data, error } = await supabase
    .from('follow_up_notes')
    .select('*')
    .eq('intro_id', introId)
    .order('created_at', { ascending: false });

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

  const { data, error } = await supabase
    .from('intros')
    .select('id, name, email')
    .ilike('email', key.email);

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

  const { data, error } = await supabase
    .from('follow_up_notes')
    .select('*')
    .in('intro_id', introIds)
    .order('created_at', { ascending: false });

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

export const updateFollowUpNote = async (id: string, note: string) => {
  const { data, error } = await supabase
    .from('follow_up_notes')
    .update({ note })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteFollowUpNote = async (id: string) => {
  const { error } = await supabase.from('follow_up_notes').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

// REAL-TIME SUBSCRIPTIONS
export const subscribeToIntros = (callback: (payload: unknown) => void) => {
  return supabase
    .channel('intros-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'intros' }, callback)
    .subscribe();
};

export const subscribeToFollowUpNotes = (callback: (payload: unknown) => void) => {
  return supabase
    .channel('follow-up-notes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_up_notes' }, callback)
    .subscribe();
};

export const toggleFollowUpDone = async (
  id: string,
  currentStatus: string | null | undefined
): Promise<void> => {
  const newStatus = currentStatus ? null : 'Done';
  const { error } = await supabase
    .from('intros')
    .update({ follow_up_status: newStatus })
    .eq('id', id);
  if (error) {
    throw error;
  }
};

// FOLLOW-UP SYSTEM (followup_1_at / followup_2_at)

export const fetchRecentIntros = async (): Promise<Intro[]> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const cutoffTs = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('intros')
    .select('*, follow_up_notes(id, note, created_at, staff_name)')
    .or(`date.gte.${cutoffDate},created_at.gte.${cutoffTs}`)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
};

export const markFollowUp1 = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('intros')
    .update({ followup_1_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw error;
  }
};

export const markFollowUp2 = async (id: string): Promise<void> => {
  // Guard: verify followup_1_at is set before writing
  const { data } = await supabase.from('intros').select('followup_1_at').eq('id', id).single();
  if (!data?.followup_1_at) {
    return;
  }

  const { error } = await supabase
    .from('intros')
    .update({ followup_2_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw error;
  }
};

export const clearFollowUp1 = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('intros')
    .update({ followup_1_at: null, followup_2_at: null })
    .eq('id', id);
  if (error) {
    throw error;
  }
};

export const clearFollowUp2 = async (id: string): Promise<void> => {
  const { error } = await supabase.from('intros').update({ followup_2_at: null }).eq('id', id);
  if (error) {
    throw error;
  }
};

export const markMostRecentIntroAsSignedUp = async (name: string): Promise<void> => {
  const { data: intro } = await supabase
    .from('intros')
    .select('id, signed_up')
    .ilike('name', name.toLowerCase().trim())
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!intro || intro.signed_up === 'Yes') {
    return;
  }

  const { error } = await supabase.from('intros').update({ signed_up: 'Yes' }).eq('id', intro.id);

  if (error) {
    throw error;
  }
};
