import { createHash, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

// Hash both sides so lengths match and timingSafeEqual can't leak the secret's length.
export function isValidWebhookKey(provided: string | null, secret: string | undefined): boolean {
  if (!secret || !provided) {
    return false;
  }
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}

// ponytail: raw capture only; parse into intros/members once real payloads show what ZP sends.
export async function storeZenPlannerWebhook(
  feed: string,
  headers: Record<string, string>,
  body: string
) {
  return createAdminClient().from('zenplanner_webhook_events').insert({ feed, headers, body });
}
