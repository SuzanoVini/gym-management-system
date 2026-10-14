import { getEmailTextBody, getZenPlannerCancellationEmails } from '@/lib/gmail';
import { parseCancellationEmail } from '@/lib/services/cancellation-parser';
import { createAdminClient } from '@/lib/supabase/admin';

function ageToGroup(age: number): string | null {
  if (age >= 3 && age <= 6) {
    return '3-6 YO';
  }
  if (age >= 7 && age <= 9) {
    return '7-9 YO';
  }
  if (age >= 10 && age <= 15) {
    return '10-15 YO';
  }
  if (age >= 16) {
    return 'Adult';
  }
  return null;
}

function calculateAgeGroup(birthDate: string, asOfDate: string): string | null {
  const birth = new Date(birthDate);
  const reference = new Date(asOfDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) {
    return null;
  }

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDelta = reference.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }

  return ageToGroup(age);
}

type AdminClient = ReturnType<typeof createAdminClient>;

interface CancellationTarget {
  name: string;
  date: string;
  nameKey: string;
}

export interface ImportCounts {
  imported: number;
  skipped: number;
}

async function closeActiveHold(
  supabase: AdminClient,
  target: CancellationTarget,
  errors: string[]
): Promise<void> {
  const { data: activeHold } = await supabase
    .from('holds')
    .select('id')
    .eq('name_normalized', target.nameKey)
    .or(`end.is.null,end.gte.${target.date}`)
    .order('start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeHold) {
    const { error: closeError } = await supabase
      .from('holds')
      .update({ end: target.date })
      .eq('id', activeHold.id);
    if (closeError) {
      errors.push(`Hold close failed for ${target.name}: ${closeError.message}`);
    }
  }
}

async function applyAgeGroup(
  supabase: AdminClient,
  target: CancellationTarget,
  errors: string[]
): Promise<void> {
  const { data: member } = await supabase
    .from('members')
    .select('birth_date')
    .eq('name_normalized', target.nameKey)
    .limit(1)
    .maybeSingle<{ birth_date: string | null }>();

  if (!member?.birth_date) {
    return;
  }

  const ageGroup = calculateAgeGroup(member.birth_date, target.date);
  if (!ageGroup) {
    return;
  }

  const { error: ageError } = await supabase
    .from('cancellations')
    .update({ age_group: ageGroup })
    .eq('name_normalized', target.nameKey)
    .eq('date', target.date);
  if (ageError) {
    errors.push(`Age group update failed for ${target.name}: ${ageError.message}`);
  }
}

async function importCancellationMessage(
  supabase: AdminClient,
  messageId: string,
  errors: string[],
  counts: ImportCounts
): Promise<void> {
  const body = await getEmailTextBody(messageId);
  const parsed = parseCancellationEmail(body);

  if (!parsed) {
    errors.push(`Could not parse email ${messageId}`);
    return;
  }

  if (!parsed.date) {
    errors.push(`No effective date in email ${messageId} for ${parsed.name}`);
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('cancellations')
    .upsert(
      {
        name: parsed.name,
        date: parsed.date,
        reason: parsed.reason,
        month: parsed.month,
        year: parsed.year,
        source: 'cron',
      },
      { onConflict: 'name_normalized,date', ignoreDuplicates: true }
    )
    .select('id');

  if (insertError) {
    errors.push(`Insert failed for ${parsed.name}: ${insertError.message}`);
    return;
  }

  if (inserted?.length) {
    counts.imported++;
  } else {
    counts.skipped++;
  }

  const target: CancellationTarget = {
    name: parsed.name,
    date: parsed.date,
    nameKey: parsed.name.toLowerCase().trim(),
  };

  await closeActiveHold(supabase, target, errors);
  await applyAgeGroup(supabase, target, errors);
}

async function importCancellationMessages(
  supabase: AdminClient,
  errors: string[],
  counts: ImportCounts
): Promise<number> {
  const messages = await getZenPlannerCancellationEmails();

  for (const message of messages) {
    if (!message.id) {
      continue;
    }

    try {
      await importCancellationMessage(supabase, message.id, errors, counts);
    } catch (err) {
      errors.push(`Error processing message ${message.id}: ${String(err)}`);
    }
  }

  return messages.length;
}

// Creates the service-role client up front, as the route did before calling
// the import, and returns the runner that uses it.
export function createCancellationImport(): (
  errors: string[],
  counts: ImportCounts
) => ReturnType<typeof importCancellationMessages> {
  const supabase = createAdminClient();
  return (errors, counts) => importCancellationMessages(supabase, errors, counts);
}
