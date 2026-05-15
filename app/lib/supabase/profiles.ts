// app/lib/supabase/profiles.ts

import { errors } from '@/lib/errorHandler';
import { supabase } from './client';
import type { Database } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User profile from database
 */
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

/**
 * Profile update data
 */
export type ProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

/**
 * Profile insert data
 */
export type ProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];

/**
 * Password update validation
 */
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/**
 * File upload constraints
 */
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_BUCKET = 'avatars';

// ============================================================================
// Profile CRUD Operations
// ============================================================================

/**
 * Fetch user profile by user ID
 * @param userId - The user's UUID
 * @returns User profile data or null if not found
 * @throws Error if database query fails
 */
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) {
    throw errors.validation('userId', 'User ID is required');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // Profile not found is not an error - user might not have created profile yet
    if (error.code === 'PGRST116') {
      return null;
    }
    throw errors.database('fetch profile', error.message);
  }

  return data;
};

/**
 * Update user profile fields (full_name, avatar_url)
 * @param userId - The user's UUID
 * @param updates - Partial profile data to update
 * @returns Updated profile data
 * @throws Error if validation fails or database query fails
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<ProfileUpdate>
): Promise<UserProfile> => {
  if (!userId) {
    throw errors.validation('userId', 'User ID is required');
  }

  // Validate full_name if provided
  if (updates.full_name !== undefined) {
    const name = updates.full_name.trim();
    if (!name || name.length === 0) {
      throw errors.validation('full_name', 'Name cannot be empty');
    }
    if (name.length > 100) {
      throw errors.validation('full_name', 'Name is too long (max 100 characters)');
    }
    updates.full_name = name;
  }

  // Set updated_at timestamp
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw errors.database('update profile', error.message);
  }

  return data;
};

/**
 * Create a new user profile
 * @param profileData - Profile data including user ID
 * @returns Created profile data
 * @throws Error if validation fails or database query fails
 */
export const createUserProfile = async (profileData: ProfileInsert): Promise<UserProfile> => {
  if (!profileData.id) {
    throw errors.validation('id', 'User ID is required');
  }

  if (!profileData.full_name || profileData.full_name.trim().length === 0) {
    throw errors.validation('full_name', 'Name is required');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert([profileData])
    .select()
    .single();

  if (error) {
    throw errors.database('create profile', error.message);
  }

  return data;
};

// ============================================================================
// Avatar Management
// ============================================================================

/**
 * Validate avatar file before upload
 * @param file - The file to validate
 * @throws Error if file is invalid
 */
const validateAvatarFile = (file: File): void => {
  // Check file size
  if (file.size > MAX_AVATAR_SIZE) {
    throw errors.validation(
      'avatar',
      `File size exceeds maximum of ${MAX_AVATAR_SIZE / 1024 / 1024}MB`
    );
  }

  // Check file type
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw errors.validation(
      'avatar',
      `Invalid file type. Allowed types: ${ALLOWED_AVATAR_TYPES.join(', ')}`
    );
  }
};

/**
 * Upload profile avatar to Supabase Storage
 * @param userId - The user's UUID
 * @param file - The avatar image file
 * @returns Public URL of the uploaded avatar
 * @throws Error if upload fails or file is invalid
 */
export const uploadProfileAvatar = async (userId: string, file: File): Promise<string> => {
  if (!userId) {
    throw errors.validation('userId', 'User ID is required');
  }

  if (!file) {
    throw errors.validation('file', 'File is required');
  }

  // Validate file
  validateAvatarFile(file);

  // Generate unique filename with timestamp to prevent caching issues
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${timestamp}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Delete old avatar if it exists (to clean up storage)
  const profile = await fetchUserProfile(userId);
  if (profile?.avatar_url) {
    await deleteProfileAvatar(userId, false); // Don't update database yet
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (uploadError) {
    throw errors.database('upload avatar', uploadError.message);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  // Update profile with new avatar URL
  await updateUserProfile(userId, { avatar_url: publicUrl });

  return publicUrl;
};

/**
 * Delete profile avatar from storage and database
 * @param userId - The user's UUID
 * @param updateDatabase - Whether to clear avatar_url in database (default: true)
 * @throws Error if deletion fails
 */
export const deleteProfileAvatar = async (userId: string, updateDatabase = true): Promise<void> => {
  if (!userId) {
    throw errors.validation('userId', 'User ID is required');
  }

  // Get current profile to find avatar URL
  const profile = await fetchUserProfile(userId);
  if (!profile?.avatar_url) {
    return; // No avatar to delete
  }

  // Extract file path from URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/avatars/<userId>/<filename>
  const urlParts = profile.avatar_url.split(`${AVATAR_BUCKET}/`);
  const filePath = urlParts[1];

  if (filePath) {
    // Delete from storage
    const { error: deleteError } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);

    if (deleteError) {
      // Log error but don't throw - avatar might already be deleted
      console.error('Error deleting avatar from storage:', deleteError);
    }
  }

  // Clear avatar_url in database
  if (updateDatabase) {
    await updateUserProfile(userId, { avatar_url: null });
  }
};

// ============================================================================
// Password Management
// ============================================================================

/**
 * Validate password strength
 * @param password - The password to validate
 * @throws Error if password is invalid
 */
const validatePassword = (password: string): void => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw errors.validation(
      'password',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  if (!PASSWORD_REGEX.test(password)) {
    throw errors.validation(
      'password',
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );
  }
};

/**
 * Update user password using Supabase auth
 * @param newPassword - The new password
 * @returns Success status
 * @throws Error if password is invalid or update fails
 */
export const updateUserPassword = async (newPassword: string): Promise<boolean> => {
  // Validate password strength
  validatePassword(newPassword);

  // Update password using Supabase auth
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw errors.database('update password', error.message);
  }

  return true;
};

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to profile changes
 * @param userId - The user's UUID to subscribe to
 * @param callback - Callback function to handle changes
 * @returns Supabase channel for cleanup
 */
// biome-ignore lint/suspicious/noExplicitAny: Supabase subscription callback requires any type
export const subscribeToProfile = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`profile-${userId}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};
