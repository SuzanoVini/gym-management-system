// app/lib/services/csv-template-analyzer.ts

import Papa, { type ParseResult } from 'papaparse';
import type {
  CSVExportFormatFormData,
  FieldMapping,
  MappingConfidence,
  TemplateAnalysisResult,
} from '@/types';

/**
 * Available database fields for payroll CSV export
 * MUST match accountant's template structure exactly
 */
export const AVAILABLE_DB_FIELDS = [
  { key: 'staff_name', label: 'Employee name', required: true },
  { key: 'employee_id', label: 'Employee payroll ID', required: true },
  { key: 'first_name', label: 'First name', required: false },
  { key: 'last_name', label: 'Last name', required: false },
  { key: 'job_id', label: 'job id', required: false },
  { key: 'department_name', label: 'Department name', required: false },
  { key: 'overtime_hours', label: 'Overtime', required: false },
  { key: 'regular_hours', label: 'Regular Pay', required: false },
  { key: 'sick_hours', label: 'Sick Pay', required: false },
  { key: 'vacation_hours', label: 'Vacation Pay', required: false },
  { key: 'external_id', label: 'External ID', required: false },
  { key: 'job_title', label: 'Job Title', required: false },
] as const;

/**
 * Field mapping patterns - maps common CSV column names to database fields
 */
const FIELD_MAPPING_PATTERNS: Record<
  string,
  { patterns: RegExp[]; confidence: MappingConfidence }
> = {
  staff_name: {
    patterns: [/^(staff\s*name|employee\s*name|name|full\s*name|staff)$/i],
    confidence: 'exact',
  },
  employee_id: {
    patterns: [
      /^(employee\s*payroll\s*id|employee\s*id|payroll\s*id|emp\s*id|id|employee\s*number|staff\s*id)$/i,
    ],
    confidence: 'exact',
  },
  regular_hours: {
    patterns: [
      /^(regular\s*hours?|reg\s*hours?|regular\s*pay|reg\s*pay|hours?|regular|standard\s*hours?)$/i,
    ],
    confidence: 'exact',
  },
  overtime_hours: {
    patterns: [/^(overtime\s*hours?|ot\s*hours?|overtime\s*pay|ot\s*pay|overtime|ot)$/i],
    confidence: 'exact',
  },
  vacation_hours: {
    patterns: [
      /^(vacation\s*hours?|vac\s*hours?|vacation\s*pay|vac\s*pay|vacation|vac|pto\s*hours?|pto)$/i,
    ],
    confidence: 'exact',
  },
  sick_hours: {
    patterns: [/^(sick\s*hours?|sick\s*pay|sick|sick\s*leave|sick\s*time)$/i],
    confidence: 'exact',
  },
  first_name: {
    patterns: [/^(first\s*name|firstname|fname|given\s*name)$/i],
    confidence: 'exact',
  },
  last_name: {
    patterns: [/^(last\s*name|lastname|lname|surname|family\s*name)$/i],
    confidence: 'exact',
  },
  job_id: {
    patterns: [/^(job\s*id|jobid|job\s*number|position\s*id)$/i],
    confidence: 'exact',
  },
  department_name: {
    patterns: [/^(department\s*name|department|dept\s*name|dept)$/i],
    confidence: 'exact',
  },
  external_id: {
    patterns: [/^(external\s*id|externalid|ext\s*id)$/i],
    confidence: 'exact',
  },
  job_title: {
    patterns: [/^(job\s*title|jobtitle|title|position|role)$/i],
    confidence: 'exact',
  },
};

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/[_-]/g, ' ');
}

/**
 * Map a single CSV column to a database field
 */
function mapColumnToField(csvColumn: string): FieldMapping | null {
  const normalized = normalizeColumnName(csvColumn);

  // Try exact pattern matching first
  for (const [dbField, { patterns, confidence }] of Object.entries(FIELD_MAPPING_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return {
          csvColumn,
          dbField,
          confidence,
          suggested: true,
        };
      }
    }
  }

  // Try partial matching for less common variations
  for (const [dbField] of Object.entries(FIELD_MAPPING_PATTERNS)) {
    const dbFieldNormalized = dbField.replace(/_/g, ' ');
    if (normalized.includes(dbFieldNormalized) || dbFieldNormalized.includes(normalized)) {
      return {
        csvColumn,
        dbField,
        confidence: 'partial',
        suggested: true,
      };
    }
  }

  return null;
}

/**
 * Automatically map CSV headers to database fields
 */
export function mapFieldsToDatabase(headers: string[]): {
  mappings: FieldMapping[];
  unmappedColumns: string[];
  missingFields: string[];
} {
  const mappings: FieldMapping[] = [];
  const unmappedColumns: string[] = [];
  const mappedDbFields = new Set<string>();

  // First pass: try to map each header
  for (const header of headers) {
    const mapping = mapColumnToField(header);
    if (mapping) {
      // Only add if we haven't already mapped this db field
      if (mappedDbFields.has(mapping.dbField)) {
        unmappedColumns.push(header);
      } else {
        mappings.push(mapping);
        mappedDbFields.add(mapping.dbField);
      }
    } else {
      unmappedColumns.push(header);
    }
  }

  // Check for missing required fields
  const requiredFields = AVAILABLE_DB_FIELDS.filter((f) => f.required).map((f) => f.key);
  const missingFields = requiredFields.filter((field) => !mappedDbFields.has(field));

  return {
    mappings,
    unmappedColumns,
    missingFields,
  };
}

/**
 * Generate CSV export format configuration from field mappings
 */
export function generateFormatConfig(
  mappings: FieldMapping[],
  templateName: string
): CSVExportFormatFormData {
  // Create column config from mappings in the order they appear
  const columnConfig = mappings.map((mapping) => ({
    key: mapping.dbField,
    label: mapping.csvColumn, // Use the original CSV column name as the label
    enabled: true,
  }));

  // Add any missing database fields as disabled columns at the end
  const mappedFields = new Set(mappings.map((m) => m.dbField));
  for (const field of AVAILABLE_DB_FIELDS) {
    if (!mappedFields.has(field.key)) {
      columnConfig.push({
        key: field.key,
        label: field.label,
        enabled: false,
      });
    }
  }

  return {
    format_name: templateName,
    is_default: false,
    column_config: columnConfig,
    staff_order_config: {
      type: 'name',
      direction: 'asc',
    },
  };
}

/**
 * Analyze a CSV template file
 * @param file - CSV file to analyze
 * @returns Promise with analysis result
 */
export function analyzeCSVTemplate(file: File): Promise<TemplateAnalysisResult> {
  return new Promise((resolve, reject) => {
    // First, read the file as text to handle mixed line endings
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error('Failed to read file'));
        return;
      }

      // Normalize line endings: Convert CR (Mac) and CRLF (Windows) to LF (Unix)
      // This handles the accountant's CSV which may have CR-only line endings
      const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      Papa.parse(normalizedText, {
        header: false,
        dynamicTyping: false,
        skipEmptyLines: false, // Keep empty lines to maintain structure
        preview: 7, // Parse first 7 rows
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (results: ParseResult<string[]>) => {
          try {
            const allRows = results.data || [];

            // Check if we have enough rows for the expected structure
            if (allRows.length < 4) {
              reject(
                new Error(
                  'CSV file does not have the expected structure. Expected: Row 1 (Title), Row 2 (Date), Row 3 (Blank), Row 4 (Headers)'
                )
              );
              return;
            }

            // Extract the actual column headers from row 4 (index 3)
            const headerRow = allRows[3];
            if (!headerRow || headerRow.length === 0) {
              reject(new Error('No column headers found on row 4'));
              return;
            }

            // Trim whitespace from headers
            const headers = headerRow.map((h) => (h || '').trim()).filter((h) => h !== '');

            // Extract sample data rows (rows 5-7, indices 4-6)
            const dataRows = allRows.slice(4, 7);

            // Convert data rows to objects using headers
            const sampleData = dataRows
              .filter(
                (row) => row && row.length > 0 && row.some((cell) => cell && cell.trim() !== '')
              )
              .map((row) => {
                const obj: Record<string, string> = {};
                headers.forEach((header, index) => {
                  obj[header] = (row[index] || '').trim();
                });
                return obj;
              });

            const rowCount = sampleData.length;

            // Perform automatic field mapping
            const { mappings, unmappedColumns, missingFields } = mapFieldsToDatabase(headers);

            const analysisResult: TemplateAnalysisResult = {
              headers,
              rowCount,
              sampleData,
              fieldMappings: mappings,
              unmappedColumns,
              missingFields,
            };

            resolve(analysisResult);
          } catch (error) {
            reject(new Error(`Failed to analyze CSV template: ${error}`));
          }
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        },
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
