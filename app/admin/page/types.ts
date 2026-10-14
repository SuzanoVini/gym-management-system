export interface AdminUser {
  id: string;
  email: string | undefined;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AddUserForm {
  email: string;
  full_name: string;
  password: string;
}

export interface AdminLoadingState {
  initial: boolean;
  add: boolean;
  delete: boolean;
  resetPw: boolean;
}

export type FieldErrors = Record<string, string>;
