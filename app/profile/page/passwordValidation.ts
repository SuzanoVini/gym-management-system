import { passwordSchema } from '@/lib/validations';
import type { FieldErrors, PasswordFormData, PasswordStrength } from './types';

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) {
    score++;
  }
  if (password.length >= 12) {
    score++;
  }
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  }
  if (/\d/.test(password)) {
    score++;
  }
  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  }

  const strengthMap = [
    { score: 0, text: '', color: '' },
    { score: 1, text: 'Very Weak', color: 'bg-red-500' },
    { score: 2, text: 'Weak', color: 'bg-orange-500' },
    { score: 3, text: 'Fair', color: 'bg-yellow-500' },
    { score: 4, text: 'Good', color: 'bg-blue-500' },
    { score: 5, text: 'Strong', color: 'bg-green-500' },
  ];

  return strengthMap[score] ?? { score: 0, text: 'Weak', color: 'bg-red-500' };
}

export function validatePasswordFields(passwordData: PasswordFormData): FieldErrors {
  const fieldErrors: FieldErrors = {};

  if (!passwordData.currentPassword) {
    fieldErrors.currentPassword = 'Current password is required';
  }

  if (passwordData.newPassword) {
    const result = passwordSchema.safeParse(passwordData.newPassword);
    if (!result.success) {
      fieldErrors.newPassword = result.error.issues[0]?.message || 'Invalid password';
    }
  } else {
    fieldErrors.newPassword = 'New password is required';
  }

  if (passwordData.newPassword !== passwordData.confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match';
  }

  return fieldErrors;
}
