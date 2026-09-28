import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { reportConsoleError } from '@/lib/logger';
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
    const result = await supabase.rpc('mark_unsigned_intros');
    const count = result.data as number | null;
    const { error } = result;

    if (error) {
      reportConsoleError('mark-unsigned-intros error:', error);
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
    reportConsoleError('mark-unsigned-intros fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
