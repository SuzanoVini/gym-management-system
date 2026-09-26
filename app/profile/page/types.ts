export interface ProfileFormData {
  full_name: string;
  avatar_url: string;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordStrength {
  score: number;
  text: string;
  color: string;
}

export type FieldErrors = Record<string, string>;
