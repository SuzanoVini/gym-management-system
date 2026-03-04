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
 */
export const AVAILABLE_DB_FIELDS = [
  { key: 'staff_name', label: 'Staff Name', required: true },
  { key: 'employee_id', label: 'Payroll ID', required: true },
  { key: 'regular_hours', label: 'Regular Hours', required: false },
  { key: 'overtime_hours', label: 'Overtime Hours', required: false },
  { key: 'vacation_hours', label: 'Vacation Hours', required: false },
  { key: 'sick_hours', label: 'Sick Hours', required: false },
  { key: 'mat_cleaning_count', label: 'Mat Cleaning Count', required: false },
  { key: 'total_hours', label: 'Total Hours', required: false },
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
  mat_cleaning_count: {
    patterns: [/^(mat\s*cleaning|mat\s*clean|mats|mat\s*count|cleaning\s*count)$/i],
    confidence: 'exact',
  },
  total_hours: {
    patterns: [/^(total\s*hours?|total|hours?\s*total|sum\s*hours?)$/i],
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
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      preview: 4, // Only parse first 4 rows (1 header + 3 sample rows)
      delimitersToGuess: [',', '\t', '|', ';'],
      transformHeader: (header: string) => header.trim(),
      complete: (results: ParseResult<Record<string, string>>) => {
        try {
          const headers = results.meta.fields || [];
          const data = results.data || [];
          const rowCount = data.length;

          // Get sample data (first 3 rows)
          const sampleData = data.slice(0, 3);

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
  });
}
