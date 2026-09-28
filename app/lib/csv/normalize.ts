// app/lib/csv/normalize.ts
// Date, month and yes/no normalization shared by the table CSV parsers in lib/csv.
import { reportConsoleError } from '@/lib/logger';

// MM/DD or DD/MM without a year, or MM/DD/YYYY.
const parseNumericDate = (cleanStr: string, year?: number): string | undefined => {
  // MM/DD or DD/MM without a year — two 1-2-digit numbers separated by / - or .
  const twoPartMatch = cleanStr.match(/^(\d{1,2})[/\-.](\d{1,2})$/);
  if (twoPartMatch) {
    const [, part1, part2] = twoPartMatch as [string, string, string];
    const y = year ?? new Date().getFullYear();
    return `${y}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mmddyyyy = cleanStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy as [string, string, string, string];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return undefined;
};

// Helper function to parse dates from CSV.
// Pass `year` when the CSV date only contains day and month (no year).
export const parseDate = (dateStr: string, year?: number): string | undefined => {
  if (!dateStr || dateStr.trim() === '') {
    return undefined;
  }

  try {
    const cleanStr = dateStr.trim();

    const numericDate = parseNumericDate(cleanStr, year);
    if (numericDate !== undefined) {
      return numericDate;
    }

    // YYYY-MM-DD or any other full date string
    const date = new Date(cleanStr);
    if (!Number.isNaN(date.getTime())) {
      const y = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${month}-${day}`;
    }

    return undefined;
  } catch (error) {
    reportConsoleError('Error parsing date:', dateStr, error);
    return undefined;
  }
};

const MONTH_ABBREVS: Record<string, string> = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
  jan: 'Jan',
  feb: 'Feb',
  mar: 'Mar',
  apr: 'Apr',
  jun: 'Jun',
  jul: 'Jul',
  aug: 'Aug',
  sep: 'Sep',
  oct: 'Oct',
  nov: 'Nov',
  dec: 'Dec',
};

export const normalizeMonth = (raw: string): string =>
  MONTH_ABBREVS[raw.toLowerCase().trim()] ?? raw;

export const MONTH_NUMBERS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export const normalizeYesNo = (raw: string): 'Yes' | 'No' | '' => {
  const v = raw.toLowerCase().trim();
  if (v === 'yes' || v === 'true' || v === '1') {
    return 'Yes';
  }
  if (v === 'no' || v === 'false' || v === '0') {
    return 'No';
  }
  return '';
};
