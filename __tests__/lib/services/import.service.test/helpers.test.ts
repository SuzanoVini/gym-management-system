// __tests__/lib/services/import.service.test/helpers.test.ts

import {
  createCSVTemplate,
  formatImportResult,
  type ImportResult,
  validateFileSize,
  validateFileType,
} from '../../../../app/lib/services/import.service';

describe('Import Service', () => {
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
