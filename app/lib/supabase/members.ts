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

export const subscribeToMembers = (callback: (payload: unknown) => void) => {
  return supabase
    .channel('members-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, callback)
    .subscribe();
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
  // .or() passes a raw string to PostgREST — colons in ISO timestamps break the filter parser.
  // Use two separate queries (mutually exclusive predicates) to avoid the encoding issue.
  const [{ data: nullRows, error: e1 }, { data: oldRows, error: e2 }] = await Promise.all([
    client
      .from('members')
      .update({ status: 'Inactive' })
      .is('last_sync_at', null)
      .neq('status', 'Inactive')
      .select('id'),
    client
      .from('members')
      .update({ status: 'Inactive' })
      .lt('last_sync_at', syncTime)
      .neq('status', 'Inactive')
      .select('id'),
  ]);

  if (e1) {
    throw e1;
  }
  if (e2) {
    throw e2;
  }
  return (nullRows?.length ?? 0) + (oldRows?.length ?? 0);
};
