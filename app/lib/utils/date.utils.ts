// app/lib/utils/date.utils.ts

/**
 * Date and Time Utility Functions
 *
 * Provides utilities for date formatting, parsing, validation, and
 * payroll period calculations for the gym management system.
 */

import {
  FIRST_PERIOD_END_DAY,
  SECOND_PERIOD_START_DAY,
  WEEKEND_DAYS,
} from '@/constants/payroll.constants';
import { config } from '@/lib/config';

// ============================================================================
// Date Formatting Functions
// ============================================================================

/**
 * Format a date as MM/DD/YY
 *
 * @param date - Date object or ISO date string to format
 * @returns Formatted date string (e.g., "01/15/26")
 *
 * @example
 * formatDateShort(new Date('2026-01-15')) // "01/15/26"
 * formatDateShort('2026-01-15') // "01/15/26"
 */
export function formatDateShort(date: Date | string): string {
  // parseDate reads date-only strings in local time; new Date('YYYY-MM-DD')
  // would parse as UTC midnight and render one day early in Vancouver
  const d = typeof date === 'string' ? (parseDate(date) ?? new Date(date)) : date;

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);

  return `${month}/${day}/${year}`;
}

/**
 * Format a date as YYYY-MM-DD (ISO format for HTML inputs)
 *
 * @param date - Date object or ISO date string to format
 * @returns ISO formatted date string (e.g., "2026-01-15")
 *
 * @example
 * formatDateISO(new Date('2026-01-15')) // "2026-01-15"
 * formatDateISO('01/15/2026') // "2026-01-15"
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === 'string' ? (parseDate(date) ?? new Date(date)) : date;

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Generate a period label in format "MM/DD/YY - MM/DD/YY"
 *
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Formatted period label
 *
 * @example
 * generatePeriodLabel(new Date('2026-01-01'), new Date('2026-01-15'))
 * // "01/01/26 - 01/15/26"
 */
export function generatePeriodLabel(startDate: Date | string, endDate: Date | string): string {
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
}

// ============================================================================
// Date Parsing Functions
// ============================================================================

/**
 * Parse a date string to Date object
 *
 * Supports multiple date formats:
 * - ISO: YYYY-MM-DD
 * - US: MM/DD/YYYY, MM/DD/YY
 * - Timestamp: milliseconds since epoch
 *
 * @param dateString - Date string to parse
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * parseDate('2026-01-15') // Date object
 * parseDate('01/15/2026') // Date object
 * parseDate('invalid') // null
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) {
    return null;
  }

  // Try parsing as ISO format (YYYY-MM-DD)
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Try parsing as US format (MM/DD/YYYY or MM/DD/YY)
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const month = usMatch[1];
    const day = usMatch[2];
    const year = usMatch[3];
    if (!year) {
      return null;
    }
    const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
    const date = new Date(fullYear, Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Try parsing as timestamp
  const timestamp = Number(dateString);
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Try native Date parsing as last resort
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ============================================================================
// Date Validation and Checking Functions
// ============================================================================

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 *
 * @param date - Date object or ISO date string to check
 * @returns True if the date is a Saturday or Sunday
 *
 * @example
 * isWeekend(new Date('2026-01-17')) // true (Saturday)
 * isWeekend(new Date('2026-01-15')) // false (Thursday)
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(d.getTime())) {
    return false;
  }

  const dayOfWeek = d.getDay();
  return (WEEKEND_DAYS as readonly number[]).includes(dayOfWeek);
}

/**
 * Check if a date falls within a specified date range (inclusive)
 *
 * @param date - Date to check
 * @param start - Range start date (inclusive)
 * @param end - Range end date (inclusive)
 * @returns True if date is within the range
 *
 * @example
 * const date = new Date('2026-01-15');
 * const start = new Date('2026-01-01');
 * const end = new Date('2026-01-31');
 * isDateInRange(date, start, end) // true
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  // Set all times to midnight for date-only comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

  return dateOnly >= startOnly && dateOnly <= endOnly;
}

// ============================================================================
// Month Boundary Functions
// ============================================================================

/**
 * Get the first day of the month for a given date
 *
 * @param date - Date in the target month
 * @returns Date object set to the first day of the month at midnight
 *
 * @example
 * getFirstDayOfMonth(new Date('2026-01-15')) // 2026-01-01 00:00:00
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the last day of the month for a given date
 *
 * @param date - Date in the target month
 * @returns Date object set to the last day of the month at midnight
 *
 * @example
 * getLastDayOfMonth(new Date('2026-01-15')) // 2026-01-31 00:00:00
 * getLastDayOfMonth(new Date('2026-02-15')) // 2026-02-28 00:00:00
 */
export function getLastDayOfMonth(date: Date): Date {
  // Setting day to 0 gives us the last day of the previous month
  // So we go to next month (month + 1) and set day to 0
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// ============================================================================
// Payroll Period Functions
// ============================================================================

/**
 * Get the payroll period (1st-15th or 16th-end) for a given date
 *
 * The payroll system uses bi-monthly periods:
 * - First period: 1st to 15th of the month
 * - Second period: 16th to last day of the month
 *
 * @param date - Date to find the payroll period for
 * @returns Object with start and end dates of the payroll period
 *
 * @example
 * // For date in first half of month
 * getPayrollPeriodForDate(new Date('2026-01-10'))
 * // { start: 2026-01-01, end: 2026-01-15 }
 *
 * // For date in second half of month
 * getPayrollPeriodForDate(new Date('2026-01-20'))
 * // { start: 2026-01-16, end: 2026-01-31 }
 */
/**
 * Get the month abbreviation for a YYYY-MM-DD string, without going through
 * `new Date()` (which parses as UTC midnight and can shift the local day/month).
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Month abbreviation (e.g., "Jul") or '' if unparseable
 *
 * @example
 * monthAbbrFromDate('2026-07-01') // "Jul"
 */
export function monthAbbrFromDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts.length >= 2 ? (config.months[Number(parts[1]) - 1] ?? '') : '';
}

/**
 * Get the year for a YYYY-MM-DD string, without going through `new Date()`
 * (which parses as UTC midnight and can shift the local year on Jan 1).
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Four-digit year, or undefined if unparseable/implausible
 *
 * @example
 * yearFromDate('2026-01-01') // 2026
 */
export function yearFromDate(dateStr: string): number | undefined {
  const year = Number(dateStr.split('-')[0]);
  return Number.isNaN(year) || year < 2000 ? undefined : year;
}

export function getPayrollPeriodForDate(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (day <= FIRST_PERIOD_END_DAY) {
    // First period: 1st to 15th
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, FIRST_PERIOD_END_DAY),
    };
  }

  // Second period: 16th to last day of month
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: new Date(year, month, SECOND_PERIOD_START_DAY),
    end: new Date(year, month, lastDay),
  };
}
