import { createHash, timingSafeEqual } from 'node:crypto';
import { normalizeEmail, normalizePhone } from '@/lib/spam/normalize';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

// Hash both sides so lengths match and timingSafeEqual can't leak the secret's length.
export function isValidWebhookKey(provided: string | null, secret: string | undefined): boolean {
  if (!secret || !provided) {
    return false;
  }
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}

export async function storeZenPlannerWebhook(
  feed: string,
  headers: Record<string, string>,
  body: string
) {
  return createAdminClient().from('zenplanner_webhook_events').insert({ feed, headers, body });
}

export interface ZenPlannerCheckin {
  attendance_id: string;
  person_id: string | null;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  class_name: string;
  class_date: string;
  class_time: string;
  is_free_trial: boolean;
  is_drop_in: boolean;
}

// '2026-11-20T19:15' -> date '2026-11-20', time '7:15 PM' (the format intros.time uses).
function parseClassStart(beginDate: string | null): { date: string; time: string } | null {
  // The pattern only admits 00-23 hours and 00-59 minutes.
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)/.exec(beginDate ?? '');
  if (!match) {
    return null;
  }
  const [, year, month, day, hh, mm] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const date = `${year}-${month}-${day}`;
  // Reject impossible dates (2026-02-30): one bad row would fail the whole replay
  // upsert, since class_date is a real date column. Date.UTC rolls them over.
  if (new Date(Date.UTC(+year, +month - 1, +day)).toISOString().slice(0, 10) !== date) {
    return null;
  }
  const hour = Number(hh);
  return { date, time: `${hour % 12 || 12}:${mm} ${hour < 12 ? 'AM' : 'PM'}` };
}

/**
 * Attendance deliveries are form-encoded. Returns the check-in, or null for RSVPs
 * and anything missing the fields matching needs.
 */
export function parseAttendanceCheckin(body: string): ZenPlannerCheckin | null {
  const p = new URLSearchParams(body);
  const start = parseClassStart(p.get('beginDate'));
  const attendanceId = p.get('attendanceId');
  const className = p.get('name')?.trim();
  if (p.get('isAttendance') !== '1' || !start || !attendanceId || !className) {
    return null;
  }
  return {
    attendance_id: attendanceId,
    person_id: p.get('personId') || null,
    first_name: p.get('firstName')?.trim() || null,
    email: normalizeEmail(p.get('email')),
    phone: normalizePhone(p.get('phoneNumber')),
    class_name: className,
    class_date: start.date,
    class_time: start.time,
    is_free_trial: p.get('isFreeTrial') === 'true',
    is_drop_in: p.get('isDropIn') === 'true',
  };
}

/** Stores the check-ins in these bodies and re-runs matching for classes since `since`. */
export async function applyCheckinBodies(client: AdminClient, bodies: string[], since: string) {
  // Upsert rejects a batch that hits the same key twice, so dedupe first.
  const rows = new Map<string, ZenPlannerCheckin>();
  for (const body of bodies) {
    const checkin = parseAttendanceCheckin(body);
    if (checkin) {
      rows.set(checkin.attendance_id, checkin);
    }
  }
  if (rows.size > 0) {
    const { error } = await client
      .from('zenplanner_checkins')
      .upsert([...rows.values()], { onConflict: 'attendance_id' });
    if (error) {
      throw new Error(`Failed to store check-ins: ${error.message}`);
    }
  }
  const { data, error } = await client.rpc('apply_zenplanner_checkins', { since });
  if (error) {
    throw new Error(`Failed to apply check-ins: ${error.message}`);
  }
  return { checkins: rows.size, ...(data as { intros_marked: number; members_updated: number }) };
}

/** Webhook path: handle one delivery as it arrives. Non-check-ins are a no-op. */
export async function applyAttendanceWebhook(body: string) {
  const checkin = parseAttendanceCheckin(body);
  if (!checkin) {
    return null;
  }
  return applyCheckinBodies(createAdminClient(), [body], checkin.class_date);
}

/**
 * Cron path: replay recent raw deliveries. Recovers check-ins the webhook failed to
 * store and matches bookings that were imported after their check-in arrived.
 */
export async function replayRecentCheckins(days = 14) {
  const client = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  // ponytail: ~30 check-ins/day, so 14 days stays far under this ceiling.
  const { data, error } = await client
    .from('zenplanner_webhook_events')
    .select('body')
    .eq('feed', 'attendance')
    .gte('received_at', since)
    .range(0, 4999);
  if (error) {
    throw new Error(`Failed to read webhook events: ${error.message}`);
  }
  return applyCheckinBodies(
    client,
    (data ?? []).map((row) => row.body),
    since.slice(0, 10)
  );
}
