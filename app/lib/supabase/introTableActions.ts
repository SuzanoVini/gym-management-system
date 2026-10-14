import type { IntroCsvRecord } from '@/lib/csv';
import { supabase } from './client';

export function insertIntroImport(
  records: Array<Omit<IntroCsvRecord, 'date'> & { date: string | null }>
) {
  return supabase.from('intros').insert(records).select('id');
}

export function deleteIntroIds(ids: string[]) {
  return supabase.from('intros').delete().in('id', ids);
}

export function updateIntroAttendance(id: string, value: string) {
  return supabase
    .from('intros')
    .update({ attended: value === '' ? null : value })
    .eq('id', id);
}

export function updateIntroSignupStatus(id: string, value: string) {
  return supabase
    .from('intros')
    .update({ signed_up: value === '' ? null : value })
    .eq('id', id);
}
