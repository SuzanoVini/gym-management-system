// app/lib/quick-import.ts

import type { TimeEntryFormData } from '@/types';

/**
 * Quick Text Import - Parses simple text format for hours entry
 *
 * Format: `Day Time [mat clean] [1.5]`
 *
 * Examples:
 * - "3 7am mat clean" → Day 3, 7am, 1.25 hours regular (1 + 0.25 mat clean bonus)
 * - "5 7am mat clean" → Day 5, 7am, 1.25 hours regular
 * - "6 11am 1.5" → Day 6, 11am, 1 hour overtime
 * - "8 7pm mat clean" → Day 8, 7pm, 1.25 hours regular
 * - "13 10am 1.5" → Day 13, 10am, 1 hour overtime
 * - "15 6pm" → Day 15, 6pm, 1 hour regular
 *
 * Rules:
 * - "mat clean" adds 15 minutes (0.25 hours) to regular hours
 * - "1.5" identifier means 1 overtime hour
 * - Default is 1 hour per entry
 */

export interface QuickImportEntry {
  day: number;
  time: string;
  regularHours: number;
  overtimeHours: number;
  isAfterSchool: boolean;
  hasMatClean: boolean;
}

export interface QuickImportSummary {
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalAfterSchoolHours: number;
  totalAfterSchoolOvertimeHours: number;
  entries: QuickImportEntry[];
  errors: string[];
}

const MAT_CLEANING_BONUS = 0.25; // 15 minutes in hours

/**
 * Validate a day number
 */
function validateDay(dayStr: string, lineNumber: number): { day: number; error?: string } {
  const day = Number.parseInt(dayStr, 10);
  if (Number.isNaN(day) || day < 1 || day > 31) {
    return {
      day: 0,
      error: `Line ${lineNumber}: Invalid day "${dayStr}" - must be 1-31`,
    };
  }
  return { day };
}

/**
 * Check if line contains After School Program keywords
 */
function isAfterSchoolEntry(lineText: string): boolean {
  const afterSchoolKeywords = ['asp', 'after', 'school', 'pickup', 'pick', 'up', 'afterschool'];
  return afterSchoolKeywords.some((keyword) => lineText.toLowerCase().includes(keyword));
}

/**
 * Calculate hours based on overtime and mat cleaning flags
 */
function calculateHours(
  isOvertime: boolean,
  hasMatClean: boolean
): {
  regularHours: number;
  overtimeHours: number;
} {
  if (isOvertime) {
    return { regularHours: 0, overtimeHours: 1 };
  }

  const regularHours = hasMatClean ? 1 + MAT_CLEANING_BONUS : 1;
  return { regularHours, overtimeHours: 0 };
}

/**
 * Process a single line of quick import text
 */
function processLine(
  line: string,
  lineNumber: number
): {
  entry?: QuickImportEntry;
  error?: string;
} {
  const parts = line.split(' ');

  if (parts.length < 2) {
    return {
      error: `Line ${lineNumber}: Invalid format - expected "Day Time [mat clean] [1.5]"`,
    };
  }

  const { day, error } = validateDay(parts[0] ?? '', lineNumber);
  if (error) {
    return { error };
  }

  const time = parts[1] ?? '';
  const isOvertime = parts.includes('1.5');
  const hasMatClean = parts.includes('mat') && parts.includes('clean');
  const isAfterSchool = isAfterSchoolEntry(line);

  const { regularHours, overtimeHours } = calculateHours(isOvertime, hasMatClean);

  return {
    entry: {
      day,
      time,
      regularHours,
      overtimeHours,
      isAfterSchool,
      hasMatClean,
    },
  };
}

/**
 * Parse quick import text into structured entries
 *
 * @param importText - Raw text input from textarea
 * @returns Parsed import summary with totals and individual entries
 */
export function parseQuickImport(importText: string): QuickImportSummary {
  const lines = importText.split('\n');
  const entries: QuickImportEntry[] = [];
  const errors: string[] = [];

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalAfterSchoolHours = 0;
  let totalAfterSchoolOvertimeHours = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) {
      continue;
    }

    const lineNumber = i + 1;
    const result = processLine(line, lineNumber);

    if (result.error) {
      errors.push(result.error);
      continue;
    }

    if (result.entry) {
      const { entry } = result;

      // Categorize hours
      if (entry.isAfterSchool) {
        totalAfterSchoolHours += entry.regularHours;
        totalAfterSchoolOvertimeHours += entry.overtimeHours;
      } else {
        totalRegularHours += entry.regularHours;
        totalOvertimeHours += entry.overtimeHours;
      }

      entries.push(entry);
    }
  }

  return {
    totalRegularHours,
    totalOvertimeHours,
    totalAfterSchoolHours,
    totalAfterSchoolOvertimeHours,
    entries,
    errors,
  };
}

/**
 * Map parsed quick-import entries to time_entries rows. Entry dates land in
 * the period's month (periods never span months) using each line's day token.
 * Mat cleaning becomes its own 'mat_cleaning' entry so the DB aggregation
 * trigger counts it as a bonus rather than regular hours.
 */
export function buildQuickImportTimeEntries(
  staffHoursId: string,
  periodStartDate: string, // YYYY-MM-DD
  entries: QuickImportEntry[]
): TimeEntryFormData[] {
  const [year, month] = periodStartDate.split('-');
  const rows: TimeEntryFormData[] = [];

  for (const entry of entries) {
    const entryDate = `${year}-${month}-${String(entry.day).padStart(2, '0')}`;
    const base = {
      staff_hours_id: staffHoursId,
      entry_date: entryDate,
      is_after_school_program: entry.isAfterSchool,
      notes: `Quick import ${entry.time}`,
    };

    if (entry.overtimeHours > 0) {
      rows.push({ ...base, entry_type: 'overtime', hours: entry.overtimeHours });
      continue;
    }

    const regularHours = entry.hasMatClean
      ? entry.regularHours - MAT_CLEANING_BONUS
      : entry.regularHours;
    rows.push({ ...base, entry_type: 'regular', hours: regularHours });
    if (entry.hasMatClean) {
      rows.push({ ...base, entry_type: 'mat_cleaning', hours: MAT_CLEANING_BONUS });
    }
  }

  return rows;
}

/**
 * Format quick import summary as user-friendly message
 *
 * @param summary - Import summary from parseQuickImport
 * @param staffName - Name of staff member
 * @returns Formatted success message
 */
export function formatQuickImportSummary(summary: QuickImportSummary, staffName: string): string {
  const parts: string[] = [`Imported for ${staffName}:`];

  if (summary.totalRegularHours > 0) {
    parts.push(`${summary.totalRegularHours} regular hours`);
  }

  if (summary.totalOvertimeHours > 0) {
    parts.push(`${summary.totalOvertimeHours} overtime hours`);
  }

  if (summary.totalAfterSchoolHours > 0) {
    parts.push(`${summary.totalAfterSchoolHours} After School hours`);
  }

  if (summary.totalAfterSchoolOvertimeHours > 0) {
    parts.push(`${summary.totalAfterSchoolOvertimeHours} After School overtime hours`);
  }

  return parts.join(', ').replace(/:,/, ':');
}
