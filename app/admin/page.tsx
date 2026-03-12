'use client';

import { ArrowLeft, KeyRound, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import Modal from '@/components/ui/Modal';

interface AdminUser {
  id: string;
  email: string | undefined;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface AddUserForm {
  email: string;
  full_name: string;
  password: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex form handlers with multiple modals and state updates
function AdminPageContent() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState({
    initial: true,
    add: false,
    delete: false,
    resetPw: false,
  });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resetPwModalOpen, setResetPwModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [addForm, setAddForm] = useState<AddUserForm>({ email: '', full_name: '', password: '' });
  const [resetPwPassword, setResetPwPassword] = useState('');
  const [errors, setErrors] = useState<{
    add: Record<string, string>;
    resetPw: Record<string, string>;
  }>({
    add: {},
    resetPw: {},
  });
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
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, initial: false }));
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!addForm.email) {
      newErrors.email = 'Email is required';
    }
    if (!addForm.full_name) {
      newErrors.full_name = 'Name is required';
    }
    if (!addForm.password || addForm.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, add: newErrors }));
      return;
    }

    setLoading((prev) => ({ ...prev, add: true }));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = (await res.json()) as { user?: AdminUser; error?: string };
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, add: { form: data.error ?? 'Failed to create user' } }));
        return;
      }
      if (data.user) {
        setUsers((prev) => [...prev, data.user as AdminUser]);
      }
      setAddModalOpen(false);
      setAddForm({ email: '', full_name: '', password: '' });
      setErrors((prev) => ({ ...prev, add: {} }));
      showSuccess('User created successfully');
    } finally {
      setLoading((prev) => ({ ...prev, add: false }));
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) {
      return;
    }
    setLoading((prev) => ({ ...prev, delete: true }));
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        console.error(d.error);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setDeleteModalOpen(false);
      setSelectedUser(null);
      showSuccess('User deleted');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      return;
    }
    if (!resetPwPassword || resetPwPassword.length < 8) {
      setErrors((prev) => ({
        ...prev,
        resetPw: { password: 'Password must be at least 8 characters' },
      }));
      return;
    }
    setLoading((prev) => ({ ...prev, resetPw: true }));
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPwPassword }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setErrors((prev) => ({
          ...prev,
          resetPw: { form: d.error ?? 'Failed to reset password' },
        }));
        return;
      }
      setResetPwModalOpen(false);
      setResetPwPassword('');
      setSelectedUser(null);
      setErrors((prev) => ({ ...prev, resetPw: {} }));
      showSuccess('Password reset successfully');
    } finally {
      setLoading((prev) => ({ ...prev, resetPw: false }));
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-colors text-sm';

  const btnSecondary =
    'flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors cursor-pointer text-sm';

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-[#020617]/80 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            <h1 className="text-white font-semibold text-lg">User Management</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Success banner */}
        {successMessage && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm transition-all">
            {successMessage}
          </div>
        )}

        {/* Main card */}
        <div className="rounded-xl backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-white font-medium">Staff Accounts</h2>
              <p className="text-white/50 text-sm mt-0.5">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrors((prev) => ({ ...prev, add: {} }));
                setAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {/* Table area */}
          {loading.initial ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-white/40 text-sm">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-3 text-white/50 font-medium">Name</th>
                    <th className="text-left px-6 py-3 text-white/50 font-medium">Email</th>
                    <th className="text-left px-6 py-3 text-white/50 font-medium hidden sm:table-cell">
                      Created
                    </th>
                    <th className="text-left px-6 py-3 text-white/50 font-medium hidden md:table-cell">
                      Last Sign-in
                    </th>
                    <th className="px-6 py-3 text-white/50 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                        i % 2 !== 0 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-white font-medium">{u.full_name ?? '—'}</td>
                      <td className="px-6 py-4 text-white/70">{u.email}</td>
                      <td className="px-6 py-4 text-white/50 hidden sm:table-cell">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-4 text-white/50 hidden md:table-cell">
                        {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setErrors((prev) => ({ ...prev, resetPw: {} }));
                              setResetPwPassword('');
                              setResetPwModalOpen(true);
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors cursor-pointer"
                            aria-label={`Reset password for ${u.full_name ?? u.email}`}
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {currentUser?.id !== u.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                              aria-label={`Delete ${u.full_name ?? u.email}`}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddForm({ email: '', full_name: '', password: '' });
          setErrors((prev) => ({ ...prev, add: {} }));
        }}
        title="Add New User"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          {errors.add.form && <p className="text-red-400 text-sm">{errors.add.form}</p>}
          <div>
            <label htmlFor="add_full_name" className="block text-white/70 text-sm mb-1.5">
              Full Name
            </label>
            <input
              id="add_full_name"
              type="text"
              value={addForm.full_name}
              onChange={(e) => setAddForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className={inputClass}
              placeholder="Jane Doe"
            />
            {errors.add.full_name && (
              <p className="text-red-400 text-xs mt-1">{errors.add.full_name}</p>
            )}
          </div>
          <div>
            <label htmlFor="add_email" className="block text-white/70 text-sm mb-1.5">
              Email
            </label>
            <input
              id="add_email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
              className={inputClass}
              placeholder="name@example.com"
            />
            {errors.add.email && <p className="text-red-400 text-xs mt-1">{errors.add.email}</p>}
          </div>
          <div>
            <label htmlFor="add_password" className="block text-white/70 text-sm mb-1.5">
              Password
            </label>
            <input
              id="add_password"
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
              className={inputClass}
              placeholder="Min. 8 characters"
            />
            {errors.add.password && (
              <p className="text-red-400 text-xs mt-1">{errors.add.password}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setAddForm({ email: '', full_name: '', password: '' });
                setErrors((prev) => ({ ...prev, add: {} }));
              }}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading.add}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {loading.add ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">
              {selectedUser?.full_name ?? selectedUser?.email}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedUser(null);
              }}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={loading.delete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {loading.delete ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPwModalOpen}
        onClose={() => {
          setResetPwModalOpen(false);
          setSelectedUser(null);
          setResetPwPassword('');
          setErrors((prev) => ({ ...prev, resetPw: {} }));
        }}
        title="Reset Password"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-white/60 text-sm">
            Set a new password for{' '}
            <span className="text-white font-medium">
              {selectedUser?.full_name ?? selectedUser?.email}
            </span>
            .
          </p>
          {errors.resetPw.form && <p className="text-red-400 text-sm">{errors.resetPw.form}</p>}
          <div>
            <label htmlFor="reset_password" className="block text-white/70 text-sm mb-1.5">
              New Password
            </label>
            <input
              id="reset_password"
              type="password"
              value={resetPwPassword}
              onChange={(e) => setResetPwPassword(e.target.value)}
              className={inputClass}
              placeholder="Min. 8 characters"
            />
            {errors.resetPw.password && (
              <p className="text-red-400 text-xs mt-1">{errors.resetPw.password}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setResetPwModalOpen(false);
                setSelectedUser(null);
                setResetPwPassword('');
                setErrors((prev) => ({ ...prev, resetPw: {} }));
              }}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading.resetPw}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {loading.resetPw ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminPageContent />
    </ProtectedRoute>
  );
}
