import { escapeIlike } from '@/lib/utils/normalizePersonKey';
import { supabase } from './client';

export function fetchMemberJourneyRecords(name: string, nameNormalized?: string) {
  const key = (nameNormalized ?? name).toLowerCase().trim();
  const escapedName = escapeIlike(name);

  return Promise.all([
    supabase.from('intros').select('*').ilike('name', escapedName),
    supabase.from('signups').select('*').ilike('name', escapedName),
    supabase.from('holds').select('*').eq('name_normalized', key),
    supabase.from('cancellations').select('*').eq('name_normalized', key),
  ]);
}
