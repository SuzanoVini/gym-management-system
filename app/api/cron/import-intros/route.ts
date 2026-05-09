import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getEmailTextBody, getUnreadZenPlannerEmails, markEmailAsRead } from '@/lib/gmail';
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
  const skipped: string[] = [];
  const errors: string[] = [];
  const debug: { name: string; phone: string | null; email: string | null }[] = [];

  try {
    const messages = await getUnreadZenPlannerEmails();

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

        // Duplicate check: same name + month + year + time
        const { data: existing } = await supabase
          .from('intros')
          .select('id')
          .eq('name', booking.name)
          .eq('month', booking.month)
          .eq('year', booking.year)
          .eq('time', booking.time)
          .maybeSingle();

        if (existing) {
          skipped.push(
            `${booking.name} (${booking.month} ${booking.date} ${booking.time}) — already exists`
          );
          await markEmailAsRead(message.id);
          continue;
        }

        const monthNum = MONTH_TO_NUM[booking.month] ?? 1;
        const isoDate = `${booking.year}-${String(monthNum).padStart(2, '0')}-${String(booking.date).padStart(2, '0')}`;

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

        await markEmailAsRead(message.id);
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
    skipped: skipped.length,
    errors,
    debug,
    timestamp: new Date().toISOString(),
  });
}
