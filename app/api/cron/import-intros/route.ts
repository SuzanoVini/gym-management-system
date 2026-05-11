import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getEmailTextBody, getZenPlannerBookingEmails } from '@/lib/gmail';
import { MONTH_TO_NUM, parseBookingEmail } from '@/lib/services/booking-parser';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let imported = 0;
  let enriched = 0;
  let messagesFound = 0;
  const skipped: string[] = [];
  const errors: string[] = [];
  const debug: { name: string; phone: string | null; email: string | null }[] = [];

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

        debug.push({ name: booking.name, phone: booking.phone, email: booking.email });

        const monthNum = MONTH_TO_NUM[booking.month] ?? 1;
        const isoDate = `${booking.year}-${String(monthNum).padStart(2, '0')}-${String(booking.date).padStart(2, '0')}`;

        // Duplicate check: all details must match — same person can book different classes/days/times
        const { data: existing } = await supabase
          .from('intros')
          .select('id, email, phone')
          .eq('name', booking.name)
          .eq('date', isoDate)
          .eq('time', booking.time)
          .eq('class', booking.className)
          .maybeSingle();

        if (existing) {
          const updates: Record<string, string> = {};
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
              `${booking.name} (${booking.month} ${booking.date} ${booking.time} ${booking.className}) — already exists`
            );
          }
          continue;
        }

        const { error: insertError } = await supabase.from('intros').insert({
          month: booking.month,
          date: isoDate,
          year: booking.year,
          time: booking.time,
          class: booking.className,
          name: booking.name,
          phone: booking.phone,
          email: booking.email,
          staff: booking.staff,
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

  return NextResponse.json({
    imported,
    enriched,
    messagesFound,
    skipped: skipped.length,
    errors,
    debug,
    timestamp: new Date().toISOString(),
  });
}
