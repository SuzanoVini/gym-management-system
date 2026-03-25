// app/constants/payroll.constants.ts

/**
 * Payroll System Constants
 *
 * Defines all constants used throughout the payroll system including
 * time increments, validation limits, keywords, and CSV export mappings.
 */

// ============================================================================
// Time and Hours Constants
// ============================================================================

/**
 * Minimum increment for hours tracking (15 minutes = 0.25 hours)
 */
export const HOURS_INCREMENT = 0.25;

/**
 * Standard time for mat cleaning task (15 minutes)
 */
export const MAT_CLEANING_HOURS = 0.25;

/**
 * Maximum hours allowed per day
 */
export const MAX_DAILY_HOURS = 24;

// ============================================================================
// Weekend Days
// ============================================================================

/**
 * Weekend days (Sunday = 0, Saturday = 6)
 * Based on JavaScript Date.getDay() values
 */
export const WEEKEND_DAYS = [0, 6] as const;

// ============================================================================
// After School Program Keywords
// ============================================================================

/**
 * Keywords used to detect After School Program entries in notes/descriptions
 * Case-insensitive matching is recommended when using these keywords
 */
export const AFTER_SCHOOL_KEYWORDS = [
  'asp',
  'after',
  'school',
  'afterschool',
  'after school',
  'pickup',
  'pick up',
  'pick-up',
  'after-school',
  'after school program',
] as const;

// ============================================================================
// CSV Export Configuration
// ============================================================================

/**
 * CSV column headers for payroll export
 * Maps internal field names to Wave Accounting CSV format
 */
export const CSV_HEADERS = {
  employee_name: 'Employee Name',
  payroll_id: 'Payroll ID',
  first_name: 'First Name',
  last_name: 'Last Name',
  job_id: 'Job ID',
  department: 'Department',
  overtime: 'Overtime Hours',
  regular: 'Regular Hours',
  vacation: 'Vacation Hours',
  external_id: 'External ID',
  job_title: 'Job Title',
} as const;

/**
 * Order of columns in CSV export
 */
export const CSV_COLUMN_ORDER = [
  'employee_name',
  'payroll_id',
  'first_name',
  'last_name',
  'job_id',
  'department',
  'overtime',
  'regular',
  'vacation',
  'external_id',
  'job_title',
] as const;

// ============================================================================
// Payroll Period Configuration
// ============================================================================

/**
 * Day of month when first payroll period ends (1st-15th)
 */
export const FIRST_PERIOD_END_DAY = 15;

/**
 * Day of month when second payroll period starts (16th)
 */
export const SECOND_PERIOD_START_DAY = 16;

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Minimum length for payroll ID
 */
export const MIN_PAYROLL_ID_LENGTH = 1;

/**
 * Maximum length for payroll ID
 */
export const MAX_PAYROLL_ID_LENGTH = 50;

/**
 * Regex pattern for payroll ID validation (alphanumeric with hyphens/underscores)
 */
export const PAYROLL_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

// ============================================================================
// Date Format Constants
// ============================================================================

/**
 * Short date format pattern (MM/DD/YY)
 */
export const DATE_FORMAT_SHORT = 'MM/DD/YY';

/**
 * ISO date format pattern (YYYY-MM-DD)
 */
export const DATE_FORMAT_ISO = 'YYYY-MM-DD';

/**
 * Period label format (MM/DD/YY - MM/DD/YY)
 */
export const PERIOD_LABEL_FORMAT = 'MM/DD/YY - MM/DD/YY';

// ============================================================================
// Type Exports
// ============================================================================

export type CsvHeaderKey = keyof typeof CSV_HEADERS;
export type CsvColumnName = (typeof CSV_COLUMN_ORDER)[number];
