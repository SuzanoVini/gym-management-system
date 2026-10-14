// app/lib/services/import.service.ts
import Papa from 'papaparse';
import type { z } from 'zod';
import {
  type HoursCsvRow,
  hoursCsvSchema,
  type ImportResult,
  type ParsedData,
  staffCsvSchema,
  type ValidatedData,
  type ValidationError,
} from './import.service/schemas';
import {
  mapCSVColumns,
  transformToHoursRecords,
  transformToStaffRecords,
} from './import.service/transform';

/**
 * Import Service - CSV/PDF parsing and data import for payroll system
 *
 * Features:
 * - CSV parsing with Papa Parse
 * - Staff data import with validation
 * - Hours data import with format detection
 * - Column mapping and type detection
 * - Comprehensive error handling
 */

export {
  createCSVTemplate,
  formatImportResult,
  validateFileSize,
  validateFileType,
} from './import.service/helpers';
export type {
  CSVType,
  EntryType,
  HoursCsvRow,
  ImportResult,
  ParsedData,
  StaffCsvRow,
  ValidatedData,
  ValidationError,
} from './import.service/schemas';
export {
  detectCSVType,
  mapCSVColumns,
  transformToHoursRecords,
  transformToStaffRecords,
} from './import.service/transform';

// ============================================================================
// Core CSV Parsing Functions
// ============================================================================

/**
 * Parse CSV file content into structured data
 *
 * @param fileContent - Raw CSV file content as string
 * @returns Array of parsed data objects
 * @throws Error if parsing fails
 */
export async function parseCSV(fileContent: string): Promise<ParsedData[]> {
  if (!fileContent.trim()) {
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    Papa.parse<ParsedData>(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Auto-convert numbers and booleans
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors.map((err) => `Row ${err.row}: ${err.message}`);
          reject(new Error(`CSV parsing errors:\n${errorMessages.join('\n')}`));
          return;
        }
        resolve(results.data as ParsedData[]);
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Parse CSV from File object
 *
 * @param file - File object from input
 * @returns Parsed CSV data
 */
export async function parseCSVFromFile(file: File): Promise<ParsedData[]> {
  const content = await file.text();
  return parseCSV(content);
}

// ============================================================================
// Data Validation
// ============================================================================

/**
 * Validate imported data against schema
 *
 * @param data - Array of data to validate
 * @param schema - Zod schema for validation
 * @returns Object with valid and invalid data
 */
export function validateImportData<T>(data: unknown[], schema: z.ZodSchema<T>): ValidatedData<T> {
  const valid: T[] = [];
  const invalid: ValidationError[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const result = schema.safeParse(row);

    if (result.success) {
      valid.push(result.data);
    } else {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });

      invalid.push({
        row: i + 2, // +2 because row 1 is header, array is 0-indexed
        errors,
      });
    }
  }

  return { valid, invalid };
}

// ============================================================================
// Import Functions
// ============================================================================

// Summarize validation failures: a count line, the first 10 rows, then a tail count.
function formatValidationErrors(invalid: ValidationError[]): string[] {
  const errors: string[] = [];

  if (invalid.length > 0) {
    errors.push(
      `${invalid.length} rows failed validation:`,
      ...invalid.slice(0, 10).map((err) => `Row ${err.row}: ${err.errors.join(', ')}`),
      ...(invalid.length > 10 ? [`...and ${invalid.length - 10} more errors`] : [])
    );
  }

  return errors;
}

/**
 * Import staff data from CSV file
 *
 * @param file - CSV file containing staff data
 * @returns Import result with success status, count, and errors
 */
export async function importStaffCSV(file: File): Promise<ImportResult> {
  try {
    // Parse CSV
    const parsedData = await parseCSVFromFile(file);

    if (parsedData.length === 0) {
      return {
        success: false,
        imported: 0,
        errors: ['CSV file is empty'],
      };
    }

    // Map columns
    const headers = Object.keys(parsedData[0] ?? {});
    const columnMapping = mapCSVColumns(headers);

    // Transform data
    const staffRecords = transformToStaffRecords(parsedData, columnMapping);

    // Validate data
    const { valid, invalid } = validateImportData(staffRecords, staffCsvSchema);

    // Format validation errors
    const errors = formatValidationErrors(invalid);

    // Return results
    return {
      success: valid.length > 0,
      imported: valid.length,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error during import'],
    };
  }
}

// Additional validation: flag duplicate entries (same employee, same date).
// Appends an error per duplicate and returns the number of unique entries.
function checkDuplicateHours(valid: HoursCsvRow[], errors: string[]): number {
  const duplicateCheck = new Map<string, number>();
  for (let i = 0; i < valid.length; i++) {
    const record = valid[i];
    if (!record) {
      continue;
    }

    const key = `${record.employee_id}-${record.date}`;
    if (duplicateCheck.has(key)) {
      errors.push(
        `Duplicate entry found: Employee ${record.employee_id} on ${record.date} ` +
          `(rows ${(duplicateCheck.get(key) ?? 0) + 2} and ${i + 2})`
      );
    } else {
      duplicateCheck.set(key, i);
    }
  }
  return duplicateCheck.size;
}

/**
 * Import hours data from CSV file
 *
 * @param file - CSV file containing hours data
 * @param periodId - Payroll period ID to associate hours with
 * @returns Import result with success status, count, and errors
 */
export async function importHoursCSV(file: File, periodId: string): Promise<ImportResult> {
  try {
    // Validate period ID
    if (!periodId || periodId.trim() === '') {
      return {
        success: false,
        imported: 0,
        errors: ['Period ID is required for hours import'],
      };
    }

    // Parse CSV
    const parsedData = await parseCSVFromFile(file);

    if (parsedData.length === 0) {
      return {
        success: false,
        imported: 0,
        errors: ['CSV file is empty'],
      };
    }

    // Map columns
    const headers = Object.keys(parsedData[0] ?? {});
    const columnMapping = mapCSVColumns(headers);

    // Transform data
    const hoursRecords = transformToHoursRecords(parsedData, columnMapping);

    // Validate data
    const { valid, invalid } = validateImportData(hoursRecords, hoursCsvSchema);

    // Format validation errors
    const errors = formatValidationErrors(invalid);

    const uniqueCount = checkDuplicateHours(valid, errors);

    // Return results
    return {
      success: valid.length > 0 && uniqueCount === valid.length,
      imported: valid.length,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error during import'],
    };
  }
}

// ============================================================================
// PDF Import (Placeholder for future implementation)
// ============================================================================

/**
 * Parse PDF file content (placeholder)
 *
 * @param file - PDF file to parse
 * @returns Parsed data from PDF (always a rejected promise for now)
 *
 * @future Use libraries like pdf-parse or pdfjs-dist for implementation
 */
export function parsePDF(_file: File): Promise<ParsedData[]> {
  // Placeholder implementation
  return Promise.reject(
    new Error(
      'PDF parsing not yet implemented. ' +
        'Consider using libraries like pdf-parse or pdfjs-dist for extraction of tabular data.'
    )
  );
}

/**
 * Import hours data from PDF file (placeholder)
 *
 * @param file - PDF file containing timecard data
 * @param periodId - Payroll period ID
 * @returns Import result
 */
export async function importHoursPDF(file: File, _periodId: string): Promise<ImportResult> {
  try {
    await parsePDF(file);

    return {
      success: false,
      imported: 0,
      errors: ['PDF import not yet implemented'],
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error during PDF import'],
    };
  }
}
