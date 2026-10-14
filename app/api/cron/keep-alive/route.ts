import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { reportConsoleError } from '@/lib/logger';
import { pingDatabase } from '@/lib/supabase/maintenance';

export async function GET(request: Request) {
  try {
    const unauthorizedResponse = verifyCronRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    // Perform a simple database query to keep the project active
    const { error } = await pingDatabase();

    if (error) {
      reportConsoleError('Keep-alive query error:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Keep-alive ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reportConsoleError('Keep-alive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
