// app/lib/services/staff.service/mutations.ts
// Staff member writes; re-exported from staff.service.

import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import type { StaffMember, StaffMemberFormData } from '@/types';
import { supabase } from '../../supabase/client';
import type { ServiceResult } from '../staff.service';

/**
 * Create a new staff member
 * @param staffData - Staff member data
 * @returns Promise with data or error
 */
export const createStaff = async (
  staffData: StaffMemberFormData
): Promise<ServiceResult<StaffMember>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .insert([staffData])
      .select()
      .single()) as PostgrestSingleResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to create staff member'),
    };
  }
};

/**
 * Update a staff member
 * @param id - Staff member UUID
 * @param updates - Partial staff member data
 * @returns Promise with data or error
 */
export const updateStaff = async (
  id: string,
  updates: Partial<StaffMemberFormData>
): Promise<ServiceResult<StaffMember>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()) as PostgrestSingleResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to update staff member'),
    };
  }
};

/**
 * Soft delete a staff member (set is_active to false)
 * @param id - Staff member UUID
 * @returns Promise with data or error
 */
export const deleteStaff = async (id: string): Promise<ServiceResult<StaffMember>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()) as PostgrestSingleResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to delete staff member'),
    };
  }
};

/**
 * Permanently delete a staff member (hard delete)
 * Warning: This cannot be undone. Use deleteStaff for soft delete instead.
 * @param id - Staff member UUID
 * @returns Promise with error only
 */
export const permanentlyDeleteStaff = async (id: string): Promise<ServiceResult<null>> => {
  try {
    const { error } = await supabase.from('staff_members').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return { data: null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to permanently delete staff member'),
    };
  }
};

/**
 * Reactivate a staff member (set is_active to true)
 * @param id - Staff member UUID
 * @returns Promise with data or error
 */
export const reactivateStaff = async (id: string): Promise<ServiceResult<StaffMember>> => {
  try {
    const { data, error } = (await supabase
      .from('staff_members')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single()) as PostgrestSingleResponse<StaffMember>;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to reactivate staff member'),
    };
  }
};
