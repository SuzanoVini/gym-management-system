// app/lib/services/hours.service/timeEntries.ts
// time_entries CRUD for staff hours; re-exported from hours.service.

import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import type { TimeEntry, TimeEntryFormData } from '@/types';
import { supabase } from '../../supabase/client';

/**
 * Mat cleaning bonus in hours (15 minutes = 0.25 hours)
 */
export const MAT_CLEANING_BONUS = 0.25;

/**
 * Get all time entries for specific staff hours
 */
export const getTimeEntries = async (staffHoursId: string): Promise<TimeEntry[]> => {
  const { data, error } = (await supabase
    .from('time_entries')
    .select('*')
    .eq('staff_hours_id', staffHoursId)
    .order('entry_date', { ascending: false })) as PostgrestResponse<TimeEntry>;

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

  const { data, error } = (await supabase
    .from('time_entries')
    .insert([entryData])
    .select()
    .single()) as PostgrestSingleResponse<TimeEntry>;

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
  const { data, error } = (await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()) as PostgrestSingleResponse<TimeEntry>;

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

  const { data, error } = (await supabase
    .from('time_entries')
    .insert([entryData])
    .select()
    .single()) as PostgrestSingleResponse<TimeEntry>;

  if (error) {
    throw error;
  }

  return data;
};
