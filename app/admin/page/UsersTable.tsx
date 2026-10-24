'use client';

import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { RoleSelect } from './RoleControls';
import type { UserRole } from './roles';
import type { AdminUser } from './types';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface UserRowProps {
  user: AdminUser;
  isCurrentUser: boolean;
  roleSaving: boolean;
  onRoleChange: (user: AdminUser, role: UserRole) => void;
  onResetPassword: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

function UserRow({
  user: u,
  isCurrentUser,
  roleSaving,
  onRoleChange,
  onResetPassword,
  onDelete,
}: UserRowProps) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-semibold text-xs flex items-center justify-center uppercase flex-shrink-0">
            {(u.full_name ?? u.email ?? '?')[0]}
          </div>
          <span className="font-medium text-gray-900">{u.full_name ?? '—'}</span>
          {isCurrentUser && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 ml-1">
              You
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-gray-500 text-sm">{u.email}</td>
      <td
        className="px-6 py-4"
        title={isCurrentUser ? "You can't change your own role" : undefined}
      >
        <RoleSelect
          role={u.role}
          label={`Role for ${u.full_name ?? u.email}`}
          disabled={isCurrentUser || roleSaving}
          onChange={(role) => onRoleChange(u, role)}
        />
      </td>
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
            onClick={() => onResetPassword(u)}
            className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            aria-label={`Reset password for ${u.full_name ?? u.email}`}
            title="Reset password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          {!isCurrentUser && (
            <button
              type="button"
              onClick={() => onDelete(u)}
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
  );
}

interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  currentUserId: string | undefined;
  roleSaving: boolean;
  onAdd: () => void;
  onRoleChange: (user: AdminUser, role: UserRole) => void;
  onResetPassword: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export function UsersTable({
  users,
  loading,
  currentUserId,
  roleSaving,
  onAdd,
  onRoleChange,
  onResetPassword,
  onDelete,
}: UsersTableProps) {
  return (
    <div className="section-container !p-0 overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Accounts</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </p>
        </div>
        <button type="button" onClick={onAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Table area */}
      {loading ? (
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
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Role</th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">
                  Created
                </th>
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">
                  Last Sign-in
                </th>
                <th className="px-6 py-3 text-xs text-gray-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isCurrentUser={currentUserId === u.id}
                  roleSaving={roleSaving}
                  onRoleChange={onRoleChange}
                  onResetPassword={onResetPassword}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
