import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { reportConsoleError } from '@/lib/logger';
import { markUnsignedIntros } from '@/lib/supabase/maintenance';

export async function GET(request: Request) {
  try {
    const unauthorizedResponse = verifyCronRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const { count, error } = await markUnsignedIntros();

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
