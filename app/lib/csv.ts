import Papa, { type ParseResult } from 'papaparse';
import { reportConsoleError } from '@/lib/logger';
import { MONTH_NUMBERS, normalizeMonth, normalizeYesNo, parseDate } from './csv/normalize';

// Common filter function for all parsers
export type CsvRow = Record<string, unknown>;

const filterRow = (row: unknown): boolean => {
  if (!row || typeof row !== 'object') {
    return false;
  }
  const record = row as CsvRow;
  const name = String(record.NAME || record.name || record.Name || '').trim();
  if (!name) {
    return false;
  }
  const lowerName = name.toLowerCase();
  if (lowerName === 'total' || lowerName === 'avg' || lowerName === 'average') {
    return false;
  }
  return true;
};

// Value of the first column (in priority order) with a truthy value, trimmed.
const pick = (row: CsvRow, ...keys: string[]): string => {
  for (const key of keys) {
    if (row[key]) {
      return String(row[key]).trim();
    }
  }
  return '';
};

const pickOrNull = (row: CsvRow, ...keys: string[]): string | null => pick(row, ...keys) || null;

// Shared Papa Parse setup: header row, delimiter sniffing, total/average rows
// dropped, and the same error reporting for every table.
const parseCsvFile = <T>(
  file: File,
  mapRow: (row: CsvRow) => T,
  onComplete: (data: T[]) => void
): void => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: ParseResult<CsvRow>) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row) => mapRow(row));
        onComplete(parsedData);
      } catch (error) {
        reportConsoleError('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: unknown) => {
      reportConsoleError('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
};

// Parser for Intros table
export type IntroCsvRecord = {
  month: string;
  date: string | undefined;
  year: number | undefined;
  time: string | null;
  class: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  staff: string | null;
  attended: 'Yes' | 'No' | '';
  signed_up: 'Yes' | 'No' | '';
  status: 'Active';
};

// A bare day number is combined with the month column and the import year.
const parseIntroDate = (monthStr: string, dayRaw: string, year?: number): string | undefined => {
  if (/^\d{1,2}$/.test(dayRaw) && year) {
    const monthNum = MONTH_NUMBERS[monthStr.toLowerCase()];
    if (monthNum) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${dayRaw.padStart(2, '0')}`;
    }
    return undefined;
  }
  return parseDate(dayRaw, year);
};

const mapIntroRow = (row: CsvRow, year?: number): IntroCsvRecord => {
  const monthStr = normalizeMonth(pick(row, 'MONTH', 'month', 'Month'));
  const dayRaw = pick(row, 'DATE', 'date', 'Date');
  const date = parseIntroDate(monthStr, dayRaw, year);
  return {
    month: monthStr,
    date,
    year: year,
    time: pickOrNull(row, 'TIME', 'time', 'Time'),
    class: pickOrNull(row, 'CLASS', 'class', 'Class'),
    name: pick(row, 'NAME', 'name', 'Name'),
    email: pickOrNull(row, 'EMAIL', 'email', 'Email'),
    phone: pickOrNull(row, 'PHONE', 'phone', 'Phone'),
    staff: pickOrNull(row, 'STAFF', 'staff', 'Staff'),
    attended: normalizeYesNo(pick(row, 'ATTENDED', 'attended', 'Attended')),
    signed_up: normalizeYesNo(pick(row, 'SIGNED UP', 'signed_up', 'Signed Up')),
    status: 'Active' as const,
  };
};

export const parseIntrosCSV = (
  file: File,
  onComplete: (data: IntroCsvRecord[]) => void,
  year?: number
) => {
  parseCsvFile(file, (row) => mapIntroRow(row, year), onComplete);
};

// Parser for Signups table (renamed from parseCSV)
export type SignupCsvRecord = {
  month: string;
  name: string;
  membership: string;
  membership_date: string | undefined;
  first_payment_date: string | undefined;
  signup_package: boolean;
  notes: string;
  year: number | undefined;
};

const mapSignupRow = (row: CsvRow, year?: number): SignupCsvRecord => {
  const membershipDateRaw = pick(
    row,
    'DATE',
    'MEMBERSHIP DATE',
    'SIGN UP DATE',
    'Sign Up Date',
    'Membership Date',
    'membership_date',
    'date'
  );

  const firstPaymentDateRaw = pick(
    row,
    '1ST PAYMENT DATE',
    'DATE 1ST PAYMENT',
    'First Payment Date',
    'first_payment_date'
  );

  return {
    month: normalizeMonth(pick(row, 'MONTH', 'month', 'Month')),
    name: pick(row, 'NAME', 'name', 'Name'),
    membership: pick(row, 'MEMBERSHIP', 'membership', 'Membership'),
    membership_date: parseDate(membershipDateRaw, year),
    first_payment_date: parseDate(firstPaymentDateRaw, year),
    signup_package: pick(
      row,
      'SIGN-UP PACKAGE?',
      'SIGNUP PACKAGE',
      'signup_package',
      'Signup Package'
    )
      .toLowerCase()
      .includes('yes'),
    notes: pick(row, 'NOTES', 'notes', 'Notes'),
    year: year,
  };
};

export const parseSignupsCSV = (
  file: File,
  onComplete: (data: SignupCsvRecord[]) => void,
  year?: number
) => {
  parseCsvFile(file, (row) => mapSignupRow(row, year), onComplete);
};

// Parser for Cancellations table
export type CancellationCsvRecord = {
  month: string;
  name: string;
  date: string | undefined;
  reason: string | null;
  age_group: string | null;
  notes: string | null;
  year: number | undefined;
};

const mapCancellationRow = (row: CsvRow, year?: number): CancellationCsvRecord => {
  const cancellationDateRaw = pick(
    row,
    'CANCELLATION DATE',
    'Cancellation Date',
    'cancellation_date',
    'DATE',
    'date'
  );

  return {
    month: normalizeMonth(pick(row, 'MONTH', 'month', 'Month')),
    name: pick(row, 'NAME', 'name', 'Name'),
    date: parseDate(cancellationDateRaw, year),
    reason: pickOrNull(row, 'REASON', 'reason', 'Reason'),
    age_group: pickOrNull(
      row,
      'AGE CATEGORY',
      'Age Category',
      'age_group',
      'Age Group',
      'AGE GROUP'
    ),
    notes: pickOrNull(row, 'NOTES', 'notes', 'Notes'),
    year: year,
  };
};

export const parseCancellationsCSV = (
  file: File,
  onComplete: (data: CancellationCsvRecord[]) => void,
  year?: number
) => {
  parseCsvFile(file, (row) => mapCancellationRow(row, year), onComplete);
};

// Parser for Holds table
export type HoldCsvRecord = {
  month: string;
  name: string;
  start: string | undefined;
  end: string | undefined;
  reason: string | null;
  fee: string | null;
  year: number | undefined;
};

const mapHoldRow = (row: CsvRow, year?: number): HoldCsvRecord => {
  const startDateRaw = pick(
    row,
    'START DATE',
    'Start Date',
    'start_date',
    'START',
    'Start',
    'start'
  );
  const endDateRaw = pick(row, 'END DATE', 'End Date', 'end_date', 'END', 'End', 'end');

  return {
    month: normalizeMonth(pick(row, 'MONTH', 'month', 'Month')),
    name: pick(row, 'NAME', 'name', 'Name'),
    start: parseDate(startDateRaw, year),
    end: parseDate(endDateRaw, year),
    reason: pickOrNull(row, 'REASON', 'reason', 'Reason'),
    fee: pickOrNull(row, 'FEE', 'fee', 'Fee'),
    year: year,
  };
};

export const parseHoldsCSV = (
  file: File,
  onComplete: (data: HoldCsvRecord[]) => void,
  year?: number
) => {
  parseCsvFile(file, (row) => mapHoldRow(row, year), onComplete);
};
