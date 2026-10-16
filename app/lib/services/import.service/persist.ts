// app/lib/services/import.service/persist.ts
// Writes validated payroll CSV rows; re-exported from import.service.
import type { PayrollPeriod, TimeEntry } from '@/types';
import { supabase } from '../../supabase/client';
import { ensureStaffHoursRow } from '../hours.service';
import { getTimeEntries, MAT_CLEANING_BONUS } from '../hours.service/timeEntries';
import type { HoursCsvRow, ImportResult, StaffCsvRow } from './schemas';

/**
 * Insert new staff and update existing ones, matched on Payroll ID. Active
 * status is left alone, so re-importing a roster never revives deactivated staff.
 */
export async function saveStaffRows(rows: StaffCsvRow[]): Promise<ImportResult> {
  const { data, error } = await supabase
    .from('staff_members')
    .upsert(
      rows.map((r) => ({
        employee_id: r.employee_id,
        full_name: r.full_name,
        job_title: r.job_title,
      })),
      { onConflict: 'employee_id' }
    )
    .select('id');

  if (error) {
    return { success: false, imported: 0, errors: [error.message] };
  }
  return { success: true, imported: data?.length ?? 0, errors: [] };
}

type CsvEntryType = HoursCsvRow['type'];
const ENTRY_TYPE: Record<CsvEntryType, TimeEntry['entry_type']> = {
  regular: 'regular',
  overtime: 'overtime',
  vacation: 'vacation',
  mat_clean: 'mat_cleaning',
};

const entryKey = (date: string, type: string, hours: number) => `${date}|${type}|${Number(hours)}`;

function toTimeEntry(row: HoursCsvRow, staffHoursId: string) {
  const entryType = ENTRY_TYPE[row.type];
  return {
    staff_hours_id: staffHoursId,
    entry_date: row.date,
    entry_type: entryType,
    // The aggregation trigger counts mat cleaning rows at a fixed bonus each.
    hours: entryType === 'mat_cleaning' ? MAT_CLEANING_BONUS : row.hours,
    notes: row.notes || null,
    is_after_school_program: row.is_after_school_program,
    source: 'csv' as const,
  };
}

// Problems that must block the whole import before anything is written.
function findBlockingErrors(
  period: PayrollPeriod,
  rows: HoursCsvRow[],
  staffIds: Map<string, string>
): string[] {
  if (period.is_closed) {
    return ['This payroll period is closed and cannot be modified'];
  }
  const errors: string[] = [];
  const unknown = [...new Set(rows.map((r) => r.employee_id))].filter((id) => !staffIds.has(id));
  if (unknown.length > 0) {
    errors.push(
      `Unknown Payroll ID(s): ${unknown.join(', ')}. Import the staff CSV or add them first.`
    );
  }
  const outside = rows.filter((r) => r.date < period.start_date || r.date > period.end_date);
  if (outside.length > 0) {
    errors.push(
      `${outside.length} row(s) fall outside this period (${period.start_date} to ${period.end_date}).`
    );
  }
  return errors;
}

// Insert one staff member's rows, skipping ones already logged. Returns rows inserted.
async function saveStaffEntries(
  periodId: string,
  staffId: string,
  rows: HoursCsvRow[]
): Promise<number> {
  const staffHours = await ensureStaffHoursRow(periodId, staffId);
  const existing = new Set(
    (await getTimeEntries(staffHours.id)).map((e) => entryKey(e.entry_date, e.entry_type, e.hours))
  );
  const fresh = rows
    .map((r) => toTimeEntry(r, staffHours.id))
    .filter((e) => !existing.has(entryKey(e.entry_date, e.entry_type, e.hours)));
  if (fresh.length === 0) {
    return 0;
  }
  const { error } = await supabase.from('time_entries').insert(fresh);
  if (error) {
    throw error;
  }
  return fresh.length;
}

/**
 * Save hours rows as time entries in the given period. Rows already imported
 * (same staff, date, type and hours) are skipped, so a file can be re-imported safely.
 */
export async function saveHoursRows(
  period: PayrollPeriod,
  rows: HoursCsvRow[]
): Promise<ImportResult & { skipped: number }> {
  const ids = [...new Set(rows.map((r) => r.employee_id))];
  const { data: staff, error } = await supabase
    .from('staff_members')
    .select('id, employee_id')
    .in('employee_id', ids);
  if (error) {
    return { success: false, imported: 0, skipped: 0, errors: [error.message] };
  }

  const staffIds = new Map((staff ?? []).map((s) => [s.employee_id as string, s.id as string]));
  const blocking = findBlockingErrors(period, rows, staffIds);
  if (blocking.length > 0) {
    return { success: false, imported: 0, skipped: 0, errors: blocking };
  }

  let imported = 0;
  let skipped = 0;
  try {
    for (const [employeeId, staffId] of staffIds) {
      const own = rows.filter((r) => r.employee_id === employeeId);
      const inserted = await saveStaffEntries(period.id, staffId, own);
      imported += inserted;
      skipped += own.length - inserted;
    }
  } catch (err) {
    const message = (err as { message?: string }).message ?? 'Failed to save hours';
    return { success: false, imported, skipped, errors: [message] };
  }

  return { success: true, imported, skipped, errors: [] };
}
