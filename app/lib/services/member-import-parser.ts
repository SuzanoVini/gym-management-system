import type { MemberImportRow } from '@/types';

export interface ZpMemberCsvRow {
  [key: string]: string | undefined;
}

const REQUIRED_HEADERS = [
  'First Name',
  'Last Name',
  'Signup Date',
  'Membership Label',
  'Mbr. Status',
];

const normalizeHeader = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const getField = (row: ZpMemberCsvRow, header: string): string => {
  const direct = row[header];
  if (direct !== undefined) {
    return direct.trim();
  }

  const expected = normalizeHeader(header);
  const matchedKey = Object.keys(row).find((key) => normalizeHeader(key) === expected);
  return matchedKey ? (row[matchedKey]?.trim() ?? '') : '';
};

export function getMissingMemberCsvHeaders(rows: ZpMemberCsvRow[]): string[] {
  const headerKeys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headerKeys.add(normalizeHeader(key));
    }
  }

  return REQUIRED_HEADERS.filter((header) => !headerKeys.has(normalizeHeader(header)));
}

function memberName(row: ZpMemberCsvRow): string {
  return `${getField(row, 'First Name')} ${getField(row, 'Last Name')}`.trim();
}

function buildCurrentNames(rows: ZpMemberCsvRow[]): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    if (getField(row, 'Mbr. Status').toUpperCase() === 'CURRENT') {
      const name = memberName(row);
      if (name) {
        set.add(name.toLowerCase());
      }
    }
  }
  return set;
}

function mapCsvRow(row: ZpMemberCsvRow, currentNames: Set<string>): MemberImportRow | null {
  const name = memberName(row);
  if (!name) {
    return null;
  }

  const mbrStatus = getField(row, 'Mbr. Status').toUpperCase();
  if (mbrStatus === 'NOT STARTED' && currentNames.has(name.toLowerCase())) {
    return null;
  }

  let status: MemberImportRow['status'];
  if (mbrStatus === 'CURRENT' || mbrStatus === 'NOT STARTED') {
    status = 'Active';
  } else if (mbrStatus === 'HOLD') {
    status = 'On Hold';
  } else {
    status = 'Inactive';
  }

  const mapped: MemberImportRow = { name, status };
  const email = getField(row, 'Email');
  if (email) {
    mapped.email = email;
  }
  const phone = getField(row, 'Phone');
  if (phone) {
    mapped.phone = phone;
  }
  const membershipType = getField(row, 'Membership Label');
  if (membershipType) {
    mapped.membership_type = membershipType;
  }
  const joinDate = getField(row, 'Signup Date');
  if (joinDate) {
    mapped.join_date = joinDate;
  }

  return mapped;
}

export function mapMemberCsvRows(rows: ZpMemberCsvRow[]): {
  rows: MemberImportRow[];
  skipped: number;
} {
  const currentNames = buildCurrentNames(rows);
  const mapped = rows.map((row) => mapCsvRow(row, currentNames));
  return {
    rows: mapped.filter((row): row is MemberImportRow => row !== null),
    skipped: mapped.filter((row) => row === null).length,
  };
}
