// app/lib/utils/export.utils.ts

/**
 * CSV Export Utility Functions
 *
 * Provides utilities for generating and downloading CSV files from payroll data,
 * formatting data for Wave Accounting import, and generating export filenames.
 */

import { CSV_COLUMN_ORDER, CSV_HEADERS } from '@/constants/payroll.constants';
import type { PayrollPeriod, StaffHours, StaffMember } from '@/types';
import { formatDateShort } from './date.utils';

// ============================================================================
// Export Data Types
// ============================================================================

/**
 * Payroll export data structure for Wave Accounting CSV format
 */
export interface PayrollExportData {
  employee_name: string;
  payroll_id: string;
  first_name: string;
  last_name: string;
  job_id: string;
  department: string;
  overtime: number;
  regular: number;
  vacation: number;
  external_id: string;
  job_title: string;
}

// ============================================================================
// CSV Generation Functions
// ============================================================================

/**
 * Generate CSV content from payroll export data
 *
 * Converts an array of payroll data objects into CSV format with proper headers,
 * escaping, and line breaks. Uses Wave Accounting CSV format.
 *
 * @param data - Array of payroll export data objects
 * @returns CSV content as string
 *
 * @example
 * const data = [{
 *   employee_name: 'John Doe',
 *   payroll_id: 'EMP-001',
 *   regular: 40,
 *   overtime: 5,
 *   // ... other fields
 * }];
 * const csv = generatePayrollCSV(data);
 * // "Employee Name,Payroll ID,First Name,..."
 * // "John Doe,EMP-001,John,..."
 */
export function generatePayrollCSV(data: PayrollExportData[]): string {
  if (!data || data.length === 0) {
    // Return just headers if no data
    return CSV_COLUMN_ORDER.map((key) => CSV_HEADERS[key as keyof typeof CSV_HEADERS]).join(',');
  }

  // Create header row from CSV_HEADERS
  const headers = CSV_COLUMN_ORDER.map((key) => CSV_HEADERS[key as keyof typeof CSV_HEADERS]);

  // Create data rows
  const rows = data.map((row) => {
    return CSV_COLUMN_ORDER.map((key) => {
      const value = row[key as keyof PayrollExportData];
      return escapeCsvValue(value);
    });
  });

  // Combine headers and rows
  const allRows = [headers, ...rows];

  // Join with line breaks
  return allRows.map((row) => row.join(',')).join('\n');
}

/**
 * Escape a value for CSV format
 *
 * Handles special characters, quotes, commas, and line breaks according to CSV spec.
 * Wraps values in quotes if they contain special characters.
 *
 * @param value - Value to escape (any type)
 * @returns Escaped string value safe for CSV
 *
 * @example
 * escapeCsvValue('John Doe') // "John Doe"
 * escapeCsvValue('Doe, John') // "\"Doe, John\""
 * escapeCsvValue(42) // "42"
 * escapeCsvValue(null) // ""
 */
export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  const stringValue = String(value);

  // Check if value needs escaping (contains comma, quote, or newline)
  const needsEscaping = /[",\n\r]/.test(stringValue);

  if (needsEscaping) {
    // Escape double quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""');
    // Wrap in quotes
    return `"${escaped}"`;
  }

  return stringValue;
}

// ============================================================================
// CSV Download Function
// ============================================================================

/**
 * Download CSV content as a file in the browser
 *
 * Creates a blob from CSV content and triggers a download in the user's browser.
 * Works by creating a temporary anchor element and clicking it programmatically.
 *
 * @param content - CSV content string to download
 * @param filename - Name of the file to save (should end with .csv)
 *
 * @example
 * const csv = generatePayrollCSV(data);
 * downloadCSV(csv, 'payroll-2026-01-01.csv');
 */
export function downloadCSV(content: string, filename: string): void {
  // Create a blob from the CSV content
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

// ============================================================================
// Data Formatting Functions
// ============================================================================

/**
 * Format payroll data for CSV export
 *
 * Transforms staff hours and staff member data into the Wave Accounting CSV format.
 * Joins hours data with staff information and calculates totals.
 *
 * @param staffHours - Array of staff hours records for the period
 * @param staff - Array of staff member records
 * @param period - Payroll period information
 * @returns Array of formatted export data ready for CSV generation
 *
 * @example
 * const exportData = formatPayrollForExport(staffHours, staff, period);
 * const csv = generatePayrollCSV(exportData);
 * downloadCSV(csv, generateExportFilename(period));
 */
export function formatPayrollForExport(
  staffHours: StaffHours[],
  staff: StaffMember[],
  _period: PayrollPeriod
): PayrollExportData[] {
  // Create a map of staff members by ID for quick lookup
  const staffMap = new Map(staff.map((s) => [s.id, s]));

  // Transform staff hours into export format
  return staffHours.map((hours) => {
    const staffMember = staffMap.get(hours.staff_id);

    // Parse full name into first and last name
    const fullName = staffMember?.full_name || 'Unknown';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      employee_name: fullName,
      payroll_id: staffMember?.employee_id || '',
      first_name: firstName,
      last_name: lastName,
      job_id: staffMember?.employee_id || '', // Wave uses this for external tracking
      department: 'Operations', // Default department - could be made configurable
      overtime: hours.overtime_hours || 0,
      regular: hours.regular_hours || 0,
      vacation: hours.vacation_hours || 0,
      external_id: staffMember?.employee_id || '',
      job_title: staffMember?.job_title || '',
    };
  });
}

// ============================================================================
// Filename Generation
// ============================================================================

/**
 * Generate a timestamped filename for payroll export
 *
 * Creates a descriptive filename including the payroll period dates.
 * Format: payroll-MMDDYY-MMDDYY.csv
 *
 * @param period - Payroll period to generate filename for
 * @returns CSV filename with timestamp
 *
 * @example
 * const period = {
 *   start_date: '2026-01-01',
 *   end_date: '2026-01-15',
 *   // ... other fields
 * };
 * generateExportFilename(period) // "payroll-010126-011526.csv"
 */
export function generateExportFilename(period: PayrollPeriod): string {
  // Format dates for filename (remove slashes)
  const startDate = formatDateShort(period.start_date).replace(/\//g, '');
  const endDate = formatDateShort(period.end_date).replace(/\//g, '');

  return `payroll-${startDate}-${endDate}.csv`;
}

/**
 * Generate a filename with current timestamp
 *
 * Useful for generic exports where period information is not available.
 * Format: payroll-export-YYYYMMDD-HHMMSS.csv
 *
 * @returns CSV filename with current date and time
 *
 * @example
 * generateTimestampedFilename() // "payroll-export-20260121-143022.csv"
 */
export function generateTimestampedFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `payroll-export-${year}${month}${day}-${hours}${minutes}${seconds}.csv`;
}
