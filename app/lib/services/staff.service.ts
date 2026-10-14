// app/lib/services/staff.service.ts

import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import type { StaffMember } from '@/types';
import { supabase } from '../supabase/client';

export {
  createStaff,
  deleteStaff,
  permanentlyDeleteStaff,
  reactivateStaff,
  updateStaff,
} from './staff.service/mutations';

/**
 * Service Result type for consistent error handling
 */
export type ServiceResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Get all staff members (active and inactive)
 * @returns Promise with data or error
 */
export const getAllStaff = async (): Promise<ServiceResult<StaffMember[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .order('full_name', { ascending: true })) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch staff members'),
    };
  }
};

/**
 * Get only active staff members
 * @returns Promise with data or error
 */
export const getActiveStaff = async (): Promise<ServiceResult<StaffMember[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch active staff members'),
    };
  }
};

/**
 * Get a single staff member by ID
 * @param id - Staff member UUID
 * @returns Promise with data or error
 */
export const getStaffById = async (id: string): Promise<ServiceResult<StaffMember>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .eq('id', id)
      .single()) as PostgrestSingleResponse<StaffMember>;

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: new Error(`Staff member with ID ${id} not found`),
        };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch staff member'),
    };
  }
};

/**
 * Get a staff member by employee/payroll ID
 * @param employeeId - Employee ID (e.g., '1023', '1030')
 * @returns Promise with data or error
 */
export const getStaffByEmployeeId = async (
  employeeId: string
): Promise<ServiceResult<StaffMember[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .eq('employee_id', employeeId)
      .order('job_title', { ascending: true })) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch staff member by employee ID'),
    };
  }
};

/**
 * Get contractors only
 * Note: Based on the database schema, contractors are identified through
 * app_configuration table. This is a simplified version that filters by job title
 * @returns Promise with data or error
 */
export const getContractors = async (): Promise<ServiceResult<StaffMember[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    // Filter contractors based on configuration
    // This is a simplified approach - in production you'd query the app_configuration table
    const contractors = (data || []).filter((staff) => {
      const title = staff.job_title.toLowerCase();
      return title.includes('contractor') || title.includes('special class');
    });

    return { data: contractors, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch contractors'),
    };
  }
};

/**
 * Get staff members by job title
 * @param jobTitle - Job title to filter by
 * @returns Promise with data or error
 */
export const getStaffByJobTitle = async (
  jobTitle: string
): Promise<ServiceResult<StaffMember[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .eq('job_title', jobTitle)
      .eq('is_active', true)
      .order('full_name', { ascending: true })) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch staff by job title'),
    };
  }
};

/**
 * Search staff members by name
 * @param searchTerm - Search term to match against full_name
 * @returns Promise with data or error
 */
export const searchStaffByName = async (
  searchTerm: string
): Promise<ServiceResult<StaffMember[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')
      .ilike('full_name', `%${searchTerm}%`)
      .eq('is_active', true)
      .order('full_name', { ascending: true })) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to search staff members'),
    };
  }
};

/**
 * Get unique job titles from active staff
 * Useful for dropdowns and filters
 * @returns Promise with data or error
 */
export const getJobTitles = async (): Promise<ServiceResult<string[]>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('job_title')
      .eq('is_active', true)
      .order('job_title', { ascending: true })) as PostgrestResponse<
      Pick<StaffMember, 'job_title'>
    >;

    if (error) {
      throw error;
    }

    // Extract unique job titles
    const uniqueTitles = [...new Set((data || []).map((item) => item.job_title))];

    return { data: uniqueTitles, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch job titles'),
    };
  }
};

/**
 * Get staff count statistics
 * @returns Promise with statistics or error
 */
export const getStaffStats = async (): Promise<
  ServiceResult<{
    total: number;
    active: number;
    inactive: number;
    byJobTitle: Record<string, number>;
  }>
> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .select('*')) as PostgrestResponse<StaffMember>;

    if (error) {
      throw error;
    }

    const allStaff = data || [];
    const active = allStaff.filter((s) => s.is_active);
    const inactive = allStaff.filter((s) => !s.is_active);

    // Count by job title
    const byJobTitle: Record<string, number> = {};
    for (const staff of active) {
      byJobTitle[staff.job_title] = (byJobTitle[staff.job_title] || 0) + 1;
    }

    return {
      data: {
        total: allStaff.length,
        active: active.length,
        inactive: inactive.length,
        byJobTitle,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch staff statistics'),
    };
  }
};
