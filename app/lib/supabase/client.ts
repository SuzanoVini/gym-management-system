// app/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './types';

export const supabase = createClientComponentClient<Database>();

// Helper functions for database operations

// INTROS
export const fetchIntros = async () => {
  let allIntros: any[] = [];
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

    if (error) throw error;
    
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

export const createIntro = async (intro: any) => {
  const { data, error } = await supabase
    .from('intros')
    .insert([intro])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateIntro = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('intros')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteIntro = async (id: string) => {
  const { error } = await supabase
    .from('intros')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// FOLLOW-UP NOTES
export const createFollowUpNote = async (note: {
  intro_id: string;
  note: string;
  staff_name: string;
}) => {
  const { data, error } = await supabase
    .from('follow_up_notes')
    .insert([note])
    .select()
    .single();
  
  if (error) throw error;
  
  // Update last_follow_up on intro
  await supabase
    .from('intros')
    .update({ 
      last_follow_up: new Date().toISOString(),
      follow_up_status: 'Contacted'
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
  
  if (error) throw error;
  return data;
};

// SIGNUPS
export const fetchSignups = async () => {
  const { data, error } = await supabase
    .from('signups')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 9999); // Up to 10,000 records
  
  if (error) throw error;
  return data || [];
};

export const createSignup = async (signup: any) => {
  const { data, error } = await supabase
    .from('signups')
    .insert([signup])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateSignup = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('signups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteSignup = async (id: string) => {
  const { error } = await supabase
    .from('signups')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// CANCELLATIONS
export const fetchCancellations = async () => {
  const { data, error } = await supabase
    .from('cancellations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createCancellation = async (cancellation: any) => {
  const { data, error } = await supabase
    .from('cancellations')
    .insert([cancellation])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateCancellation = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('cancellations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteCancellation = async (id: string) => {
  const { error } = await supabase
    .from('cancellations')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// HOLDS
export const fetchHolds = async () => {
  const { data, error } = await supabase
    .from('holds')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createHold = async (hold: any) => {
  const { data, error } = await supabase
    .from('holds')
    .insert([hold])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateHold = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('holds')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteHold = async (id: string) => {
  const { error } = await supabase
    .from('holds')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// SETTINGS
export const fetchSettings = async (key: string) => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error(`Error fetching settings for ${key}:`, error);
    
    // Fallback defaults if database fails
    const defaults: { [key: string]: any[] } = {
      'class_types': ['GB1', 'GB 1/2', 'GB2', 'NO Gi', 'No Gi', 'Kids 3 - 6 yo', 'Kids 6 - 8 yo', 'Kids 7 - 9 yo', 'Kids All Ages', 'Kids & Parents', 'Juniors & Teens', "Women's", 'MUAY THAI', 'Wrestling', 'Judo', 'Jiu-Jitsu Drills'],
      'staff_members': ['Staff 1', 'Staff 2', 'Staff 3', 'Staff 4', 'Vinicius', 'Jun', 'Staff 7', 'Staff 8', 'Staff 9', 'Staff 10', 'Staff 11', 'Staff 12'],
      'membership_types': ['Integrity', 'Legacy', 'Special', 'ASP'],
      'cancellation_reasons': ['No time', 'Moving', 'Injury', 'Medical reason', 'Financial', 'No interest', 'Try new sport', 'Other Gym', 'Distance from home', 'Distance from work', 'Overdue', 'Other', 'No reason'],
      'hold_reasons': ['Injury', 'Illness', 'Travel', 'Break Time', 'Work', 'No reason', 'Other'],
      'age_categories': ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult']
    };
    
    return defaults[key] || [];
  }

  return data?.value || [];
};

export const updateSettings = async (key: string, value: any[]) => {
  const { error } = await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error(`Error updating settings for ${key}:`, error);
    throw error;
  }

  return true;
};

// REAL-TIME SUBSCRIPTIONS
export const subscribeToIntros = (callback: (payload: any) => void) => {
  return supabase
    .channel('intros-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'intros' },
      callback
    )
    .subscribe();
};

export const subscribeToSignups = (callback: (payload: any) => void) => {
  return supabase
    .channel('signups-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'signups' },
      callback
    )
    .subscribe();
};

export const subscribeToFollowUpNotes = (callback: (payload: any) => void) => {
  return supabase
    .channel('follow-up-notes-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'follow_up_notes' },
      callback
    )
    .subscribe();
};