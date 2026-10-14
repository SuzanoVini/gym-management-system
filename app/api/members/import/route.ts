import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
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

function getUploadError(file: File): NextResponse | null {
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

  return null;
}

function parseMemberCsv(text: string): { rows: ZpMemberCsvRow[] } | { response: NextResponse } {
  const { data: rows, errors: parseErrors } = Papa.parse<ZpMemberCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0) {
    return {
      response: NextResponse.json(
        { error: 'CSV parse error', details: parseErrors.map((e) => e.message) },
        { status: 400 }
      ),
    };
  }

  const missingHeaders = getMissingMemberCsvHeaders(rows);
  if (missingHeaders.length > 0) {
    return {
      response: NextResponse.json(
        { error: 'Missing required CSV columns', missingHeaders },
        { status: 400 }
      ),
    };
  }

  return { rows };
}

async function importMemberRows(
  supabase: SupabaseClient,
  rows: ZpMemberCsvRow[]
): Promise<NextResponse> {
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

export async function POST(req: NextRequest) {
  // auth-helpers 0.10 declares its return with pre-2.5x SupabaseClient generics, which
  // mis-map against the installed supabase-js; the runtime object is a plain SupabaseClient.
  const supabase = createRouteHandlerClient({ cookies }) as unknown as SupabaseClient;
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

  const uploadError = getUploadError(file);
  if (uploadError) {
    return uploadError;
  }

  const text = await file.text();
  const parsed = parseMemberCsv(text);
  if ('response' in parsed) {
    return parsed.response;
  }

  return importMemberRows(supabase, parsed.rows);
}
