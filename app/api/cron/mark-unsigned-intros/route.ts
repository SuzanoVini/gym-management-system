import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calls the mark_unsigned_intros() SQL function created in Supabase SQL Editor
    // Uses COALESCE(date::date, created_at::date) to handle legacy null-date records
    const { data: count, error } = await supabase.rpc('mark_unsigned_intros');

    if (error) {
      console.error('mark-unsigned-intros error:', error);
      return NextResponse.json(
        { error: 'Failed to mark unsigned intros', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      marked: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('mark-unsigned-intros fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
