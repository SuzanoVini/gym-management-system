import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { getEmailTextBody, getZenPlannerBookingEmails } from '@/lib/gmail';
import { MONTH_TO_NUM, parseBookingEmail } from '@/lib/services/booking-parser';
import { createAdminClient } from '@/lib/supabase/admin';
import { canonicalizeStaffName } from '@/lib/utils/canonicalizeStaffName';

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Gmail import handles parsing, enrichment, dedupe, and reporting in one cron transaction.
export async function GET(req: NextRequest) {
  const unauthorizedResponse = verifyCronRequest(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const supabase = createAdminClient();

  const { data: classMappingRows, error: classMappingError } = await supabase
    .from('class_mappings')
    .select('zenplanner_name, system_name');

  if (classMappingError) {
    return NextResponse.json(
      { error: 'Failed to fetch class mappings', details: classMappingError.message },
      { status: 500 }
    );
  }

  const classMapping: Record<string, string> = Object.fromEntries(
    (classMappingRows ?? []).map((r) => [r.zenplanner_name, r.system_name])
  );

  // Staff vocabulary for name canonicalization — a future email format change
  // back to first names won't re-split coaches
  const { data: staffSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'staff_members')
    .maybeSingle();
  const staffList: string[] = Array.isArray(staffSetting?.value) ? staffSetting.value : [];

  let imported = 0;
  let enriched = 0;
  let messagesFound = 0;
  const skipped: string[] = [];
  const errors: string[] = [];
  try {
    const messages = await getZenPlannerBookingEmails();
    messagesFound = messages.length;

    for (const message of messages) {
      if (!message.id) {
        continue;
      }

      try {
        const body = await getEmailTextBody(message.id);
        const booking = parseBookingEmail(body);

        if (!booking) {
          errors.push(`Could not parse email ${message.id}`);
          continue;
        }

        const resolvedClassName = classMapping[booking.className] ?? booking.className;

        const monthNum = MONTH_TO_NUM[booking.month] ?? 1;
        const isoDate = `${booking.year}-${String(monthNum).padStart(2, '0')}-${String(booking.date).padStart(2, '0')}`;

        // Duplicate check: match on resolved class name first, then fall back to raw ZenPlanner
        // name. The fallback catches records imported before the mapping existed.
        let { data: existing } = await supabase
          .from('intros')
          .select('id, email, phone, class')
          .eq('name', booking.name)
          .eq('date', isoDate)
          .eq('time', booking.time)
          .eq('class', resolvedClassName)
          .maybeSingle();

        if (!existing && resolvedClassName !== booking.className) {
          const { data: rawExisting } = await supabase
            .from('intros')
            .select('id, email, phone, class')
            .eq('name', booking.name)
            .eq('date', isoDate)
            .eq('time', booking.time)
            .eq('class', booking.className)
            .maybeSingle();
          if (rawExisting) {
            existing = { ...rawExisting, class: booking.className };
          }
        }

        if (existing) {
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
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('intros')
              .update(updates)
              .eq('id', existing.id);
            if (updateError) {
              errors.push(`Enrich failed for ${booking.name}: ${updateError.message}`);
            } else {
              enriched++;
            }
          } else {
            skipped.push(
              `${booking.name} (${booking.month} ${booking.date} ${booking.time} ${booking.className}) - already exists`
            );
          }
          continue;
        }

        const { error: insertError } = await supabase.from('intros').insert({
          month: booking.month,
          date: isoDate,
          year: booking.year,
          time: booking.time,
          class: resolvedClassName,
          name: booking.name,
          phone: booking.phone,
          email: booking.email,
          staff: canonicalizeStaffName(booking.staff, staffList),
          status: 'Active',
        });

        if (insertError) {
          errors.push(`Insert failed for ${booking.name}: ${insertError.message}`);
          continue;
        }

        imported++;
      } catch (err) {
        errors.push(`Error processing message ${message.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Dedup pass: find records with matching name + date + time, keep the one with more info
  let deduped = 0;
  try {
    const { data: allIntros } = await supabase
      .from('intros')
      .select('id, name, date, time, class, email, phone')
      .order('created_at', { ascending: true });

    if (allIntros) {
      const seen = new Map<string, (typeof allIntros)[0]>();
      const toDelete: string[] = [];

      for (const intro of allIntros) {
        const key = `${intro.name}|${intro.date}|${intro.time}`;
        const prior = seen.get(key);
        if (!prior) {
          seen.set(key, intro);
          continue;
        }
        // Score by number of filled fields (email + phone)
        const priorScore = (prior.email ? 1 : 0) + (prior.phone ? 1 : 0);
        const currentScore = (intro.email ? 1 : 0) + (intro.phone ? 1 : 0);
        if (currentScore > priorScore) {
          toDelete.push(prior.id);
          seen.set(key, intro);
        } else {
          toDelete.push(intro.id);
        }
      }

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase.from('intros').delete().in('id', toDelete);
        if (!deleteError) {
          deduped = toDelete.length;
        }
      }
    }
  } catch (_err) {
    // Dedup failure is non-fatal
  }

  return NextResponse.json({
    imported,
    enriched,
    deduped,
    messagesFound,
    skipped: skipped.length,
    errors,
    timestamp: new Date().toISOString(),
  });
}
