import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { getEmailTextBody, getZenPlannerCancellationEmails } from '@/lib/gmail';
import { parseCancellationEmail } from '@/lib/services/cancellation-parser';
import { createAdminClient } from '@/lib/supabase/admin';

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Cron import handles auth, parsing, dedup, hold closing, enrichment, and per-message reporting in one request.
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
    const messages = await getZenPlannerCancellationEmails();
    messagesFound = messages.length;

    for (const message of messages) {
      if (!message.id) {
        continue;
      }

      try {
        const body = await getEmailTextBody(message.id);
        const parsed = parseCancellationEmail(body);

        if (!parsed) {
          errors.push(`Could not parse email ${message.id}`);
          continue;
        }

        if (!parsed.date) {
          errors.push(`No effective date in email ${message.id} for ${parsed.name}`);
          continue;
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
          continue;
        }

        if (inserted?.length) {
          imported++;
        } else {
          skipped++;
        }

        const nameKey = parsed.name.toLowerCase().trim();

        const { data: activeHold } = await supabase
          .from('holds')
          .select('id')
          .eq('name_normalized', nameKey)
          .or(`end.is.null,end.gte.${parsed.date}`)
          .order('start', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeHold) {
          const { error: closeError } = await supabase
            .from('holds')
            .update({ end: parsed.date })
            .eq('id', activeHold.id);
          if (closeError) {
            errors.push(`Hold close failed for ${parsed.name}: ${closeError.message}`);
          }
        }

        const { data: member } = await supabase
          .from('members')
          .select('birth_date')
          .eq('name_normalized', nameKey)
          .limit(1)
          .maybeSingle();

        if (member?.birth_date) {
          const ageGroup = calculateAgeGroup(member.birth_date, parsed.date);
          if (ageGroup) {
            const { error: ageError } = await supabase
              .from('cancellations')
              .update({ age_group: ageGroup })
              .eq('name_normalized', nameKey)
              .eq('date', parsed.date);
            if (ageError) {
              errors.push(`Age group update failed for ${parsed.name}: ${ageError.message}`);
            }
          }
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
