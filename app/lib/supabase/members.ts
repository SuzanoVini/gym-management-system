import type { SupabaseClient } from '@supabase/supabase-js';
import type { Member, MemberImportRow } from '@/types';
import { supabase } from './client';

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }
  return data || [];
};

export const fetchLastMemberSyncAt = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('members')
    .select('last_sync_at')
    .not('last_sync_at', 'is', null)
    .order('last_sync_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data?.last_sync_at ?? null;
};

export const upsertMembers = async (
  client: SupabaseClient,
  rows: MemberImportRow[],
  syncTime: string
): Promise<{ upserted: number; errors: string[] }> => {
  const errors: string[] = [];
  let upserted = 0;

  for (const row of rows) {
    const { error } = await client
      .from('members')
      .upsert({ ...row, last_sync_at: syncTime }, { onConflict: 'name_normalized' });

    if (error) {
      errors.push(`Upsert failed for ${row.name}: ${error.message}`);
    } else {
      upserted++;
    }
  }

  return { upserted, errors };
};

export const markStaleMembers = async (
  client: SupabaseClient,
  syncTime: string
): Promise<number> => {
  const { data, error } = await client
    .from('members')
    .update({ status: 'Inactive' })
    .or(`last_sync_at.is.null,last_sync_at.neq.${syncTime}`)
    .neq('status', 'Inactive')
    .select('id');

  if (error) {
    throw error;
  }
  return data?.length ?? 0;
};
