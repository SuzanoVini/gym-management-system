// app/lib/utils/validation.utils.ts

/**
 * Input Validation Utility Functions
 *
 * Provides validation functions for payroll data including hours,
 * payroll IDs, date ranges, and staff member data.
 */

import {
  AFTER_SCHOOL_KEYWORDS,
  HOURS_INCREMENT,
  MAX_DAILY_HOURS,
  MAX_PAYROLL_ID_LENGTH,
  MIN_PAYROLL_ID_LENGTH,
  PAYROLL_ID_PATTERN,
} from '@/constants/payroll.constants';
import type { StaffMember } from '@/types';

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Standard validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validation result with multiple errors
 */
export interface MultiValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Hours Validation Functions
// ============================================================================

/**
 * Validate that hours are in valid increments (multiples of 0.25)
 *
 * The payroll system tracks time in 15-minute increments (0.25 hours).
 * This function ensures hours values are valid multiples of this increment.
 *
 * @param hours - Number of hours to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateHours(1.5) // { valid: true }
 * validateHours(1.25) // { valid: true }
 * validateHours(1.33) // { valid: false, error: "Hours must be in 0.25 increments..." }
 * validateHours(-1) // { valid: false, error: "Hours must be non-negative" }
 */
export function validateHours(hours: number): ValidationResult {
  // Check if hours is a valid number
  if (typeof hours !== 'number' || Number.isNaN(hours)) {
    return {
      valid: false,
      error: 'Hours must be a valid number',
    };
  }

  // Check for negative hours
  if (hours < 0) {
    return {
      valid: false,
      error: 'Hours must be non-negative',
    };
  }

  // Check if hours is a multiple of HOURS_INCREMENT (0.25)
  const remainder = hours % HOURS_INCREMENT;
  if (remainder !== 0 && Math.abs(remainder - HOURS_INCREMENT) > 0.0001) {
    return {
      valid: false,
      error: `Hours must be in ${HOURS_INCREMENT} increments (0.25, 0.5, 0.75, 1.0, etc.)`,
    };
  }

  return { valid: true };
}

/**
 * Check if hours value is within daily maximum limit
 *
 * @param hours - Number of hours to validate
 * @returns True if hours are valid (between 0 and MAX_DAILY_HOURS)
 *
 * @example
 * isValidDailyHours(8) // true
 * isValidDailyHours(24) // true
 * isValidDailyHours(25) // false
 * isValidDailyHours(-1) // false
 */
export function isValidDailyHours(hours: number): boolean {
  return hours >= 0 && hours <= MAX_DAILY_HOURS;
}

// ============================================================================
// Payroll ID Validation
// ============================================================================

/**
 * Validate payroll ID format
 *
 * Payroll IDs must be:
 * - Between MIN_PAYROLL_ID_LENGTH and MAX_PAYROLL_ID_LENGTH characters
 * - Contain only alphanumeric characters, hyphens, and underscores
 * - Not be empty or just whitespace
 *
 * @param id - Payroll ID to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validatePayrollId('EMP-001') // { valid: true }
 * validatePayrollId('emp_123') // { valid: true }
 * validatePayrollId('') // { valid: false, error: "Payroll ID cannot be empty" }
 * validatePayrollId('emp@123') // { valid: false, error: "Payroll ID can only contain..." }
 */
export function validatePayrollId(id: string): ValidationResult {
  // Check for empty or whitespace-only ID
  if (!id || id.trim().length === 0) {
    return {
      valid: false,
      error: 'Payroll ID cannot be empty',
    };
  }

  // Check minimum length
  if (id.length < MIN_PAYROLL_ID_LENGTH) {
    return {
      valid: false,
      error: `Payroll ID must be at least ${MIN_PAYROLL_ID_LENGTH} character(s)`,
    };
  }

  // Check maximum length
  if (id.length > MAX_PAYROLL_ID_LENGTH) {
    return {
      valid: false,
      error: `Payroll ID must not exceed ${MAX_PAYROLL_ID_LENGTH} characters`,
    };
  }

  // Check format (alphanumeric, hyphens, underscores only)
  if (!PAYROLL_ID_PATTERN.test(id)) {
    return {
      valid: false,
      error: 'Payroll ID can only contain letters, numbers, hyphens, and underscores',
    };
  }

  return { valid: true };
}

// ============================================================================
// Date Range Validation
// ============================================================================

/**
 * Validate that a date range is logical (start date before end date)
 *
 * @param start - Range start date
 * @param end - Range end date
 * @returns Validation result with error message if invalid
 *
 * @example
 * const start = new Date('2026-01-01');
 * const end = new Date('2026-01-15');
 * validateDateRange(start, end) // { valid: true }
 *
 * const invalidStart = new Date('2026-01-15');
 * const invalidEnd = new Date('2026-01-01');
 * validateDateRange(invalidStart, invalidEnd)
 * // { valid: false, error: "Start date must be before end date" }
 */
export function validateDateRange(start: Date, end: Date): ValidationResult {
  // Check if dates are valid
  if (Number.isNaN(start.getTime())) {
    return {
      valid: false,
      error: 'Start date is invalid',
    };
  }

  if (Number.isNaN(end.getTime())) {
    return {
      valid: false,
      error: 'End date is invalid',
    };
  }

  // Check if start is before end
  if (start.getTime() > end.getTime()) {
    return {
      valid: false,
      error: 'Start date must be before end date',
    };
  }

  return { valid: true };
}

// ============================================================================
// Staff Data Validation
// ============================================================================

/**
 * Validate staff member data for completeness and correctness
 *
 * Checks required fields and validates data types/formats for staff records.
 *
 * @param data - Partial staff member data to validate
 * @returns Validation result with array of error messages
 *
 * @example
 * validateStaffData({
 *   employee_id: 'EMP-001',
 *   full_name: 'John Doe',
 *   job_title: 'Instructor'
 * }) // { valid: true, errors: [] }
 *
 * validateStaffData({
 *   employee_id: '',
 *   full_name: 'John Doe'
 * }) // { valid: false, errors: ['Employee ID is required', 'Job title is required'] }
 */
export function validateStaffData(data: Partial<StaffMember>): MultiValidationResult {
  const errors: string[] = [];

  // Validate employee_id (required)
  if (data.employee_id) {
    const idValidation = validatePayrollId(data.employee_id);
    if (!idValidation.valid && idValidation.error) {
      errors.push(idValidation.error);
    }
  } else {
    errors.push('Employee ID is required');
  }

  // Validate full_name (required)
  if (!data.full_name || data.full_name.trim().length === 0) {
    errors.push('Full name is required');
  } else if (data.full_name.length < 2) {
    errors.push('Full name must be at least 2 characters');
  } else if (data.full_name.length > 100) {
    errors.push('Full name must not exceed 100 characters');
  }

  // Validate job_title (required)
  if (!data.job_title || data.job_title.trim().length === 0) {
    errors.push('Job title is required');
  } else if (data.job_title.length > 100) {
    errors.push('Job title must not exceed 100 characters');
  }

  // Validate is_active (if provided, must be boolean)
  if (data.is_active !== undefined && typeof data.is_active !== 'boolean') {
    errors.push('Active status must be a boolean value');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// After School Program Detection
// ============================================================================

/**
 * Detect if text contains After School Program keywords
 *
 * Searches for common ASP-related keywords in notes, descriptions, or other text fields.
 * Uses case-insensitive matching against a predefined list of keywords.
 *
 * @param text - Text to search for ASP keywords
 * @returns True if any ASP keywords are found
 *
 * @example
 * isAfterSchoolProgram('ASP session today') // true
 * isAfterSchoolProgram('After school pickup') // true
 * isAfterSchoolProgram('Regular class') // false
 * isAfterSchoolProgram('Pick-up at 3pm') // true
 */
export function isAfterSchoolProgram(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();

  // Check if any ASP keyword is present in the text
  return AFTER_SCHOOL_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}
