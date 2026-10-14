import { type NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron';
import { createIntroImport } from '@/lib/jobs/importIntros';

export async function GET(req: NextRequest) {
  const unauthorizedResponse = verifyCronRequest(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const introImport = createIntroImport();

  const { data: classMappingRows, error: classMappingError } =
    await introImport.fetchClassMappings();

  if (classMappingError) {
    return NextResponse.json(
      { error: 'Failed to fetch class mappings', details: classMappingError.message },
      { status: 500 }
    );
  }

  const classMapping: Record<string, string> = Object.fromEntries(
    (classMappingRows ?? []).map((r) => [r.zenplanner_name, r.system_name])
  );

  const staffList = await introImport.loadStaffList();

  const ctx = introImport.createContext(classMapping, staffList);
  let messagesFound = 0;
  try {
    messagesFound = await introImport.importMessages(ctx);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const deduped = await introImport.dedupe();

  return NextResponse.json({
    imported: ctx.counts.imported,
    enriched: ctx.counts.enriched,
    deduped,
    messagesFound,
    skipped: ctx.skipped.length,
    errors: ctx.errors,
    timestamp: new Date().toISOString(),
  });
}
