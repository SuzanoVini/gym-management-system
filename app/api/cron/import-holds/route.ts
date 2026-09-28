import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { createHoldImport } from '@/lib/jobs/importHolds';

export async function GET(req: NextRequest) {
  const unauthorizedResponse = verifyCronRequest(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const importHolds = createHoldImport();
  const errors: string[] = [];
  let counts: { imported: number; skipped: number; messagesFound: number };

  try {
    counts = await importHolds(errors);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    imported: counts.imported,
    skipped: counts.skipped,
    messagesFound: counts.messagesFound,
    errors,
    timestamp: new Date().toISOString(),
  });
}
