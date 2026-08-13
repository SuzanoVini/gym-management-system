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

// A live membership outranks an upcoming one, which outranks an expired/cancelled one.
const ZP_STATUS_RANK: Record<string, number> = { CURRENT: 3, HOLD: 2, 'NOT STARTED': 1 };

function mapCsvRow(row: ZpMemberCsvRow): MemberImportRow | null {
  const name = memberName(row);
  if (!name) {
    return null;
  }

  const mbrStatus = getField(row, 'Mbr. Status').toUpperCase();

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
  // A member can appear on several rows (renewal, or a rejoiner whose expired membership is
  // still listed alongside the new one). Keep the highest-ranked row so a returning member
  // imports as active instead of losing to whichever row happens to be upserted last.
  const best = new Map<string, MemberImportRow>();
  const bestRank = new Map<string, number>();
  let skipped = 0;

  for (const row of rows) {
    const mapped = mapCsvRow(row);
    if (!mapped) {
      skipped++;
      continue;
    }

    const key = mapped.name.toLowerCase();
    const rank = ZP_STATUS_RANK[getField(row, 'Mbr. Status').toUpperCase()] ?? 0;
    const currentRank = bestRank.get(key);
    if (currentRank !== undefined) {
      skipped++;
      if (currentRank >= rank) {
        continue;
      }
    }

    best.set(key, mapped);
    bestRank.set(key, rank);
  }

  return { rows: [...best.values()], skipped };
}
