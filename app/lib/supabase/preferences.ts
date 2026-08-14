import type { DefaultFilterPreferences } from '@/lib/preferences/defaultFilters';
import { supabase } from './client';

/**
 * Preferences are per-user and scoped by RLS to the caller's own profile row, so a failure
 * here should degrade to shipped defaults rather than block the UI.
 */
export async function fetchPreferences(): Promise<DefaultFilterPreferences> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {};
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load preferences:', error);
    return {};
  }
  return (data?.preferences ?? {}) as DefaultFilterPreferences;
}

/** Merges at the top level so writing default filters never clobbers other preference keys. */
export async function savePreferences(patch: DefaultFilterPreferences): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not signed in');
  }

  const current = await fetchPreferences();
  const { error } = await supabase
    .from('user_profiles')
    .update({ preferences: { ...current, ...patch } })
    .eq('id', user.id);

  if (error) {
    throw error;
  }
}
