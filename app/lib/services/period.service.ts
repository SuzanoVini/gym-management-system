// app/lib/services/period.service.ts

import type { PayrollPeriod, PayrollPeriodFormData } from '@/types';
import { supabase } from '../supabase/client';

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
 * Generate a period label in the format MM/DD/YY - MM/DD/YY
 */
export const generatePeriodLabel = (startDate: string, endDate: string): string => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
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
