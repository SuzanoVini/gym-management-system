'use client';

import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { RoleSelect } from './RoleControls';
import { ROLE_INFO } from './roles';
import type { AdminUser } from './types';
import type { useAddUserModal, useDeleteUserModal, useResetPasswordModal } from './useAdminUsers';

interface AddUserModalProps {
  modal: ReturnType<typeof useAddUserModal>;
  loading: boolean;
}

export function AddUserModal({ modal, loading }: AddUserModalProps) {
  const { form, setForm, errors } = modal;
  return (
    <Modal isOpen={modal.isOpen} onClose={modal.close} title="Add Account" size="sm">
      <form
        onSubmit={(e) => {
          void modal.handleSubmit(e);
        }}
        className="space-y-4"
      >
        {errors.form && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.form}
          </p>
        )}
        <div>
          <label htmlFor="add_full_name" className="form-label">
            Full Name
          </label>
          <input
            id="add_full_name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
            className="form-input"
            placeholder="Jane Doe"
          />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
        </div>
        <div>
          <label htmlFor="add_email" className="form-label">
            Email Address
          </label>
          <input
            id="add_email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="form-input"
            placeholder="name@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="add_password" className="form-label">
            Password
          </label>
          <input
            id="add_password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="form-input"
            placeholder="Min. 8 characters"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        <div>
          <span className="form-label">Role</span>
          <div className="flex items-center gap-3">
            <RoleSelect
              role={form.role}
              label="Role for the new account"
              onChange={(role) => setForm((prev) => ({ ...prev, role }))}
            />
            <span className="text-xs text-gray-500">{ROLE_INFO[form.role].summary}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn btn-tertiary flex-1" onClick={modal.close}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? (
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
  );
}

interface DeleteUserModalProps {
  modal: ReturnType<typeof useDeleteUserModal>;
  selectedUser: AdminUser | null;
  loading: boolean;
}

export function DeleteUserModal({ modal, selectedUser, loading }: DeleteUserModalProps) {
  return (
    <Modal isOpen={modal.isOpen} onClose={modal.close} title="Delete Account" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">
            {selectedUser?.full_name ?? selectedUser?.email}
          </span>
          ? This cannot be undone.
        </p>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn btn-tertiary flex-1" onClick={modal.close}>
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void modal.handleDelete();
            }}
            className="btn flex-1 bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
          >
            {loading ? (
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
  );
}

interface ResetPasswordModalProps {
  modal: ReturnType<typeof useResetPasswordModal>;
  selectedUser: AdminUser | null;
  loading: boolean;
}

export function ResetPasswordModal({ modal, selectedUser, loading }: ResetPasswordModalProps) {
  const { errors } = modal;
  return (
    <Modal isOpen={modal.isOpen} onClose={modal.close} title="Reset Password" size="sm">
      <form
        onSubmit={(e) => {
          void modal.handleSubmit(e);
        }}
        className="space-y-4"
      >
        <p className="text-sm text-gray-600">
          Set a new password for{' '}
          <span className="font-semibold text-gray-900">
            {selectedUser?.full_name ?? selectedUser?.email}
          </span>
          .
        </p>
        {errors.form && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.form}
          </p>
        )}
        <div>
          <label htmlFor="reset_password" className="form-label">
            New Password
          </label>
          <input
            id="reset_password"
            type="password"
            value={modal.password}
            onChange={(e) => modal.setPassword(e.target.value)}
            className="form-input"
            placeholder="Min. 8 characters"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn btn-tertiary flex-1" onClick={modal.close}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? (
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
  );
}
