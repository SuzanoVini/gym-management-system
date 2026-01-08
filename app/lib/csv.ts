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

export const parseCSV = (file: File, onComplete: (data: any[]) => void) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: false, // Keep as strings to parse dates manually
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';'],
    transformHeader: (header: string) => header.trim(),
    complete: (results: any) => {
      try {
        const parsedData = results.data
          .filter((row: any) => {
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
          })
          .map((row: any) => {
            // Parse membership_date (could be "DATE", "MEMBERSHIP DATE", "SIGN UP DATE", etc.)
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

            // Parse first_payment_date
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
