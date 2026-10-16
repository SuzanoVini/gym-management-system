import type { UserRole } from './roles';

export interface AdminUser {
  id: string;
  email: string | undefined;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: UserRole;
}

export interface AddUserForm {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

export interface AdminLoadingState {
  initial: boolean;
  add: boolean;
  delete: boolean;
  resetPw: boolean;
  role: boolean;
}

export type FieldErrors = Record<string, string>;
