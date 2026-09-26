import type { PostgrestResponse } from '@supabase/supabase-js';
import { reportConsoleError } from '@/lib/logger';
import { supabase } from './client';

export async function fetchClassMappings(): Promise<Record<string, string>> {
  const { data, error } = (await supabase
    .from('class_mappings')
    .select('zenplanner_name, system_name')) as PostgrestResponse<{
    zenplanner_name: string;
    system_name: string;
  }>;

  if (error) {
    reportConsoleError('Failed to fetch class_mappings:', error.message);
    return {};
  }

  return Object.fromEntries((data ?? []).map((row) => [row.zenplanner_name, row.system_name]));
}

export async function upsertClassMapping(
  zenplannerName: string,
  systemName: string
): Promise<void> {
  const { error } = await supabase
    .from('class_mappings')
    .upsert(
      { zenplanner_name: zenplannerName, system_name: systemName },
      { onConflict: 'zenplanner_name' }
    );
  if (error) {
    throw error;
  }
}

export async function updateSystemNameInMappings(
  oldSystemName: string,
  newSystemName: string
): Promise<void> {
  const { error } = await supabase
    .from('class_mappings')
    .update({ system_name: newSystemName })
    .eq('system_name', oldSystemName);
  if (error) {
    throw error;
  }
}
