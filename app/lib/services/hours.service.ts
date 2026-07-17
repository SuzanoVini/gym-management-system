// app/lib/services/hours.service.ts

import type { StaffHours, StaffHoursFormData, TimeEntry, TimeEntryFormData } from '@/types';
import { buildQuickImportTimeEntries, type QuickImportEntry } from '../quick-import';
import { supabase } from '../supabase/client';
import { formatDateISO } from '../utils/date.utils';

/**
 * Mat cleaning bonus in hours (15 minutes = 0.25 hours)
 */
const MAT_CLEANING_BONUS = 0.25;

// Tag on the single adjustment row per (staff_hours_id, entry_type) that
// backs manual edits — see setFieldAdjustment/setMatCleaningAdjustment below.
const ADJUSTMENT_NOTE = 'Manual adjustment';

/**
 * Get all staff hours for a specific payroll period
 */
export const getHoursForPeriod = async (periodId: string): Promise<StaffHours[]> => {
  const { data, error } = await supabase
    .from('staff_hours')
    .select('*')
    .eq('period_id', periodId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Get specific staff hours for a period and staff member
 */
export const getStaffHours = async (
  periodId: string,
  staffId: string
): Promise<StaffHours | null> => {
  const { data, error } = await supabase
    .from('staff_hours')
    .select('*')
    .eq('period_id', periodId)
    .eq('staff_id', staffId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Get or create the staff_hours row for a period/staff pair, with all
 * aggregate fields at zero. The aggregate_time_entries() trigger is the only
 * writer of those fields from here on — this just gives time_entries rows a
 * parent to aggregate into.
 */
export const ensureStaffHoursRow = async (
  periodId: string,
  staffId: string
): Promise<StaffHours> => {
  const existing = await getStaffHours(periodId, staffId);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('staff_hours')
    .insert([
      {
        period_id: periodId,
        staff_id: staffId,
        regular_hours: 0,
        overtime_hours: 0,
        vacation_hours: 0,
        sick_hours: 0,
        mat_cleaning_count: 0,
        total_hours: 0,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Set an hour-based field (regular/overtime/vacation/sick) to an absolute
 * target by maintaining a single tagged adjustment time_entry for that type —
 * the delta between the target and everything else already logged for it.
 * time_entries.hours must stay positive, so a target below what's already
 * logged clamps to that logged total (the closest achievable value); the
 * caller gets the achieved amount back to surface if it didn't fully apply.
 */
async function setFieldAdjustment(
  staffHoursId: string,
  entryType: 'regular' | 'overtime' | 'vacation' | 'sick',
  targetHours: number
): Promise<number> {
  const entries = await getTimeEntries(staffHoursId);
  const sameType = entries.filter((e) => e.entry_type === entryType);
  const otherEntries = sameType.filter((e) => e.notes !== ADJUSTMENT_NOTE);
  const adjustmentEntries = sameType.filter((e) => e.notes === ADJUSTMENT_NOTE);
  const otherSum = otherEntries.reduce((sum, e) => sum + e.hours, 0);

  if (adjustmentEntries.length > 0) {
    const ids = adjustmentEntries.map((e) => e.id);
    const { error } = await supabase.from('time_entries').delete().in('id', ids);
    if (error) {
      throw error;
    }
  }

  const needed = targetHours - otherSum;
  if (needed > 0) {
    const { error } = await supabase.from('time_entries').insert([
      {
        staff_hours_id: staffHoursId,
        entry_date: formatDateISO(new Date()),
        entry_type: entryType,
        hours: needed,
        notes: ADJUSTMENT_NOTE,
        is_after_school_program: false,
      },
    ]);
    if (error) {
      throw error;
    }
  }

  return otherSum + Math.max(needed, 0);
}

/**
 * Same idea as setFieldAdjustment, but mat_cleaning_count is a row COUNT in
 * the trigger, not a sum — so the adjustment is N tagged 0.25h rows, not one
 * row holding a delta.
 */
async function setMatCleaningAdjustment(staffHoursId: string, targetCount: number): Promise<void> {
  const entries = await getTimeEntries(staffHoursId);
  const matEntries = entries.filter((e) => e.entry_type === 'mat_cleaning');
  const otherCount = matEntries.filter((e) => e.notes !== ADJUSTMENT_NOTE).length;
  const adjustmentEntries = matEntries.filter((e) => e.notes === ADJUSTMENT_NOTE);

  if (adjustmentEntries.length > 0) {
    const ids = adjustmentEntries.map((e) => e.id);
    const { error } = await supabase.from('time_entries').delete().in('id', ids);
    if (error) {
      throw error;
    }
  }

  const needed = targetCount - otherCount;
  if (needed > 0) {
    const rows = Array.from({ length: needed }, () => ({
      staff_hours_id: staffHoursId,
      entry_date: formatDateISO(new Date()),
      entry_type: 'mat_cleaning' as const,
      hours: MAT_CLEANING_BONUS,
      notes: ADJUSTMENT_NOTE,
      is_after_school_program: false,
    }));
    const { error } = await supabase.from('time_entries').insert(rows);
    if (error) {
      throw error;
    }
  }
}

/**
 * Set staff_hours fields to absolute manual values via adjustment
 * time_entries, so the aggregation trigger stays the single writer of
 * regular/overtime/vacation/sick/mat_cleaning_count.
 */
export const setManualHours = async (
  periodId: string,
  staffId: string,
  hoursData: Partial<StaffHoursFormData>
): Promise<StaffHours> => {
  const staffHours = await ensureStaffHoursRow(periodId, staffId);

  if (hoursData.regular_hours !== undefined) {
    await setFieldAdjustment(staffHours.id, 'regular', hoursData.regular_hours);
  }
  if (hoursData.overtime_hours !== undefined) {
    await setFieldAdjustment(staffHours.id, 'overtime', hoursData.overtime_hours);
  }
  if (hoursData.vacation_hours !== undefined) {
    await setFieldAdjustment(staffHours.id, 'vacation', hoursData.vacation_hours);
  }
  if (hoursData.sick_hours !== undefined) {
    await setFieldAdjustment(staffHours.id, 'sick', hoursData.sick_hours);
  }
  if (hoursData.mat_cleaning_count !== undefined) {
    await setMatCleaningAdjustment(staffHours.id, hoursData.mat_cleaning_count);
  }

  const refreshed = await getStaffHours(periodId, staffId);
  if (!refreshed) {
    throw new Error('Staff hours row disappeared after adjustment');
  }
  return refreshed;
};

/**
 * Update a single hour field for staff hours (inline table editing). Returns
 * the achieved value, which may fall short of `value` if it would require
 * reducing below hours already logged via real time entries.
 */
export const updateStaffHoursField = async (
  staffHoursId: string,
  field: 'regular_hours' | 'overtime_hours' | 'vacation_hours' | 'sick_hours',
  value: number
): Promise<StaffHours> => {
  const entryType = field.replace(/_hours$/, '') as 'regular' | 'overtime' | 'vacation' | 'sick';
  await setFieldAdjustment(staffHoursId, entryType, value);

  const { data, error } = await supabase
    .from('staff_hours')
    .select('*')
    .eq('id', staffHoursId)
    .single();
  if (error) {
    throw error;
  }
  return data;
};

/**
 * Persist parsed quick-import entries as time_entries rows for a staff member
 * and period. The aggregate_time_entries() DB trigger recomputes the
 * staff_hours totals from the inserted rows.
 */
export const saveQuickImportEntries = async (
  periodId: string,
  staffId: string,
  periodStartDate: string,
  entries: QuickImportEntry[]
): Promise<void> => {
  const staffHours = await ensureStaffHoursRow(periodId, staffId);
  const rows = buildQuickImportTimeEntries(staffHours.id, periodStartDate, entries);

  const { error } = await supabase.from('time_entries').insert(rows);

  if (error) {
    throw error;
  }
};

/**
 * Delete a staff_hours record; its time entries cascade via FK.
 */
export const deleteStaffHours = async (staffHoursId: string): Promise<void> => {
  const { error } = await supabase.from('staff_hours').delete().eq('id', staffHoursId);

  if (error) {
    throw error;
  }
};

/**
 * Get all time entries for specific staff hours
 */
export const getTimeEntries = async (staffHoursId: string): Promise<TimeEntry[]> => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('staff_hours_id', staffHoursId)
    .order('entry_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Add a new time entry
 */
export const addTimeEntry = async (
  staffHoursId: string,
  entry: TimeEntryFormData
): Promise<TimeEntry> => {
  const entryData = {
    ...entry,
    staff_hours_id: staffHoursId,
  };

  const { data, error } = await supabase.from('time_entries').insert([entryData]).select().single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Update an existing time entry
 */
export const updateTimeEntry = async (
  id: string,
  updates: Partial<TimeEntryFormData>
): Promise<TimeEntry> => {
  const { data, error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Delete a time entry
 */
export const deleteTimeEntry = async (id: string): Promise<void> => {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

/**
 * Add a mat cleaning bonus (15-minute entry)
 * This creates a time entry of type 'mat_cleaning'
 */
export const addMatCleaningBonus = async (
  staffHoursId: string,
  entryDate: string,
  notes?: string
): Promise<TimeEntry> => {
  const entryData: TimeEntryFormData = {
    staff_hours_id: staffHoursId,
    entry_date: entryDate,
    hours: MAT_CLEANING_BONUS,
    entry_type: 'mat_cleaning',
    notes: notes || 'Mat cleaning bonus',
    is_after_school_program: false,
  };

  const { data, error } = await supabase.from('time_entries').insert([entryData]).select().single();

  if (error) {
    throw error;
  }

  return data;
};
