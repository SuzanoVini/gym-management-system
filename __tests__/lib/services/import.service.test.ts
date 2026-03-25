// __tests__/lib/services/import.service.test.ts

import { z } from 'zod';
import {
  createCSVTemplate,
  detectCSVType,
  formatImportResult,
  type ImportResult,
  mapCSVColumns,
  type ParsedData,
  parseCSV,
  transformToHoursRecords,
  transformToStaffRecords,
  validateFileSize,
  validateFileType,
  validateImportData,
} from '../../../app/lib/services/import.service';

describe('Import Service', () => {
  // =========================================================================
  // CSV Parsing Tests
  // =========================================================================

  describe('parseCSV', () => {
    it('should parse valid CSV content', async () => {
      const csvContent = `name,age,email
John Doe,30,john@example.com
Jane Smith,25,jane@example.com`;

      const result = await parseCSV(csvContent);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      });
      expect(result[1]).toEqual({
        name: 'Jane Smith',
        age: 25,
        email: 'jane@example.com',
      });
    });

    it('should handle empty CSV', async () => {
      const csvContent = '';
      const result = await parseCSV(csvContent);
      expect(result).toHaveLength(0);
    });

    it('should skip empty lines', async () => {
      const csvContent = `name,value

John,100

Jane,200

`;
      const result = await parseCSV(csvContent);
      expect(result).toHaveLength(2);
    });

    it('should handle quoted fields with commas', async () => {
      const csvContent = `name,address
"Smith, John","123 Main St, Apt 4"`;

      const result = await parseCSV(csvContent);
      expect(result[0]).toEqual({
        name: 'Smith, John',
        address: '123 Main St, Apt 4',
      });
    });
  });

  // =========================================================================
  // CSV Type Detection Tests
  // =========================================================================

  describe('detectCSVType', () => {
    it('should detect staff CSV format', () => {
      const headers = ['Payroll ID', 'First Name', 'Last Name', 'Job Title'];
      expect(detectCSVType(headers)).toBe('staff');
    });

    it('should detect hours CSV format', () => {
      const headers = ['Employee ID', 'Date', 'Hours', 'Type'];
      expect(detectCSVType(headers)).toBe('hours');
    });

    it('should return unknown for ambiguous format', () => {
      const headers = ['Column A', 'Column B', 'Column C'];
      expect(detectCSVType(headers)).toBe('unknown');
    });

    it('should handle case-insensitive headers', () => {
      const headers = ['EMPLOYEE_ID', 'FIRST NAME', 'LAST NAME', 'JOB TITLE'];
      expect(detectCSVType(headers)).toBe('staff');
    });
  });

  // =========================================================================
  // Column Mapping Tests
  // =========================================================================

  describe('mapCSVColumns', () => {
    it('should map staff CSV columns correctly', () => {
      const headers = ['Payroll ID', 'First Name', 'Last Name', 'Job Title'];
      const mapping = mapCSVColumns(headers);

      expect(mapping['Payroll ID']).toBe('employee_id');
      expect(mapping['First Name']).toBe('first_name');
      expect(mapping['Last Name']).toBe('last_name');
      expect(mapping['Job Title']).toBe('job_title');
    });

    it('should map hours CSV columns correctly', () => {
      const headers = ['Employee ID', 'Date', 'Hours', 'Type', 'Notes'];
      const mapping = mapCSVColumns(headers);

      expect(mapping['Employee ID']).toBe('employee_id');
      expect(mapping.Date).toBe('date');
      expect(mapping.Hours).toBe('hours');
      expect(mapping.Type).toBe('type');
      expect(mapping.Notes).toBe('notes');
    });

    it('should handle alternative column names', () => {
      const headers = ['Emp ID', 'Full Name', 'Position'];
      const mapping = mapCSVColumns(headers);

      expect(mapping['Emp ID']).toBe('employee_id');
      expect(mapping['Full Name']).toBe('full_name');
      expect(mapping.Position).toBe('job_title');
    });
  });

  // =========================================================================
  // Data Transformation Tests
  // =========================================================================

  describe('transformToStaffRecords', () => {
    it('should transform staff data correctly', () => {
      const data: ParsedData[] = [
        {
          'Payroll ID': '1001',
          'First Name': 'John',
          'Last Name': 'Doe',
          'Job Title': 'Instructor',
        },
      ];

      const mapping = {
        'Payroll ID': 'employee_id',
        'First Name': 'first_name',
        'Last Name': 'last_name',
        'Job Title': 'job_title',
      };

      const result = transformToStaffRecords(data, mapping);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employee_id: '1001',
        first_name: 'John',
        last_name: 'Doe',
        job_title: 'Instructor',
        full_name: 'John Doe', // Auto-generated
      });
    });

    it('should handle full_name without first/last split', () => {
      const data: ParsedData[] = [
        {
          'Employee ID': '1002',
          'Full Name': 'Jane Smith',
          'Job Title': 'Helper',
        },
      ];

      const mapping = {
        'Employee ID': 'employee_id',
        'Full Name': 'full_name',
        'Job Title': 'job_title',
      };

      const result = transformToStaffRecords(data, mapping);

      expect(result[0]?.full_name).toBe('Jane Smith');
    });
  });

  describe('transformToHoursRecords', () => {
    it('should transform hours data correctly', () => {
      const data: ParsedData[] = [
        {
          'Employee ID': '1001',
          Date: '2024-01-15',
          Hours: 8.0,
          Type: 'regular',
          Notes: '',
        },
      ];

      const mapping = {
        'Employee ID': 'employee_id',
        Date: 'date',
        Hours: 'hours',
        Type: 'type',
        Notes: 'notes',
      };

      const result = transformToHoursRecords(data, mapping);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employee_id: '1001',
        date: '2024-01-15',
        hours: 8.0,
        type: 'regular',
        notes: '',
        is_after_school_program: false,
      });
    });

    it('should round hours to nearest 0.25', () => {
      const data: ParsedData[] = [
        {
          'Employee ID': '1001',
          Date: '2024-01-15',
          Hours: 8.33, // Should round to 8.25
        },
      ];

      const mapping = {
        'Employee ID': 'employee_id',
        Date: 'date',
        Hours: 'hours',
      };

      const result = transformToHoursRecords(data, mapping);

      expect(result[0]?.hours).toBe(8.25);
    });

    it('should detect overtime from type alias', () => {
      const data: ParsedData[] = [
        {
          'Employee ID': '1001',
          Date: '2024-01-15',
          Hours: 2.0,
          Type: '1.5', // Overtime indicator
        },
      ];

      const mapping = {
        'Employee ID': 'employee_id',
        Date: 'date',
        Hours: 'hours',
        Type: 'type',
      };

      const result = transformToHoursRecords(data, mapping);

      expect(result[0]?.type).toBe('overtime');
    });

    it('should detect After School Program from notes', () => {
      const data: ParsedData[] = [
        {
          'Employee ID': '1001',
          Date: '2024-01-15',
          Hours: 3.0,
          Notes: 'After School Program pickup',
        },
      ];

      const mapping = {
        'Employee ID': 'employee_id',
        Date: 'date',
        Hours: 'hours',
        Notes: 'notes',
      };

      const result = transformToHoursRecords(data, mapping);

      expect(result[0]?.is_after_school_program).toBe(true);
    });
  });

  // =========================================================================
  // Validation Tests
  // =========================================================================

  describe('validateImportData', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).max(120),
    });

    it('should separate valid and invalid data', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: '', age: 25 }, // Invalid: empty name
        { name: 'Jane', age: 200 }, // Invalid: age > 120
        { name: 'Bob', age: 40 },
      ];

      const result = validateImportData(data, schema);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(2);
    });

    it('should provide row numbers for invalid data', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: '', age: 25 }, // Row 3 (header is row 1, this is row 3)
      ];

      const result = validateImportData(data, schema);

      expect(result.invalid[0]?.row).toBe(3);
    });

    it('should provide error messages for invalid data', () => {
      const data = [{ name: '', age: -5 }];

      const result = validateImportData(data, schema);

      expect(result.invalid[0]?.errors.length).toBeGreaterThan(0);
      expect(result.invalid[0]?.errors.join(' ')).toContain('name');
    });
  });

  // =========================================================================
  // Helper Function Tests
  // =========================================================================

  describe('validateFileType', () => {
    it('should validate CSV file type', () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      expect(validateFileType(file, ['text/csv'])).toBe(true);
    });

    it('should reject invalid file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(validateFileType(file, ['text/csv'])).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept file within size limit', () => {
      const content = 'a'.repeat(1024 * 1024); // 1MB
      const file = new File([content], 'test.csv', { type: 'text/csv' });
      expect(validateFileSize(file, 5)).toBe(true); // 5MB limit
    });

    it('should reject file exceeding size limit', () => {
      const content = 'a'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([content], 'test.csv', { type: 'text/csv' });
      expect(validateFileSize(file, 5)).toBe(false); // 5MB limit
    });
  });

  describe('formatImportResult', () => {
    it('should format successful import', () => {
      const result: ImportResult = {
        success: true,
        imported: 10,
        errors: [],
      };

      const message = formatImportResult(result);
      expect(message).toContain('Successfully imported 10 records');
    });

    it('should format failed import', () => {
      const result: ImportResult = {
        success: false,
        imported: 0,
        errors: ['File is empty', 'Invalid format'],
      };

      const message = formatImportResult(result);
      expect(message).toContain('Import failed');
      expect(message).toContain('File is empty');
    });

    it('should include warnings for partial success', () => {
      const result: ImportResult = {
        success: true,
        imported: 8,
        errors: ['Row 3: Invalid date format', 'Row 7: Missing employee ID'],
      };

      const message = formatImportResult(result);
      expect(message).toContain('Successfully imported 8 records');
      expect(message).toContain('Warnings');
    });
  });

  describe('createCSVTemplate', () => {
    it('should create staff CSV template', () => {
      const template = createCSVTemplate('staff');
      expect(template).toContain('Payroll ID');
      expect(template).toContain('First Name');
      expect(template).toContain('Job Title');
    });

    it('should create hours CSV template', () => {
      const template = createCSVTemplate('hours');
      expect(template).toContain('Payroll ID');
      expect(template).toContain('Date');
      expect(template).toContain('Hours');
    });

    it('should include example data', () => {
      const template = createCSVTemplate('staff');
      const lines = template.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one example
    });
  });
});
