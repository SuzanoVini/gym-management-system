import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import {
  getMissingMemberCsvHeaders,
  mapMemberCsvRows,
  type ZpMemberCsvRow,
} from '@/lib/services/member-import-parser';
import { markStaleMembers, upsertMembers } from '@/lib/supabase/members';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'CSV file is too large' }, { status: 400 });
  }

  const isCsv =
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.toLowerCase().endsWith('.csv');
  if (!isCsv) {
    return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
  }

  const text = await file.text();
  const { data: rows, errors: parseErrors } = Papa.parse<ZpMemberCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0) {
    return NextResponse.json(
      { error: 'CSV parse error', details: parseErrors.map((e) => e.message) },
      { status: 400 }
    );
  }

  const missingHeaders = getMissingMemberCsvHeaders(rows);
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      { error: 'Missing required CSV columns', missingHeaders },
      { status: 400 }
    );
  }

  const syncTime = new Date().toISOString();
  const { rows: valid, skipped: skippedCount } = mapMemberCsvRows(rows);

  const { upserted, errors: upsertErrors } = await upsertMembers(supabase, valid, syncTime);

  let markedInactive = 0;
  if (upsertErrors.length === 0 && valid.length > 0) {
    try {
      markedInactive = await markStaleMembers(supabase, syncTime);
    } catch (err) {
      return NextResponse.json(
        {
          error: 'Members imported, but stale-member marking failed',
          upserted,
          markedInactive: 0,
          skipped: skippedCount,
          errors: [String(err)],
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    upserted,
    markedInactive,
    skipped: skippedCount,
    errors: upsertErrors,
  });
}
