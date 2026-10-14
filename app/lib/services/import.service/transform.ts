// app/lib/services/import.service/transform.ts
// CSV type detection, column mapping and row transformation; re-exported
// from import.service.
import type { CSVType, EntryType, HoursCsvRow, ParsedData, StaffCsvRow } from './schemas';

type CellValue = ParsedData[string] | undefined;

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

const COLUMN_MAP: Record<string, string[]> = {
  employee_id: [
    'payroll id',
    'payroll_id',
    'employee id',
    'employee_id',
    'emp_id',
    'id',
    'user',
    'actor',
    'staff',
    'staff member',
    'staff_member',
    'employee',
  ],
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
};

// First field (in COLUMN_MAP order) with an alias accepted by `matches`.
function findField(matches: (alias: string) => boolean): string | undefined {
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some(matches)) {
      return field;
    }
  }
  return undefined;
}

/**
 * Map CSV column headers to standardized database field names
 *
 * @param headers - Array of CSV column headers
 * @returns Mapping object from CSV columns to database fields
 */
export function mapCSVColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();

    // Prefer exact match first, then substring match (prevents 'first name' matching 'name' alias of full_name)
    const exactField = findField((alias) => lowerHeader === alias);
    if (exactField) {
      mapping[header] = exactField;
    }

    if (!mapping[header]) {
      const partialField = findField((alias) => lowerHeader.includes(alias));
      if (partialField) {
        mapping[header] = partialField;
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

const STAFF_TEXT_FIELDS = [
  'employee_id',
  'full_name',
  'first_name',
  'last_name',
  'job_title',
  'department',
] as const;

type StaffTextField = (typeof STAFF_TEXT_FIELDS)[number];

const isStaffTextField = (field: string): field is StaffTextField =>
  (STAFF_TEXT_FIELDS as readonly string[]).includes(field);

function assignStaffField(transformed: Partial<StaffCsvRow>, dbField: string, value: CellValue) {
  if (isStaffTextField(dbField)) {
    transformed[dbField] = String(value ?? '').trim();
  } else if (dbField === 'is_contractor') {
    transformed.is_contractor = Boolean(value);
  }
}

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
      assignStaffField(transformed, dbField, row[csvCol]);
    }

    // Auto-generate full_name if first_name and last_name are provided
    if (!transformed.full_name && transformed.first_name && transformed.last_name) {
      transformed.full_name = `${transformed.first_name} ${transformed.last_name}`.trim();
    }

    return transformed;
  });
}

// Normalize MM/DD/YYYY → YYYY-MM-DD; anything else passes through trimmed.
function normalizeHoursDate(value: CellValue): string {
  const rawDate = String(value ?? '').trim();
  const mmddyyyy = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy as [string, string, string, string];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return rawDate;
}

function normalizeEntryType(value: CellValue): EntryType {
  const typeValue = String(value ?? '').toLowerCase();
  if (['regular', 'overtime', 'vacation', 'mat_clean'].includes(typeValue)) {
    return typeValue as EntryType;
  }
  if (typeValue.includes('ot') || typeValue.includes('1.5')) {
    return 'overtime';
  }
  if (typeValue.includes('vac')) {
    return 'vacation';
  }
  if (typeValue.includes('mat') || typeValue.includes('clean')) {
    return 'mat_clean';
  }
  return 'regular';
}

function assignHoursField(transformed: Partial<HoursCsvRow>, dbField: string, value: CellValue) {
  switch (dbField) {
    case 'employee_id':
      transformed.employee_id = String(value ?? '').trim();
      break;
    case 'date':
      transformed.date = normalizeHoursDate(value);
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

    case 'type':
      transformed.type = normalizeEntryType(value);
      break;
  }
}

const AFTER_SCHOOL_KEYWORDS = [
  'asp',
  'after school',
  'afterschool',
  'pickup',
  'pick up',
  'pick-up',
];

// Auto-detect After School Program from notes
function isAfterSchoolNote(notes: string | undefined): boolean {
  if (!notes) {
    return false;
  }
  const notesLower = notes.toLowerCase();
  return AFTER_SCHOOL_KEYWORDS.some((keyword) => notesLower.includes(keyword));
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
  return data.map((row) => {
    const transformed: Partial<HoursCsvRow> = {};

    for (const [csvCol, dbField] of Object.entries(columnMapping)) {
      assignHoursField(transformed, dbField, row[csvCol]);
    }

    transformed.is_after_school_program = isAfterSchoolNote(transformed.notes);

    return transformed;
  });
}
