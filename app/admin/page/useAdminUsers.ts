import { useCallback, useEffect, useState } from 'react';
import { reportConsoleError } from '@/lib/logger';
import type { AddUserForm, AdminLoadingState, AdminUser, FieldErrors } from './types';

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<AdminLoadingState>({
    initial: true,
    add: false,
    delete: false,
    resetPw: false,
  });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading((prev) => ({ ...prev, initial: true }));
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users);
    } catch (err) {
      reportConsoleError(err);
    } finally {
      setLoading((prev) => ({ ...prev, initial: false }));
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  }

  return {
    users,
    setUsers,
    loading,
    setLoading,
    selectedUser,
    setSelectedUser,
    successMessage,
    showSuccess,
  };
}

type AdminUsersState = ReturnType<typeof useAdminUsers>;

function validateAddForm(addForm: AddUserForm): FieldErrors {
  const newErrors: FieldErrors = {};
  if (!addForm.email) {
    newErrors.email = 'Email is required';
  }
  if (!addForm.full_name) {
    newErrors.full_name = 'Name is required';
  }
  if (!addForm.password || addForm.password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters';
  }
  return newErrors;
}

export function useAddUserModal({ setUsers, setLoading, showSuccess }: AdminUsersState) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<AddUserForm>({ email: '', full_name: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors = validateAddForm(form);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading((prev) => ({ ...prev, add: true }));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { user?: AdminUser; error?: string };
      if (!res.ok) {
        setErrors({ form: data.error ?? 'Failed to create user' });
        return;
      }
      if (data.user) {
        setUsers((prev) => [...prev, data.user as AdminUser]);
      }
      setIsOpen(false);
      setForm({ email: '', full_name: '', password: '' });
      setErrors({});
      showSuccess('User created successfully');
    } finally {
      setLoading((prev) => ({ ...prev, add: false }));
    }
  }

  const open = () => {
    setErrors({});
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setForm({ email: '', full_name: '', password: '' });
    setErrors({});
  };

  return { isOpen, form, setForm, errors, handleSubmit, open, close };
}

export function useDeleteUserModal({
  selectedUser,
  setSelectedUser,
  setUsers,
  setLoading,
  showSuccess,
}: AdminUsersState) {
  const [isOpen, setIsOpen] = useState(false);

  async function handleDelete() {
    if (!selectedUser) {
      return;
    }
    setLoading((prev) => ({ ...prev, delete: true }));
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        reportConsoleError(d.error);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setIsOpen(false);
      setSelectedUser(null);
      showSuccess('User deleted');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  }

  const open = (user: AdminUser) => {
    setSelectedUser(user);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSelectedUser(null);
  };

  return { isOpen, handleDelete, open, close };
}

export function useResetPasswordModal({
  selectedUser,
  setSelectedUser,
  setLoading,
  showSuccess,
}: AdminUsersState) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      return;
    }
    if (!password || password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' });
      return;
    }
    setLoading((prev) => ({ ...prev, resetPw: true }));
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setErrors({ form: d.error ?? 'Failed to reset password' });
        return;
      }
      setIsOpen(false);
      setPassword('');
      setSelectedUser(null);
      setErrors({});
      showSuccess('Password reset successfully');
    } finally {
      setLoading((prev) => ({ ...prev, resetPw: false }));
    }
  }

  const open = (user: AdminUser) => {
    setSelectedUser(user);
    setErrors({});
    setPassword('');
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSelectedUser(null);
    setPassword('');
    setErrors({});
  };

  return { isOpen, password, setPassword, errors, handleSubmit, open, close };
}
