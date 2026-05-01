import Papa, { type ParseResult } from 'papaparse';

// Helper function to parse dates from CSV.
// Pass `year` when the CSV date only contains day and month (no year).
const parseDate = (dateStr: string, year?: number): string | undefined => {
  if (!dateStr || dateStr.trim() === '') {
    return undefined;
  }

  try {
    const cleanStr = dateStr.trim();

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
    console.error('Error parsing date:', dateStr, error);
    return undefined;
  }
};

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

export const parseIntrosCSV = (
  file: File,
  onComplete: (data: IntroCsvRecord[]) => void,
  year?: number
) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: ParseResult<CsvRow>) => {
      try {
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CSV mapping normalizes many fields.
        const parsedData = results.data.filter(filterRow).map((row) => ({
          month: String(row.MONTH || row.month || row.Month || '').trim(),
          date: parseDate(String(row.DATE || row.date || row.Date || '').trim(), year),
          year: year,
          time: String(row.TIME || row.time || row.Time || '').trim() || null,
          class: String(row.CLASS || row.class || row.Class || '').trim() || null,
          name: String(row.NAME || row.name || row.Name || '').trim(),
          email: String(row.EMAIL || row.email || row.Email || '').trim() || null,
          phone: String(row.PHONE || row.phone || row.Phone || '').trim() || null,
          staff: String(row.STAFF || row.staff || row.Staff || '').trim() || null,
          attended: (String(row.ATTENDED || row.attended || row.Attended || '').trim() || '') as
            | 'Yes'
            | 'No'
            | '',
          signed_up: (String(row['SIGNED UP'] || row.signed_up || row['Signed Up'] || '').trim() ||
            '') as 'Yes' | 'No' | '',
          status: 'Active' as const,
        }));
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: unknown) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
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

export const parseSignupsCSV = (
  file: File,
  onComplete: (data: SignupCsvRecord[]) => void,
  year?: number
) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: ParseResult<CsvRow>) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row) => {
          const membershipDateRaw = String(
            row.DATE ||
              row['MEMBERSHIP DATE'] ||
              row['SIGN UP DATE'] ||
              row['Sign Up Date'] ||
              row['Membership Date'] ||
              row.membership_date ||
              row.date ||
              ''
          ).trim();

          const firstPaymentDateRaw = String(
            row['1ST PAYMENT DATE'] ||
              row['DATE 1ST PAYMENT'] ||
              row['First Payment Date'] ||
              row.first_payment_date ||
              ''
          ).trim();

          return {
            month: String(row.MONTH || row.month || row.Month || '').trim(),
            name: String(row.NAME || row.name || row.Name || '').trim(),
            membership: String(row.MEMBERSHIP || row.membership || row.Membership || '').trim(),
            membership_date: parseDate(membershipDateRaw, year),
            first_payment_date: parseDate(firstPaymentDateRaw, year),
            signup_package: String(
              row['SIGN-UP PACKAGE?'] ||
                row['SIGNUP PACKAGE'] ||
                row.signup_package ||
                row['Signup Package'] ||
                ''
            )
              .toLowerCase()
              .includes('yes'),
            notes: String(row.NOTES || row.notes || row.Notes || '').trim(),
            year: year,
          };
        });
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: unknown) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
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

export const parseCancellationsCSV = (
  file: File,
  onComplete: (data: CancellationCsvRecord[]) => void,
  year?: number
) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: ParseResult<CsvRow>) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row) => {
          const cancellationDateRaw = String(
            row['CANCELLATION DATE'] ||
              row['Cancellation Date'] ||
              row.cancellation_date ||
              row.DATE ||
              row.date ||
              ''
          ).trim();

          return {
            month: String(row.MONTH || row.month || row.Month || '').trim(),
            name: String(row.NAME || row.name || row.Name || '').trim(),
            date: parseDate(cancellationDateRaw, year),
            reason: String(row.REASON || row.reason || row.Reason || '').trim() || null,
            age_group:
              String(
                row['AGE CATEGORY'] ||
                  row['Age Category'] ||
                  row.age_group ||
                  row['Age Group'] ||
                  row['AGE GROUP'] ||
                  ''
              ).trim() || null,
            notes: String(row.NOTES || row.notes || row.Notes || '').trim() || null,
            year: year,
          };
        });
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: unknown) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
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

export const parseHoldsCSV = (
  file: File,
  onComplete: (data: HoldCsvRecord[]) => void,
  year?: number
) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: ParseResult<CsvRow>) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row) => {
          const startDateRaw = String(
            row['START DATE'] || row['Start Date'] || row.start_date || ''
          ).trim();

          const endDateRaw = String(
            row['END DATE'] || row['End Date'] || row.end_date || ''
          ).trim();

          return {
            month: String(row.MONTH || row.month || row.Month || '').trim(),
            name: String(row.NAME || row.name || row.Name || '').trim(),
            start: parseDate(startDateRaw, year),
            end: parseDate(endDateRaw, year),
            reason: String(row.REASON || row.reason || row.Reason || '').trim() || null,
            fee: String(row.FEE || row.fee || row.Fee || '').trim() || null,
            year: year,
          };
        });
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: unknown) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
};
