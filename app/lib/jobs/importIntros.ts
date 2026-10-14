import { getEmailTextBody, getZenPlannerBookingEmails } from '@/lib/gmail';
import { MONTH_TO_NUM, type ParsedBooking, parseBookingEmail } from '@/lib/services/booking-parser';
import { pickDedupSurvivor } from '@/lib/spam/dedupSurvivor';
import {
  buildSpamContacts,
  detectSpamSignals,
  type SpamContacts,
} from '@/lib/spam/detectSpamSignals';
import { createAdminClient } from '@/lib/supabase/admin';
import { canonicalizeStaffName } from '@/lib/utils/canonicalizeStaffName';

type AdminClient = ReturnType<typeof createAdminClient>;

interface ClassMappingRow {
  zenplanner_name: string;
  system_name: string;
}

interface ExistingIntro {
  id: string;
  email: string | null;
  phone: string | null;
  class: string;
}

interface DedupIntroRow {
  id: string;
  name: string;
  date: string;
  time: string;
  class: string;
  email: string | null;
  phone: string | null;
  is_spam: boolean | null;
}

export interface IntroImportContext {
  supabase: AdminClient;
  classMapping: Record<string, string>;
  staffList: string[];
  skipped: string[];
  errors: string[];
  counts: { imported: number; enriched: number };
}

async function loadStaffList(supabase: AdminClient): Promise<string[]> {
  // Staff vocabulary for name canonicalization — a future email format change
  // back to first names won't re-split coaches
  const { data: staffSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'staff_members')
    .maybeSingle<{ value: unknown }>();
  const staffValue = staffSetting?.value;
  return Array.isArray(staffValue) ? (staffValue as string[]) : [];
}

// Duplicate check: match on resolved class name first, then fall back to raw ZenPlanner
// name. The fallback catches records imported before the mapping existed.
async function findExistingIntro(
  supabase: AdminClient,
  booking: ParsedBooking,
  isoDate: string,
  resolvedClassName: string
): Promise<ExistingIntro | null> {
  // spam-gate: allow — spam must keep blocking re-import
  const { data: existing } = await supabase
    .from('intros')
    .select('id, email, phone, class')
    .eq('name', booking.name)
    .eq('date', isoDate)
    .eq('time', booking.time)
    .eq('class', resolvedClassName)
    .maybeSingle<ExistingIntro>();

  if (!existing && resolvedClassName !== booking.className) {
    // spam-gate: allow — spam must keep blocking re-import
    const { data: rawExisting } = await supabase
      .from('intros')
      .select('id, email, phone, class')
      .eq('name', booking.name)
      .eq('date', isoDate)
      .eq('time', booking.time)
      .eq('class', booking.className)
      .maybeSingle<ExistingIntro>();
    if (rawExisting) {
      return { ...rawExisting, class: booking.className };
    }
  }

  return existing;
}

async function enrichExistingIntro(
  ctx: IntroImportContext,
  existing: ExistingIntro,
  booking: ParsedBooking,
  resolvedClassName: string
): Promise<void> {
  const updates: Record<string, string> = {};
  // Upgrade raw class name to resolved system name
  if (existing.class !== resolvedClassName) {
    updates.class = resolvedClassName;
  }
  if (!existing.email && booking.email) {
    updates.email = booking.email;
  }
  if (!existing.phone && booking.phone) {
    updates.phone = booking.phone;
  }

  if (Object.keys(updates).length === 0) {
    ctx.skipped.push(
      `${booking.name} (${booking.month} ${booking.date} ${booking.time} ${booking.className}) - already exists`
    );
    return;
  }

  const { error: updateError } = await ctx.supabase
    .from('intros')
    .update(updates)
    .eq('id', existing.id);
  if (updateError) {
    ctx.errors.push(`Enrich failed for ${booking.name}: ${updateError.message}`);
  } else {
    ctx.counts.enriched++;
  }
}

async function loadSpamContacts(supabase: AdminClient): Promise<SpamContacts> {
  const { data: spamRows } = await supabase
    .from('intros')
    .select('email_normalized, phone_normalized')
    .eq('is_spam', true);
  return buildSpamContacts(spamRows ?? []);
}

async function importIntroMessage(
  ctx: IntroImportContext,
  messageId: string,
  spamContacts: SpamContacts
): Promise<void> {
  const body = await getEmailTextBody(messageId);
  const booking = parseBookingEmail(body);

  if (!booking) {
    ctx.errors.push(`Could not parse email ${messageId}`);
    return;
  }

  const resolvedClassName = ctx.classMapping[booking.className] ?? booking.className;

  const monthNum = MONTH_TO_NUM[booking.month] ?? 1;
  const isoDate = `${booking.year}-${String(monthNum).padStart(2, '0')}-${String(booking.date).padStart(2, '0')}`;

  const existing = await findExistingIntro(ctx.supabase, booking, isoDate, resolvedClassName);
  if (existing) {
    await enrichExistingIntro(ctx, existing, booking, resolvedClassName);
    return;
  }

  const { error: insertError } = await ctx.supabase.from('intros').insert({
    month: booking.month,
    date: isoDate,
    year: booking.year,
    time: booking.time,
    class: resolvedClassName,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    staff: canonicalizeStaffName(booking.staff, ctx.staffList),
    status: 'Active',
    spam_signals: detectSpamSignals(
      { name: booking.name, email: booking.email, phone: booking.phone },
      spamContacts
    ),
  });

  if (insertError) {
    ctx.errors.push(`Insert failed for ${booking.name}: ${insertError.message}`);
    return;
  }

  ctx.counts.imported++;
}

async function importIntroMessages(ctx: IntroImportContext): Promise<number> {
  const messages = await getZenPlannerBookingEmails();
  const spamContacts = await loadSpamContacts(ctx.supabase);

  for (const message of messages) {
    if (!message.id) {
      continue;
    }

    try {
      await importIntroMessage(ctx, message.id, spamContacts);
    } catch (err) {
      ctx.errors.push(`Error processing message ${message.id}: ${String(err)}`);
    }
  }

  return messages.length;
}

function collectDuplicateIds(allIntros: DedupIntroRow[]): string[] {
  const seen = new Map<string, DedupIntroRow>();
  const toDelete: string[] = [];

  for (const intro of allIntros) {
    const key = `${intro.name}|${intro.date}|${intro.time}`;
    const prior = seen.get(key);
    if (!prior) {
      seen.set(key, intro);
      continue;
    }
    const { keep, drop } = pickDedupSurvivor(prior, intro);
    toDelete.push(drop.id);
    seen.set(key, keep);
  }

  return toDelete;
}

// Dedup pass: find records with matching name + date + time, keep spam, else the one with more info
async function dedupeIntros(supabase: AdminClient): Promise<number> {
  let deduped = 0;
  try {
    // spam-gate: allow — dedup must see spam to keep the flag
    const { data: allIntros } = await supabase
      .from('intros')
      .select('id, name, date, time, class, email, phone, is_spam')
      .order('created_at', { ascending: true })
      .overrideTypes<DedupIntroRow[], { merge: false }>();

    if (allIntros) {
      const toDelete = collectDuplicateIds(allIntros);

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase.from('intros').delete().in('id', toDelete);
        if (!deleteError) {
          deduped = toDelete.length;
        }
      }
    }
  } catch {
    // Dedup failure is non-fatal
  }
  return deduped;
}

// Creates the service-role client up front, as the route did, and exposes each
// import step bound to it so the route keeps its original step order.
export function createIntroImport() {
  const supabase = createAdminClient();
  return {
    fetchClassMappings: () =>
      supabase
        .from('class_mappings')
        .select('zenplanner_name, system_name')
        .overrideTypes<ClassMappingRow[], { merge: false }>(),
    loadStaffList: () => loadStaffList(supabase),
    createContext: (
      classMapping: Record<string, string>,
      staffList: string[]
    ): IntroImportContext => ({
      supabase,
      classMapping,
      staffList,
      skipped: [],
      errors: [],
      counts: { imported: 0, enriched: 0 },
    }),
    importMessages: importIntroMessages,
    dedupe: () => dedupeIntros(supabase),
  };
}
