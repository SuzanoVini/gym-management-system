import Papa from 'papaparse';

// Helper function to parse dates from CSV
const parseDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  try {
    // Try parsing as MM/DD/YYYY or similar formats
    const cleanStr = dateStr.trim();
    const date = new Date(cleanStr);

    if (!Number.isNaN(date.getTime())) {
      // Convert to YYYY-MM-DD format for database
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
};

// Common filter function for all parsers
const filterRow = (row: any): boolean => {
  if (!row || typeof row !== 'object') {
    return false;
  }
  const name = String(row.NAME || row.name || row.Name || '').trim();
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
export const parseIntrosCSV = (file: File, onComplete: (data: any[]) => void) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: any) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row: any) => ({
          month: String(row.MONTH || row.month || row.Month || '').trim(),
          date: Number.parseInt(String(row.DATE || row.date || row.Date || '1').trim(), 10) || 1,
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
    error: (error: any) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
};

// Parser for Signups table (renamed from parseCSV)
export const parseSignupsCSV = (file: File, onComplete: (data: any[]) => void) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: any) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row: any) => {
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
            membership_date: parseDate(membershipDateRaw),
            first_payment_date: parseDate(firstPaymentDateRaw),
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
          };
        });
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: any) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
};

// Parser for Cancellations table
export const parseCancellationsCSV = (file: File, onComplete: (data: any[]) => void) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: any) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row: any) => {
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
            cancellation_date: parseDate(cancellationDateRaw),
            reason: String(row.REASON || row.reason || row.Reason || '').trim() || null,
            age_category:
              String(row['AGE CATEGORY'] || row.age_category || row['Age Category'] || '').trim() ||
              null,
            notes: String(row.NOTES || row.notes || row.Notes || '').trim() || null,
          };
        });
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: any) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
};

// Parser for Holds table
export const parseHoldsCSV = (file: File, onComplete: (data: any[]) => void) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: any) => {
      try {
        const parsedData = results.data.filter(filterRow).map((row: any) => {
          const startDateRaw = String(
            row['START DATE'] || row['Start Date'] || row.start_date || ''
          ).trim();

          const endDateRaw = String(
            row['END DATE'] || row['End Date'] || row.end_date || ''
          ).trim();

          return {
            month: String(row.MONTH || row.month || row.Month || '').trim(),
            name: String(row.NAME || row.name || row.Name || '').trim(),
            start_date: parseDate(startDateRaw),
            end_date: parseDate(endDateRaw),
            reason: String(row.REASON || row.reason || row.Reason || '').trim() || null,
            fee: String(row.FEE || row.fee || row.Fee || '').trim() || null,
          };
        });
        onComplete(parsedData);
      } catch (error) {
        console.error('Error processing CSV data:', error);
        alert('Error processing CSV file. Please check the file format.');
      }
    },
    error: (error: any) => {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the file format.');
    },
  });
};
