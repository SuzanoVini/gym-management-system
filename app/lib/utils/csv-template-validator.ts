// app/lib/utils/csv-template-validator.ts

import type { TemplateAnalysisResult } from '@/types';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const NUMERIC_FIELDS = new Set([
  'regular_hours',
  'overtime_hours',
  'vacation_hours',
  'sick_hours',
  'total_hours',
  'mat_cleaning_count',
]);

function validateHeaders(headers: string[], errors: string[]): void {
  const headerSet = new Set<string>();
  const duplicates: string[] = [];
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (headerSet.has(normalized)) {
      duplicates.push(header);
    } else {
      headerSet.add(normalized);
    }
  }

  if (duplicates.length > 0) {
    errors.push(`Duplicate column names found: ${duplicates.join(', ')}`);
  }

  const emptyColumns = headers.filter((header) => !header || header.trim() === '');
  if (emptyColumns.length > 0) {
    errors.push(`Found ${emptyColumns.length} column(s) with empty names`);
  }
}

function validateSampleData(analysis: TemplateAnalysisResult, warnings: string[]): void {
  if (analysis.sampleData.length === 0) {
    return;
  }

  for (const mapping of analysis.fieldMappings) {
    const { csvColumn, dbField } = mapping;
    if (!NUMERIC_FIELDS.has(dbField)) {
      continue;
    }

    const sampleValues = analysis.sampleData
      .map((row) => row[csvColumn])
      .filter((value) => value !== undefined && value !== null && value !== '');
    const nonNumericValues = sampleValues.filter((value) => {
      const cleaned = String(value).replace(/[,$\s]/g, '');
      return Number.isNaN(Number(cleaned));
    });

    if (nonNumericValues.length > 0) {
      warnings.push(
        `Column "${csvColumn}" (mapped to ${dbField}) contains non-numeric values: ` +
          `${nonNumericValues.slice(0, 3).join(', ')}${nonNumericValues.length > 3 ? '...' : ''}`
      );
    }
  }
}

/**
 * Validate file is a CSV
 */
export function validateCSVFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  const validTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/csv'];
  const validExtensions = ['.csv', '.txt'];

  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);

  if (!isValidType) {
    errors.push(`Invalid file type: ${file.type || 'unknown'}. Please upload a CSV file (.csv)`);
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 10MB`);
  }

  // Check file is not empty
  if (file.size === 0) {
    errors.push('File is empty');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate template analysis result
 */
export function validateTemplateAnalysis(analysis: TemplateAnalysisResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if CSV has headers
  if (!analysis.headers || analysis.headers.length === 0) {
    errors.push('CSV file has no headers');
    return { valid: false, errors, warnings };
  }

  validateHeaders(analysis.headers, errors);

  // Warn if no data rows (only header)
  if (analysis.rowCount === 0) {
    warnings.push('CSV file contains only headers, no data rows for validation');
  }

  // Check for missing required fields
  if (analysis.missingFields.length > 0) {
    errors.push(
      `Missing required fields: ${analysis.missingFields.join(', ')}. ` +
        'Please ensure your CSV includes columns for staff name and employee ID.'
    );
  }

  // Warn about unmapped columns
  if (analysis.unmappedColumns.length > 0) {
    warnings.push(
      `${analysis.unmappedColumns.length} column(s) could not be automatically mapped: ` +
        `${analysis.unmappedColumns.join(', ')}. ` +
        'You can manually map these columns or they will be ignored.'
    );
  }

  // Warn if no mappings were successful
  if (analysis.fieldMappings.length === 0) {
    warnings.push(
      'No columns were automatically mapped. You will need to manually map all fields.'
    );
  }

  validateSampleData(analysis, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate template name
 */
export function validateTemplateName(name: string, existingNames: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if name is empty
  if (!name || name.trim() === '') {
    errors.push('Template name is required');
  }

  // Check name length
  if (name.length > 100) {
    errors.push('Template name must be 100 characters or less');
  }

  // Check for duplicate name
  if (existingNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
    errors.push(`A format with the name "${name}" already exists. Please choose a different name.`);
  }

  // Warn about special characters
  const specialChars = /[<>:"/\\|?*]/;
  if (specialChars.test(name)) {
    warnings.push(
      'Template name contains special characters that may cause issues in some systems'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
