import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { createCancellationImport, type ImportCounts } from '@/lib/jobs/importCancellations';

export async function GET(req: NextRequest) {
  const unauthorizedResponse = verifyCronRequest(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const importCancellations = createCancellationImport();
  const counts: ImportCounts = { imported: 0, skipped: 0 };
  let messagesFound = 0;
  const errors: string[] = [];

  try {
    messagesFound = await importCancellations(errors, counts);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    imported: counts.imported,
    skipped: counts.skipped,
    messagesFound,
    errors,
    timestamp: new Date().toISOString(),
  });
}
