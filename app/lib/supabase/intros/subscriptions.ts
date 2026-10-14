// app/lib/supabase/intros/subscriptions.ts

import { supabase } from '../client';

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
