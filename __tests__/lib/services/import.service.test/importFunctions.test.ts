// Characterization tests for the CSV/PDF import entry points.

import {
  importHoursCSV,
  importHoursPDF,
  importStaffCSV,
  parsePDF,
} from '../../../../app/lib/services/import.service';

const csvFile = (content: string): File =>
  ({ text: () => Promise.resolve(content) }) as unknown as File;

describe('Import Service import functions', () => {
  it('imports staff CSVs', async () => {
    const results = [
      await importStaffCSV(csvFile('')),
      await importStaffCSV(
        csvFile(
          'Payroll ID,First Name,Last Name,Job Title\n1001,John,Doe,Coach\n,Jane,Smith,\n1003,Bob,Lee,Desk'
        )
      ),
      await importStaffCSV(csvFile('Payroll ID,Job Title\n,\n')),
      await importStaffCSV(csvFile('a,b\n1,2,3')),
    ];
    expect(JSON.stringify(results)).toMatchInlineSnapshot(
      `"[{"success":false,"imported":0,"errors":["CSV file is empty"]},{"success":true,"imported":2,"errors":["1 rows failed validation:","Row 3: employee_id: Employee ID is required, job_title: Job title is required"]},{"success":false,"imported":0,"errors":["1 rows failed validation:","Row 2: employee_id: Employee ID is required, full_name: Invalid input: expected string, received undefined, job_title: Job title is required"]},{"success":false,"imported":0,"errors":["CSV parsing errors:\\nRow 0: Too many fields: expected 2 fields but parsed 3"]}]"`
    );
  });

  it('imports hours CSVs', async () => {
    const many = Array.from({ length: 12 }, (_, i) => `100${i},bad-date,3,regular,`).join('\n');
    const results = [
      await importHoursCSV(csvFile('Payroll ID,Date,Hours\n1,2026-01-01,1'), ''),
      await importHoursCSV(csvFile('Payroll ID,Date,Hours\n1,2026-01-01,1'), '   '),
      await importHoursCSV(csvFile(''), 'p1'),
      await importHoursCSV(
        csvFile(
          'Payroll ID,Date,Hours,Type,Notes\n1001,01/15/2024,8.1,OT,asp pickup\n1001,2024-01-15,2,vac,\n1002,2024-01-16,30,regular,\n1003,2024-01-17,1,clean,'
        ),
        'p1'
      ),
      await importHoursCSV(csvFile(`Payroll ID,Date,Hours,Type,Notes\n${many}`), 'p1'),
      await importHoursCSV(csvFile('Payroll ID,Date,Hours\n1001,2024-01-15,4'), 'p1'),
      await importHoursCSV(csvFile('a,b\n1,2,3'), 'p1'),
    ];
    expect(JSON.stringify(results)).toMatchInlineSnapshot(
      `"[{"success":false,"imported":0,"errors":["Period ID is required for hours import"]},{"success":false,"imported":0,"errors":["Period ID is required for hours import"]},{"success":false,"imported":0,"errors":["CSV file is empty"]},{"success":false,"imported":3,"errors":["1 rows failed validation:","Row 4: hours: Hours must be between 0 and 24","Duplicate entry found: Employee 1001 on 2024-01-15 (rows 2 and 3)"]},{"success":false,"imported":0,"errors":["12 rows failed validation:","Row 2: date: Date must be in YYYY-MM-DD format","Row 3: date: Date must be in YYYY-MM-DD format","Row 4: date: Date must be in YYYY-MM-DD format","Row 5: date: Date must be in YYYY-MM-DD format","Row 6: date: Date must be in YYYY-MM-DD format","Row 7: date: Date must be in YYYY-MM-DD format","Row 8: date: Date must be in YYYY-MM-DD format","Row 9: date: Date must be in YYYY-MM-DD format","Row 10: date: Date must be in YYYY-MM-DD format","Row 11: date: Date must be in YYYY-MM-DD format","...and 2 more errors"]},{"success":true,"imported":1,"errors":[]},{"success":false,"imported":0,"errors":["CSV parsing errors:\\nRow 0: Too many fields: expected 2 fields but parsed 3"]}]"`
    );
  });

  it('rejects PDF parsing asynchronously', async () => {
    const pending = parsePDF(csvFile(''));
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toThrow('PDF parsing not yet implemented.');
    expect(JSON.stringify(await importHoursPDF(csvFile(''), 'p1'))).toMatchInlineSnapshot(
      `"{"success":false,"imported":0,"errors":["PDF parsing not yet implemented. Consider using libraries like pdf-parse or pdfjs-dist for extraction of tabular data."]}"`
    );
  });
});
