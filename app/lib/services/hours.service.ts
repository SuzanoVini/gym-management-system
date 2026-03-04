// app/lib/services/hours.service.ts

import type { StaffHours, StaffHoursFormData, TimeEntry, TimeEntryFormData } from '@/types';
import { supabase } from '../supabase/client';

/**
 * Mat cleaning bonus in hours (15 minutes = 0.25 hours)
 */
const MAT_CLEANING_BONUS = 0.25;

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
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No staff hours found
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * Create or update staff hours (upsert)
 */
export const createOrUpdateHours = async (
  periodId: string,
  staffId: string,
  hoursData: Partial<StaffHoursFormData>
): Promise<StaffHours> => {
  // Check if hours already exist
  const existing = await getStaffHours(periodId, staffId);

  if (existing) {
    // Update existing hours
    const { data, error } = await supabase
      .from('staff_hours')
      .update(hoursData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // Create new hours
  const newHoursData: StaffHoursFormData = {
    period_id: periodId,
    staff_id: staffId,
    regular_hours: 0,
    overtime_hours: 0,
    vacation_hours: 0,
    sick_hours: 0,
    mat_cleaning_count: 0,
    total_hours: 0,
    ...hoursData,
  };

  const { data, error } = await supabase
    .from('staff_hours')
    .insert([newHoursData])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
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

  // Recalculate total hours after adding entry
  await calculateTotalHours(staffHoursId);

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

  // Recalculate total hours after updating entry
  await calculateTotalHours(data.staff_hours_id);

  return data;
};

/**
 * Delete a time entry
 */
export const deleteTimeEntry = async (id: string): Promise<void> => {
  // Get the time entry first to know which staff_hours to recalculate
  const { data: entry, error: fetchError } = await supabase
    .from('time_entries')
    .select('staff_hours_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const { error } = await supabase.from('time_entries').delete().eq('id', id);

  if (error) {
    throw error;
  }

  // Recalculate total hours after deleting entry
  if (entry) {
    await calculateTotalHours(entry.staff_hours_id);
  }
};

/**
 * Calculate and update total hours for staff hours based on time entries
 */
export const calculateTotalHours = async (staffHoursId: string): Promise<StaffHours> => {
  // Get all time entries for this staff hours
  const entries = await getTimeEntries(staffHoursId);

  // Calculate totals by type
  let regularHours = 0;
  let overtimeHours = 0;
  let vacationHours = 0;
  let sickHours = 0;
  let matCleaningCount = 0;

  for (const entry of entries) {
    switch (entry.entry_type) {
      case 'regular':
        regularHours += entry.hours;
        break;
      case 'overtime':
        overtimeHours += entry.hours;
        break;
      case 'vacation':
        vacationHours += entry.hours;
        break;
      case 'sick':
        sickHours += entry.hours;
        break;
      case 'mat_cleaning':
        matCleaningCount += 1;
        break;
    }
  }

  // Calculate total hours including mat cleaning bonus
  const matCleaningHours = matCleaningCount * MAT_CLEANING_BONUS;
  const totalHours = regularHours + overtimeHours + vacationHours + sickHours + matCleaningHours;

  // Update staff hours
  const { data, error } = await supabase
    .from('staff_hours')
    .update({
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      vacation_hours: vacationHours,
      sick_hours: sickHours,
      mat_cleaning_count: matCleaningCount,
      total_hours: totalHours,
    })
    .eq('id', staffHoursId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
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

  // Recalculate total hours after adding mat cleaning bonus
  await calculateTotalHours(staffHoursId);

  return data;
};

/**
 * Update specific hour fields for staff hours (for inline editing)
 */
export const updateStaffHoursField = async (
  staffHoursId: string,
  field: 'regular_hours' | 'overtime_hours' | 'vacation_hours' | 'sick_hours',
  value: number
): Promise<StaffHours> => {
  // Get current staff hours to recalculate total
  const { data: currentHours, error: fetchError } = await supabase
    .from('staff_hours')
    .select('*')
    .eq('id', staffHoursId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Update the specific field
  const updates: Partial<StaffHours> = { [field]: value };

  // Recalculate total hours
  const matCleaningHours = currentHours.mat_cleaning_count * MAT_CLEANING_BONUS;
  const newRegular = field === 'regular_hours' ? value : currentHours.regular_hours;
  const newOvertime = field === 'overtime_hours' ? value : currentHours.overtime_hours;
  const newVacation = field === 'vacation_hours' ? value : currentHours.vacation_hours;
  const newSick = field === 'sick_hours' ? value : currentHours.sick_hours;

  updates.total_hours = newRegular + newOvertime + newVacation + newSick + matCleaningHours;

  // Update the database
  const { data, error } = await supabase
    .from('staff_hours')
    .update(updates)
    .eq('id', staffHoursId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};
