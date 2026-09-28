// app/lib/services/import.service/helpers.ts
// File checks, result formatting and CSV templates; re-exported from
// import.service.
import type { ImportResult } from './schemas';

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
