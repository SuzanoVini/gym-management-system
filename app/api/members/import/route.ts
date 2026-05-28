import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { markStaleMembers, upsertMembers } from '@/lib/supabase/members';
import type { MemberImportRow } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ZpCsvRow {
  Name?: string;
  'Birth Date'?: string;
  Email?: string;
  Phone?: string;
  'Membership Type'?: string;
  Status?: string;
  'Join Date'?: string;
  [key: string]: string | undefined;
}

type MemberStatus = 'Active' | 'On Hold' | 'Inactive';

function normalizeStatus(raw: string | undefined): MemberStatus {
  const status = raw?.trim();
  if (status === 'Active' || status === 'On Hold' || status === 'Inactive') {
    return status;
  }
  return 'Active';
}

function mapCsvRow(row: ZpCsvRow): MemberImportRow | null {
  const name = row.Name?.trim();
  if (!name) {
    return null;
  }

  const mapped: MemberImportRow = {
    name,
    status: normalizeStatus(row.Status),
  };

  const birthDate = row['Birth Date']?.trim();
  if (birthDate) {
    mapped.birth_date = birthDate;
  }
  const email = row.Email?.trim();
  if (email) {
    mapped.email = email;
  }
  const phone = row.Phone?.trim();
  if (phone) {
    mapped.phone = phone;
  }
  const membershipType = row['Membership Type']?.trim();
  if (membershipType) {
    mapped.membership_type = membershipType;
  }
  const joinDate = row['Join Date']?.trim();
  if (joinDate) {
    mapped.join_date = joinDate;
  }

  return mapped;
}

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
  const { data: rows, errors: parseErrors } = Papa.parse<ZpCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0) {
    return NextResponse.json(
      { error: 'CSV parse error', details: parseErrors.map((e) => e.message) },
      { status: 400 }
    );
  }

  const syncTime = new Date().toISOString();
  const mapped = rows.map(mapCsvRow);
  const valid = mapped.filter((row): row is MemberImportRow => row !== null);
  const skippedCount = mapped.length - valid.length;

  const { upserted, errors: upsertErrors } = await upsertMembers(supabase, valid, syncTime);

  let markedInactive = 0;
  if (upsertErrors.length === 0) {
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
