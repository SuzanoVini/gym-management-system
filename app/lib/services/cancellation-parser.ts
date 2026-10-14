export interface ParsedCancellation {
  name: string;
  date: string | null;
  reason: string | null;
  month: string;
  year: number | null;
}

const MONTH_TO_NUM: Record<string, number> = {
  January: 1,
  Jan: 1,
  February: 2,
  Feb: 2,
  March: 3,
  Mar: 3,
  April: 4,
  Apr: 4,
  May: 5,
  June: 6,
  Jun: 6,
  July: 7,
  Jul: 7,
  August: 8,
  Aug: 8,
  September: 9,
  Sep: 9,
  October: 10,
  Oct: 10,
  November: 11,
  Nov: 11,
  December: 12,
  Dec: 12,
};

const MONTH_NUM_TO_ABBR: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
};

function extractField(text: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}:\\s*([^\r\n]*)`));
  const value = match?.[1]?.trim().replace(/\r$/, '') ?? null;
  return value || null;
}

interface ParsedDate {
  iso: string | null;
  month: string;
  year: number | null;
}

// "May 15, 2026" style dates. Returns undefined when the text is not a
// recognised month name so the caller can fall back to the numeric format.
function parseTextDate(raw: string): ParsedDate | undefined {
  const textMatch = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (!textMatch) {
    return undefined;
  }
  const [, monthName, dayRaw, yearRaw] = textMatch;
  if (!monthName || !dayRaw || !yearRaw) {
    return { iso: null, month: '', year: null };
  }
  const monthNum = MONTH_TO_NUM[monthName];
  if (!monthNum) {
    return undefined;
  }
  const year = parseInt(yearRaw, 10);
  return {
    iso: `${yearRaw}-${String(monthNum).padStart(2, '0')}-${dayRaw.padStart(2, '0')}`,
    month: MONTH_NUM_TO_ABBR[monthNum] ?? '',
    year,
  };
}

function parseToISO(raw: string | null): ParsedDate {
  if (!raw) {
    return { iso: null, month: '', year: null };
  }

  const textDate = parseTextDate(raw);
  if (textDate) {
    return textDate;
  }

  const numMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numMatch) {
    const [, monthRaw, dayRaw, yearRaw] = numMatch;
    if (!monthRaw || !dayRaw || !yearRaw) {
      return { iso: null, month: '', year: null };
    }
    const month = parseInt(monthRaw, 10);
    const year = parseInt(yearRaw, 10);
    return {
      iso: `${yearRaw}-${String(month).padStart(2, '0')}-${dayRaw.padStart(2, '0')}`,
      month: MONTH_NUM_TO_ABBR[month] ?? '',
      year,
    };
  }

  return { iso: null, month: '', year: null };
}

export function parseCancellationEmail(text: string): ParsedCancellation | null {
  const name = extractField(text, 'Name');
  if (!name) {
    return null;
  }

  const reason = extractField(text, 'Reason');
  const { iso, month, year } = parseToISO(extractField(text, 'Effective date'));

  return { name, date: iso, reason, month, year };
}
