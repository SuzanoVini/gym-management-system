export interface ParsedHold {
  name: string;
  start: string;
  end: string | null;
  reason: string | null;
  hold_status: string | null;
  month: string;
  year: number;
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

function parseToISO(raw: string | null): {
  iso: string | null;
  monthNum: number | null;
  year: number | null;
} {
  if (!raw) {
    return { iso: null, monthNum: null, year: null };
  }

  const textMatch = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (textMatch) {
    const [, monthName, dayRaw, yearRaw] = textMatch;
    if (!monthName || !dayRaw || !yearRaw) {
      return { iso: null, monthNum: null, year: null };
    }
    const monthNum = MONTH_TO_NUM[monthName];
    if (monthNum) {
      const year = parseInt(yearRaw, 10);
      return {
        iso: `${yearRaw}-${String(monthNum).padStart(2, '0')}-${dayRaw.padStart(2, '0')}`,
        monthNum,
        year,
      };
    }
  }

  const numMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numMatch) {
    const [, monthRaw, dayRaw, yearRaw] = numMatch;
    if (!monthRaw || !dayRaw || !yearRaw) {
      return { iso: null, monthNum: null, year: null };
    }
    const monthNum = parseInt(monthRaw, 10);
    const year = parseInt(yearRaw, 10);
    return {
      iso: `${yearRaw}-${String(monthNum).padStart(2, '0')}-${dayRaw.padStart(2, '0')}`,
      monthNum,
      year,
    };
  }

  return { iso: null, monthNum: null, year: null };
}

export function parseHoldEmail(text: string): ParsedHold | null {
  const name = extractField(text, 'Name');
  if (!name) {
    return null;
  }

  const { iso: start, monthNum, year } = parseToISO(extractField(text, 'Start date'));
  if (!start || !monthNum || !year) {
    return null;
  }

  const { iso: end } = parseToISO(extractField(text, 'End date'));

  return {
    name,
    start,
    end,
    reason: extractField(text, 'Reason'),
    hold_status: extractField(text, 'Hold Status'),
    month: MONTH_NUM_TO_ABBR[monthNum] ?? '',
    year,
  };
}
