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

    // Perform a simple database query to keep the project active
    // Using settings table as it's lightweight
    const { error } = await supabase.from('settings').select('id').limit(1).single();

    if (error) {
      console.error('Keep-alive query error:', error);
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
    console.error('Keep-alive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
