import type { CancellationCsvRecord, HoldCsvRecord, SignupCsvRecord } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';

export function importCancellations(records: CancellationCsvRecord[]) {
  return supabase
    .from('cancellations')
    .insert(
      records.map(({ date, year, ...record }) => ({
        ...record,
        ...(date !== undefined ? { date } : {}),
        ...(year !== undefined ? { year } : {}),
      }))
    )
    .select('id');
}

export function importHolds(records: HoldCsvRecord[]) {
  return supabase
    .from('holds')
    .insert(
      records.map(({ start, end, year, ...record }) => ({
        ...record,
        ...(start !== undefined ? { start } : {}),
        ...(end !== undefined ? { end } : {}),
        ...(year !== undefined ? { year } : {}),
      }))
    )
    .select('id');
}

export function importSignups(records: SignupCsvRecord[]) {
  return supabase
    .from('signups')
    .insert(
      records.map(({ membership_date, first_payment_date, year, ...record }) => ({
        ...record,
        ...(membership_date !== undefined ? { membership_date } : {}),
        ...(first_payment_date !== undefined ? { first_payment_date } : {}),
        ...(year !== undefined ? { year } : {}),
      }))
    )
    .select('id');
}

export function deleteCancellationsByIds(ids: string[]) {
  return supabase.from('cancellations').delete().in('id', ids);
}

export function deleteHoldsByIds(ids: string[]) {
  return supabase.from('holds').delete().in('id', ids);
}

export function deleteSignupsByIds(ids: string[]) {
  return supabase.from('signups').delete().in('id', ids);
}

export function renameIntroField(field: 'class' | 'staff', original: string, value: string) {
  return supabase
    .from('intros')
    .update({ [field]: value })
    .eq(field, original);
}

export async function getPriorClassMapping(rawClass: string): Promise<string | null> {
  const { data } = await supabase
    .from('class_mappings')
    .select('system_name')
    .eq('zenplanner_name', rawClass)
    .maybeSingle();
  const mapping = data as { system_name: string | null } | null;
  return mapping?.system_name ?? null;
}

export async function fetchAffectedIntroIds(rawClass: string): Promise<string[]> {
  // spam-gate: allow — the rename also touches spam rows, so undo must restore them
  const { data } = await supabase.from('intros').select('id').eq('class', rawClass);
  return (data ?? []).map((record: { id: string }) => record.id);
}

export async function updateIntroClass(
  rawClass: string,
  value: string
): Promise<{ error: unknown }> {
  const { error } = await supabase.from('intros').update({ class: value }).eq('class', rawClass);
  return { error };
}

export async function updateIntroClassesById(
  ids: string[],
  value: string
): Promise<{ error: unknown }> {
  const { error } = await supabase.from('intros').update({ class: value }).in('id', ids);
  return { error };
}

export async function deleteClassMapping(rawClass: string): Promise<{ error: unknown }> {
  const { error } = await supabase.from('class_mappings').delete().eq('zenplanner_name', rawClass);
  return { error };
}
