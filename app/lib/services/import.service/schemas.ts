// app/lib/services/import.service/schemas.ts
// Import types and validation schemas; re-exported from import.service.
import { z } from 'zod';

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
export const staffCsvSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  full_name: z.string().min(1, 'Full name is required'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  job_title: z.string().min(1, 'Job title is required'),
  department: z.string().optional(),
  is_contractor: z.boolean().optional(),
});

// Hours CSV validation schema
export const hoursCsvSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  hours: z.number().min(0).max(24, 'Hours must be between 0 and 24'),
  type: z.enum(['regular', 'overtime', 'vacation', 'mat_clean']).default('regular'),
  notes: z.string().optional(),
  is_after_school_program: z.boolean().optional().default(false),
});

export type StaffCsvRow = z.infer<typeof staffCsvSchema>;
export type HoursCsvRow = z.infer<typeof hoursCsvSchema>;
