// app/lib/services/import.service.ts
import Papa from 'papaparse';
import { z } from 'zod';

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

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ParsedData {
  [key: string]: string | number | boolean | null;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export interface ValidationError {
  row: number;
  errors: string[];
}

export interface ValidatedData<T> {
  valid: T[];
  invalid: ValidationError[];
}

export type CSVType = 'staff' | 'hours' | 'unknown';

export type EntryType = 'regular' | 'overtime' | 'vacation' | 'mat_clean';

// ============================================================================
// Validation Schemas
// ============================================================================

// Staff CSV validation schema
const staffCsvSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  full_name: z.string().min(1, 'Full name is required'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  job_title: z.string().min(1, 'Job title is required'),
  department: z.string().optional(),
  is_contractor: z.boolean().optional(),
});

// Hours CSV validation schema
const hoursCsvSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  hours: z.number().min(0).max(24, 'Hours must be between 0 and 24'),
  type: z.enum(['regular', 'overtime', 'vacation', 'mat_clean']).default('regular'),
  notes: z.string().optional(),
  is_after_school_program: z.boolean().optional().default(false),
});

export type StaffCsvRow = z.infer<typeof staffCsvSchema>;
export type HoursCsvRow = z.infer<typeof hoursCsvSchema>;

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
// CSV Type Detection
// ============================================================================

/**
 * Detect CSV type based on column headers
 *
 * @param headers - Array of column header names
 * @returns Detected CSV type ('staff' | 'hours' | 'unknown')
 */
export function detectCSVType(headers: string[]): CSVType {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // Staff CSV indicators
  const staffIndicators = [
    'payroll id',
    'payroll_id',
    'employee_id',
    'first name',
    'first_name',
    'last name',
    'last_name',
    'job title',
    'job_title',
  ];

  // Hours CSV indicators
  const hoursIndicators = ['date', 'hours', 'type', 'regular', 'overtime', 'vacation'];

  const staffScore = staffIndicators.filter((indicator) =>
    lowerHeaders.some((h) => h.includes(indicator) || indicator.includes(h))
  ).length;

  const hoursScore = hoursIndicators.filter((indicator) =>
    lowerHeaders.some((h) => h.includes(indicator) || indicator.includes(h))
  ).length;

  if (staffScore >= 3) {
    return 'staff';
  }
  if (hoursScore >= 2) {
    return 'hours';
  }
  return 'unknown';
}

// ============================================================================
// Column Mapping
// ============================================================================

/**
 * Map CSV column headers to standardized database field names
 *
 * @param headers - Array of CSV column headers
 * @returns Mapping object from CSV columns to database fields
 */
export function mapCSVColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const columnMap: Record<string, string[]> = {
    employee_id: ['payroll id', 'payroll_id', 'employee id', 'employee_id', 'emp_id', 'id'],
    full_name: ['employee name', 'full name', 'full_name', 'name'],
    first_name: ['first name', 'first_name', 'firstname', 'fname'],
    last_name: ['last name', 'last_name', 'lastname', 'lname'],
    job_title: ['job title', 'job_title', 'title', 'position', 'role'],
    department: ['department', 'dept', 'department name', 'department_name'],
    is_contractor: ['is contractor', 'is_contractor', 'contractor', 'contract'],
    date: ['date', 'work date', 'work_date', 'entry_date'],
    hours: ['hours', 'total hours', 'total_hours', 'hours worked', 'hours_worked'],
    type: ['type', 'hours type', 'hours_type', 'entry_type', 'category'],
    notes: ['notes', 'note', 'comments', 'description'],
    user: ['user', 'staff', 'staff member', 'staff_member', 'employee'],
    actor: ['actor'],
  };

  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(columnMap)) {
      if (aliases.some((alias) => lowerHeader === alias || lowerHeader.includes(alias))) {
        mapping[header] = field;
        break;
      }
    }

    // If no mapping found, keep original header in snake_case
    if (!mapping[header]) {
      mapping[header] = header.toLowerCase().replace(/\s+/g, '_');
    }
  }

  return mapping;
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform parsed CSV data to staff records
 *
 * @param data - Parsed CSV data
 * @param columnMapping - Column name mappings
 * @returns Array of staff records
 */
export function transformToStaffRecords(
  data: ParsedData[],
  columnMapping: Record<string, string>
): Partial<StaffCsvRow>[] {
  return data.map((row) => {
    const transformed: Partial<StaffCsvRow> = {};

    for (const [csvCol, dbField] of Object.entries(columnMapping)) {
      const value = row[csvCol];

      switch (dbField) {
        case 'employee_id':
          transformed.employee_id = String(value ?? '').trim();
          break;
        case 'full_name':
          transformed.full_name = String(value ?? '').trim();
          break;
        case 'first_name':
          transformed.first_name = String(value ?? '').trim();
          break;
        case 'last_name':
          transformed.last_name = String(value ?? '').trim();
          break;
        case 'job_title':
          transformed.job_title = String(value ?? '').trim();
          break;
        case 'department':
          transformed.department = String(value ?? '').trim();
          break;
        case 'is_contractor':
          transformed.is_contractor = Boolean(value);
          break;
      }
    }

    // Auto-generate full_name if first_name and last_name are provided
    if (!transformed.full_name && transformed.first_name && transformed.last_name) {
      transformed.full_name = `${transformed.first_name} ${transformed.last_name}`.trim();
    }

    return transformed;
  });
}

/**
 * Transform parsed CSV data to hours records
 *
 * @param data - Parsed CSV data
 * @param columnMapping - Column name mappings
 * @returns Array of hours records
 */
export function transformToHoursRecords(
  data: ParsedData[],
  columnMapping: Record<string, string>
): Partial<HoursCsvRow>[] {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CSV transformation logic requires extensive mapping
  return data.map((row) => {
    const transformed: Partial<HoursCsvRow> = {};

    for (const [csvCol, dbField] of Object.entries(columnMapping)) {
      const value = row[csvCol];

      switch (dbField) {
        case 'employee_id':
          transformed.employee_id = String(value ?? '').trim();
          break;
        case 'date':
          transformed.date = String(value ?? '').trim();
          break;
        case 'notes':
          transformed.notes = String(value ?? '').trim();
          break;

        case 'hours': {
          // Validate hours are in multiples of 0.25 (15-minute increments)
          const hours = Number(value);
          if (!Number.isNaN(hours)) {
            transformed.hours = Math.round(hours * 4) / 4; // Round to nearest 0.25
          }
          break;
        }

        case 'type': {
          const typeValue = String(value ?? '').toLowerCase();
          if (['regular', 'overtime', 'vacation', 'mat_clean'].includes(typeValue)) {
            transformed.type = typeValue as EntryType;
          } else if (typeValue.includes('ot') || typeValue.includes('1.5')) {
            transformed.type = 'overtime';
          } else if (typeValue.includes('vac')) {
            transformed.type = 'vacation';
          } else if (typeValue.includes('mat') || typeValue.includes('clean')) {
            transformed.type = 'mat_clean';
          } else {
            transformed.type = 'regular';
          }
          break;
        }
      }
    }

    // Auto-detect After School Program from notes
    if (transformed.notes) {
      const notesLower = transformed.notes.toLowerCase();
      const afterSchoolKeywords = [
        'asp',
        'after school',
        'afterschool',
        'pickup',
        'pick up',
        'pick-up',
      ];

      transformed.is_after_school_program = afterSchoolKeywords.some((keyword) =>
        notesLower.includes(keyword)
      );
    }

    return transformed;
  });
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

    // Detect and map columns
    const headers = Object.keys(parsedData[0] ?? {});
    const csvType = detectCSVType(headers);

    if (csvType !== 'staff') {
      return {
        success: false,
        imported: 0,
        errors: [
          `Invalid CSV format. Expected staff CSV but detected: ${csvType}. ` +
            'Staff CSV should contain columns like: Payroll ID, First Name, Last Name, Job Title',
        ],
      };
    }

    const columnMapping = mapCSVColumns(headers);

    // Transform data
    const staffRecords = transformToStaffRecords(parsedData, columnMapping);

    // Validate data
    const { valid, invalid } = validateImportData(staffRecords, staffCsvSchema);

    const errors: string[] = [];

    // Format validation errors
    if (invalid.length > 0) {
      errors.push(
        `${invalid.length} rows failed validation:`,
        ...invalid.slice(0, 10).map((err) => `Row ${err.row}: ${err.errors.join(', ')}`),
        ...(invalid.length > 10 ? [`...and ${invalid.length - 10} more errors`] : [])
      );
    }

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

/**
 * Import hours data from CSV file
 *
 * @param file - CSV file containing hours data
 * @param periodId - Payroll period ID to associate hours with
 * @returns Import result with success status, count, and errors
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Import validation and transformation requires complex logic
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

    // Detect and map columns
    const headers = Object.keys(parsedData[0] ?? {});
    const csvType = detectCSVType(headers);

    if (csvType !== 'hours') {
      return {
        success: false,
        imported: 0,
        errors: [
          `Invalid CSV format. Expected hours CSV but detected: ${csvType}. ` +
            'Hours CSV should contain columns like: Payroll ID, Date, Hours, Type',
        ],
      };
    }

    const columnMapping = mapCSVColumns(headers);

    // Transform data
    const hoursRecords = transformToHoursRecords(parsedData, columnMapping);

    // Validate data
    const { valid, invalid } = validateImportData(hoursRecords, hoursCsvSchema);

    const errors: string[] = [];

    // Format validation errors
    if (invalid.length > 0) {
      errors.push(
        `${invalid.length} rows failed validation:`,
        ...invalid.slice(0, 10).map((err) => `Row ${err.row}: ${err.errors.join(', ')}`),
        ...(invalid.length > 10 ? [`...and ${invalid.length - 10} more errors`] : [])
      );
    }

    // Additional validation: Check for duplicate entries (same employee, same date)
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

    // Return results
    return {
      success: valid.length > 0 && duplicateCheck.size === valid.length,
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
 * @returns Parsed data from PDF
 *
 * @future Use libraries like pdf-parse or pdfjs-dist for implementation
 */
export async function parsePDF(_file: File): Promise<ParsedData[]> {
  // Placeholder implementation
  throw new Error(
    'PDF parsing not yet implemented. ' +
      'Consider using libraries like pdf-parse or pdfjs-dist for extraction of tabular data.'
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate file type
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in megabytes
 * @returns True if file size is within limit
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Format import result as user-friendly message
 *
 * @param result - Import result object
 * @returns Formatted message string
 */
export function formatImportResult(result: ImportResult): string {
  if (result.success) {
    const message = `Successfully imported ${result.imported} record${result.imported === 1 ? '' : 's'}`;
    if (result.errors.length > 0) {
      return `${message}\n\nWarnings:\n${result.errors.join('\n')}`;
    }
    return message;
  }

  return `Import failed: ${result.errors.join('\n')}`;
}

/**
 * Create sample CSV template
 *
 * @param type - Type of CSV template to create
 * @returns CSV content as string
 */
export function createCSVTemplate(type: 'staff' | 'hours'): string {
  if (type === 'staff') {
    return [
      'Payroll ID,First Name,Last Name,Job Title,Department,Is Contractor',
      '1001,John,Doe,Instructor,Gym,false',
      '1002,Jane,Smith,Marketing Coordinator,Gym,false',
      '1003,Bob,Johnson,After School Program Helper,After School,false',
    ].join('\n');
  }

  return [
    'Payroll ID,Date,Hours,Type,Notes',
    '1001,2024-01-15,8.00,regular,',
    '1001,2024-01-16,1.00,overtime,Weekend shift',
    '1002,2024-01-15,6.50,regular,After School Program pickup',
  ].join('\n');
}
