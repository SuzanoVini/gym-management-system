// app/lib/services/csv-format.service.ts

import type { CSVExportFormat, CSVExportFormatFormData } from '@/types';
import { supabase } from '../supabase/client';

/**
 * Service Result type for consistent error handling
 */
export type ServiceResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Get all CSV export formats
 * @returns Promise with data or error
 */
export const getAllFormats = async (): Promise<ServiceResult<CSVExportFormat[]>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .select('*')
      .order('is_default', { ascending: false })
      .order('format_name', { ascending: true });

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch CSV export formats'),
    };
  }
};

/**
 * Get the default CSV export format
 * @returns Promise with data or error
 */
export const getDefaultFormat = async (): Promise<ServiceResult<CSVExportFormat>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No default format found, return the first format or create one
        const { data: allFormats, error: allError } = await supabase
          .from('csv_export_formats')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1);

        if (allError) {
          throw allError;
        }

        if (allFormats && allFormats.length > 0) {
          return { data: allFormats[0], error: null };
        }

        return {
          data: null,
          error: new Error('No CSV export formats found. Please create one first.'),
        };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch default CSV export format'),
    };
  }
};

/**
 * Get a CSV export format by ID
 * @param id - Format UUID
 * @returns Promise with data or error
 */
export const getFormatById = async (id: string): Promise<ServiceResult<CSVExportFormat>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: new Error(`CSV export format with ID ${id} not found`),
        };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch CSV export format'),
    };
  }
};

/**
 * Create a new CSV export format
 * @param formatData - Format configuration data
 * @returns Promise with data or error
 */
export const createFormat = async (
  formatData: CSVExportFormatFormData
): Promise<ServiceResult<CSVExportFormat>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .insert([formatData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to create CSV export format'),
    };
  }
};

/**
 * Update a CSV export format
 * @param id - Format UUID
 * @param updates - Partial format data
 * @returns Promise with data or error
 */
export const updateFormat = async (
  id: string,
  updates: Partial<CSVExportFormatFormData>
): Promise<ServiceResult<CSVExportFormat>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to update CSV export format'),
    };
  }
};

/**
 * Delete a CSV export format
 * @param id - Format UUID
 * @returns Promise with error only
 */
export const deleteFormat = async (id: string): Promise<ServiceResult<null>> => {
  try {
    const { error } = await supabase.from('csv_export_formats').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return { data: null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to delete CSV export format'),
    };
  }
};

/**
 * Set a format as the default
 * @param id - Format UUID
 * @returns Promise with data or error
 */
export const setDefaultFormat = async (id: string): Promise<ServiceResult<CSVExportFormat>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to set default CSV export format'),
    };
  }
};

/**
 * Get a format by name
 * @param formatName - Format name
 * @returns Promise with data or error
 */
export const getFormatByName = async (
  formatName: string
): Promise<ServiceResult<CSVExportFormat>> => {
  try {
    const { data, error } = await supabase
      .from('csv_export_formats')
      .select('*')
      .eq('format_name', formatName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: new Error(`CSV export format "${formatName}" not found`),
        };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch CSV export format by name'),
    };
  }
};
