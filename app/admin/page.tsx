'use client';

import { KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import Modal from '@/components/ui/Modal';
import { useSidebarStore } from '@/store/useSidebarStore';

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

  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddForm({ email: '', full_name: '', password: '' });
    setErrors((prev) => ({ ...prev, add: {} }));
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const closeResetPwModal = () => {
    setResetPwModalOpen(false);
    setSelectedUser(null);
    setResetPwPassword('');
    setErrors((prev) => ({ ...prev, resetPw: {} }));
  };

  return (
    <>
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8 px-4 sm:px-6 lg:px-8">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-slate-500">{users.length} staff account(s)</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Success banner */}
        {successMessage && (
          <div className="animate-fadeIn px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {/* Main table card */}
        <div className="section-container !p-0 overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Staff Accounts</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrors((prev) => ({ ...prev, add: {} }));
                setAddModalOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {/* Table area */}
          {loading.initial ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-3 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-medium">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-medium">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-medium hidden sm:table-cell">
                      Created
                    </th>
                    <th className="text-left px-6 py-3 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-medium hidden md:table-cell">
                      Last Sign-in
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-semibold text-xs flex items-center justify-center uppercase flex-shrink-0">
                            {(u.full_name ?? u.email ?? '?')[0]}
                          </div>
                          <span className="font-medium text-gray-900">{u.full_name ?? '—'}</span>
                          {currentUser?.id === u.id && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 ml-1">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{u.email}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm hidden sm:table-cell">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm hidden md:table-cell">
                        {u.last_sign_in_at ? (
                          formatDate(u.last_sign_in_at)
                        ) : (
                          <span className="italic text-gray-300">Never</span>
                        )}
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
                            className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
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
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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
      <Modal isOpen={addModalOpen} onClose={closeAddModal} title="Add Staff Account" size="sm">
        <form onSubmit={handleAddUser} className="space-y-4">
          {errors.add.form && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.add.form}
            </p>
          )}
          <div>
            <label htmlFor="add_full_name" className="form-label">
              Full Name
            </label>
            <input
              id="add_full_name"
              type="text"
              value={addForm.full_name}
              onChange={(e) => setAddForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className="form-input"
              placeholder="Jane Doe"
            />
            {errors.add.full_name && (
              <p className="mt-1 text-xs text-red-600">{errors.add.full_name}</p>
            )}
          </div>
          <div>
            <label htmlFor="add_email" className="form-label">
              Email Address
            </label>
            <input
              id="add_email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
              className="form-input"
              placeholder="name@example.com"
            />
            {errors.add.email && <p className="mt-1 text-xs text-red-600">{errors.add.email}</p>}
          </div>
          <div>
            <label htmlFor="add_password" className="form-label">
              Password
            </label>
            <input
              id="add_password"
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
              className="form-input"
              placeholder="Min. 8 characters"
            />
            {errors.add.password && (
              <p className="mt-1 text-xs text-red-600">{errors.add.password}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-tertiary flex-1" onClick={closeAddModal}>
              Cancel
            </button>
            <button type="submit" disabled={loading.add} className="btn btn-primary flex-1">
              {loading.add ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={closeDeleteModal} title="Delete Account" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {selectedUser?.full_name ?? selectedUser?.email}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-tertiary flex-1" onClick={closeDeleteModal}>
              Cancel
            </button>
            <button
              type="button"
              disabled={loading.delete}
              onClick={handleDeleteUser}
              className="btn flex-1 bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
            >
              {loading.delete ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={resetPwModalOpen} onClose={closeResetPwModal} title="Reset Password" size="sm">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-600">
            Set a new password for{' '}
            <span className="font-semibold text-gray-900">
              {selectedUser?.full_name ?? selectedUser?.email}
            </span>
            .
          </p>
          {errors.resetPw.form && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.resetPw.form}
            </p>
          )}
          <div>
            <label htmlFor="reset_password" className="form-label">
              New Password
            </label>
            <input
              id="reset_password"
              type="password"
              value={resetPwPassword}
              onChange={(e) => setResetPwPassword(e.target.value)}
              className="form-input"
              placeholder="Min. 8 characters"
            />
            {errors.resetPw.password && (
              <p className="mt-1 text-xs text-red-600">{errors.resetPw.password}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-tertiary flex-1" onClick={closeResetPwModal}>
              Cancel
            </button>
            <button type="submit" disabled={loading.resetPw} className="btn btn-primary flex-1">
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
    </>
  );
}

export default function AdminPage() {
  const { isOpen } = useSidebarStore();
  const router = useRouter();
  return (
    <ProtectedRoute>
      <div className="app-shell" data-sidebar={isOpen ? 'expanded' : 'collapsed'}>
        <Header onLogoClick={() => router.push('/')} />
        <Sidebar activeTab="admin" setActiveTab={(tab) => router.push(`/?tab=${tab}`)} />
        <div className="app-main">
          <main className="py-6 sm:py-8">
            <div className="animate-fadeIn">
              <AdminPageContent />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
