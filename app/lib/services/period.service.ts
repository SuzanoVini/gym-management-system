// app/lib/services/period.service.ts

import type { PayrollPeriod, PayrollPeriodFormData } from '@/types';
import { supabase } from '../supabase/client';
import { formatDateISO, generatePeriodLabel, getPayrollPeriodForDate } from '../utils/date.utils';

// Re-exported for existing callers; the timezone-safe implementation lives in
// date.utils (parsing YYYY-MM-DD with new Date() rendered labels a day early)
export { generatePeriodLabel };

/**
 * Get the current active payroll period
 */
export const getCurrentPeriod = async (): Promise<PayrollPeriod | null> => {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('is_current', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No current period found
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * Get all payroll periods
 */
export const getAllPeriods = async (): Promise<PayrollPeriod[]> => {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Get a specific payroll period by ID
 */
export const getPeriodById = async (id: string): Promise<PayrollPeriod | null> => {
  const { data, error } = await supabase.from('payroll_periods').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Period not found
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * Create a new payroll period
 */
export const createPeriod = async (startDate: string, endDate: string): Promise<PayrollPeriod> => {
  const periodLabel = generatePeriodLabel(startDate, endDate);

  const periodData: PayrollPeriodFormData = {
    period_label: periodLabel,
    start_date: startDate,
    end_date: endDate,
    is_current: false,
    is_closed: false,
  };

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert([periodData])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Update a payroll period
 */
export const updatePeriod = async (
  id: string,
  updates: Partial<PayrollPeriodFormData>
): Promise<PayrollPeriod> => {
  const { data, error } = await supabase
    .from('payroll_periods')
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
 * Set a period as the current active period
 * This will set all other periods to is_current = false
 */
export const setCurrentPeriod = async (id: string): Promise<PayrollPeriod> => {
  // First, set all periods to not current
  const { error: updateAllError } = await supabase
    .from('payroll_periods')
    .update({ is_current: false })
    .neq('id', id);

  if (updateAllError) {
    throw updateAllError;
  }

  // Then set the specified period as current
  const { data, error } = await supabase
    .from('payroll_periods')
    .update({ is_current: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Close a payroll period
 * Once closed, a period should not be modified
 */
export const closePeriod = async (id: string): Promise<PayrollPeriod> => {
  const { data, error } = await supabase
    .from('payroll_periods')
    .update({ is_closed: true, is_current: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// ============================================================================
// Automatic Period Calculation and Management
// ============================================================================

/**
 * Calculate the current biweekly period based on today's date
 *
 * Biweekly periods are:
 * - Period 1: 1st day of month to 15th day of month
 * - Period 2: 16th day of month to last day of month
 *
 * @param date - Optional date to calculate period for (defaults to today)
 * @returns Object with start and end dates in ISO format (YYYY-MM-DD)
 *
 * @example
 * // Today = Jan 24, 2026 → Period: Jan 16 - Jan 31, 2026
 * calculateCurrentPeriod()
 * // { startDate: "2026-01-16", endDate: "2026-01-31" }
 *
 * // Today = Feb 4, 2026 → Period: Feb 1 - Feb 15, 2026
 * calculateCurrentPeriod()
 * // { startDate: "2026-02-01", endDate: "2026-02-15" }
 */
export const calculateCurrentPeriod = (
  date: Date = new Date()
): { startDate: string; endDate: string } => {
  const { start, end } = getPayrollPeriodForDate(date);

  return {
    startDate: formatDateISO(start),
    endDate: formatDateISO(end),
  };
};

/**
 * Find or create the current payroll period
 *
 * This function:
 * 1. Calculates the current biweekly period based on today's date
 * 2. Checks if a period exists with matching start/end dates
 * 3. If found, returns the existing period
 * 4. If not found, creates a new period and returns it
 * 5. Sets the found/created period as the current active period
 *
 * @returns The current payroll period
 *
 * @example
 * const period = await findOrCreateCurrentPeriod();
 * // Returns existing or newly created current period
 */
export const findOrCreateCurrentPeriod = async (): Promise<PayrollPeriod> => {
  const { startDate, endDate } = calculateCurrentPeriod();

  // Check if a period exists with these exact dates
  const { data: existingPeriod, error: searchError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  // If period exists, set it as current and return it
  if (existingPeriod) {
    return await setCurrentPeriod(existingPeriod.id);
  }

  // Otherwise, create a new period
  const newPeriod = await createPeriod(startDate, endDate);

  // Set it as the current period
  return await setCurrentPeriod(newPeriod.id);
};
