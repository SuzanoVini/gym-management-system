import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { profileSchema } from '@/lib/validations';
import type { FieldErrors, ProfileFormData } from './types';

type ProfileRow = { full_name: string | null; avatar_url: string | null };

function issuesToFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const fieldErrors: FieldErrors = {};
  issues.forEach((err) => {
    if (err.path[0]) {
      fieldErrors[err.path[0].toString()] = err.message;
    }
  });
  return fieldErrors;
}

export function useProfileForm(user: User | null) {
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    avatar_url: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const loadUserProfile = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const row = data as ProfileRow | null;
      if (row) {
        setProfileData({
          full_name: row.full_name || '',
          avatar_url: row.avatar_url || '',
        });
        setPreviewUrl(row.avatar_url || '');
      }
    } catch (err) {
      errorHandler.handle(err, 'loadUserProfile');
    } finally {
      setInitialLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    void loadUserProfile();
  }, [loadUserProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      setErrors({ avatar: 'Please select a valid image file (JPG, PNG, or WebP)' });
      return;
    }

    if (file.size > maxSize) {
      setErrors({ avatar: 'File size must be less than 2MB' });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setErrors((prev) => ({ ...prev, avatar: '' }));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !user) {
      return null;
    }

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, selectedFile, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return publicUrl;
  };

  const saveProfile = async (currentUser: User) => {
    let avatarUrl = profileData.avatar_url;

    if (selectedFile) {
      avatarUrl = (await uploadAvatar()) || avatarUrl;
    }

    const validationData = {
      full_name: profileData.full_name,
      avatar_url: avatarUrl || '',
    };

    const result = profileSchema.safeParse(validationData);
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error.issues));
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: currentUser.id,
        full_name: profileData.full_name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    if (error) {
      throw error;
    }

    setProfileData((prev) => ({ ...prev, avatar_url: avatarUrl }));
    setSelectedFile(null);
    errorHandler.notify('Profile updated successfully', 'success');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      await saveProfile(user);
    } catch (err) {
      errorHandler.handle(err, 'updateProfile');
    } finally {
      setSaving(false);
    }
  };

  return {
    fileInputRef,
    profileData,
    setProfileData,
    previewUrl,
    initialLoading,
    saving,
    errors,
    handleFileChange,
    handleProfileSubmit,
  };
}

export type ProfileFormState = ReturnType<typeof useProfileForm>;
