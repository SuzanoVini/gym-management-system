import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { getPasswordStrength, validatePasswordFields } from './passwordValidation';
import type { FieldErrors, PasswordFormData, PasswordStrength } from './types';

export function usePasswordForm(user: User | null) {
  const supabase = createClientComponentClient();
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    text: '',
    color: '',
  });

  useEffect(() => {
    if (passwordData.newPassword) {
      setPasswordStrength(getPasswordStrength(passwordData.newPassword));
    } else {
      setPasswordStrength({ score: 0, text: '', color: '' });
    }
  }, [passwordData.newPassword]);

  const changePassword = async (currentUser: User) => {
    const fieldErrors = validatePasswordFields(passwordData);

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    if (!currentUser.email) {
      setErrors({ currentPassword: 'Unable to verify current password' });
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: passwordData.currentPassword,
    });
    if (verifyError) {
      setErrors({ currentPassword: 'Current password is incorrect' });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      throw error;
    }

    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    errorHandler.notify('Password updated successfully', 'success');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      await changePassword(user);
    } catch (err) {
      errorHandler.handle(err, 'updatePassword');
    } finally {
      setSaving(false);
    }
  };

  return {
    passwordData,
    setPasswordData,
    saving,
    errors,
    passwordStrength,
    handlePasswordSubmit,
  };
}

export type PasswordFormState = ReturnType<typeof usePasswordForm>;
