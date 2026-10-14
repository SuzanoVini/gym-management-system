import { createAdminClient } from './admin';

// Service-role operations for cron and account routes. Each call creates the
// admin client at the same point the routes used to.

// Lightweight query on the settings table that keeps the project active.
export function pingDatabase() {
  return createAdminClient().from('settings').select('id').limit(1).single();
}

// Calls the mark_unsigned_intros() SQL function created in Supabase SQL Editor.
// Uses COALESCE(date::date, created_at::date) to handle legacy null-date records.
export async function markUnsignedIntros(): Promise<{
  count: number | null;
  error: { message: string } | null;
}> {
  const result = await createAdminClient().rpc('mark_unsigned_intros');
  return { count: result.data as number | null, error: result.error };
}

// Deletes the auth user; ON DELETE CASCADE removes user_profiles automatically.
export function deleteAuthUser(userId: string) {
  return createAdminClient().auth.admin.deleteUser(userId);
}
