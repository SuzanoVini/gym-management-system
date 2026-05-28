import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { getEmailTextBody, getZenPlannerHoldEmails } from '@/lib/gmail';
import { parseHoldEmail } from '@/lib/services/hold-parser';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const unauthorizedResponse = verifyCronRequest(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const supabase = createAdminClient();
  let imported = 0;
  let skipped = 0;
  let messagesFound = 0;
  const errors: string[] = [];

  try {
    const messages = await getZenPlannerHoldEmails();
    messagesFound = messages.length;

    for (const message of messages) {
      if (!message.id) {
        continue;
      }

      try {
        const body = await getEmailTextBody(message.id);
        const parsed = parseHoldEmail(body);

        if (!parsed) {
          errors.push(`Could not parse email ${message.id}`);
          continue;
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
          continue;
        }

        if (inserted?.length) {
          imported++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(`Error processing message ${message.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    imported,
    skipped,
    messagesFound,
    errors,
    timestamp: new Date().toISOString(),
  });
}
