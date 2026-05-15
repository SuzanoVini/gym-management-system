import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const unauthorizedResponse = verifyCronRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const supabase = createAdminClient();

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
