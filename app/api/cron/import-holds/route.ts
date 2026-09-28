import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { getEmailTextBody, getZenPlannerHoldEmails } from '@/lib/gmail';
import { parseHoldEmail } from '@/lib/services/hold-parser';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

async function importHoldMessage(
  supabase: AdminClient,
  messageId: string,
  errors: string[]
): Promise<'imported' | 'skipped' | null> {
  const body = await getEmailTextBody(messageId);
  const parsed = parseHoldEmail(body);

  if (!parsed) {
    errors.push(`Could not parse email ${messageId}`);
    return null;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('holds')
    .upsert(
      {
        name: parsed.name,
        start: parsed.start,
        end: parsed.end,
        reason: parsed.reason,
        hold_status: parsed.hold_status,
        month: parsed.month,
        year: parsed.year,
        source: 'cron',
      },
      { onConflict: 'name_normalized,start', ignoreDuplicates: true }
    )
    .select('id');

  if (insertError) {
    errors.push(`Insert failed for ${parsed.name}: ${insertError.message}`);
    return null;
  }

  return inserted?.length ? 'imported' : 'skipped';
}

async function importHoldMessages(
  supabase: AdminClient,
  errors: string[]
): Promise<{ imported: number; skipped: number; messagesFound: number }> {
  let imported = 0;
  let skipped = 0;
  const messages = await getZenPlannerHoldEmails();
  const messagesFound = messages.length;

  for (const message of messages) {
    if (!message.id) {
      continue;
    }

    try {
      const outcome = await importHoldMessage(supabase, message.id, errors);
      if (outcome === 'imported') {
        imported++;
      } else if (outcome === 'skipped') {
        skipped++;
      }
    } catch (err) {
      errors.push(`Error processing message ${message.id}: ${String(err)}`);
    }
  }

  return { imported, skipped, messagesFound };
}

export async function GET(req: NextRequest) {
  const unauthorizedResponse = verifyCronRequest(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const supabase = createAdminClient();
  const errors: string[] = [];
  let counts: { imported: number; skipped: number; messagesFound: number };

  try {
    counts = await importHoldMessages(supabase, errors);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    imported: counts.imported,
    skipped: counts.skipped,
    messagesFound: counts.messagesFound,
    errors,
    timestamp: new Date().toISOString(),
  });
}
