'use client';

import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import { useSidebarStore } from '@/store/useSidebarStore';
import { AddUserModal, DeleteUserModal, ResetPasswordModal } from './page/AdminUserModals';
import { RolePermissionsCard } from './page/RoleControls';
import { UsersTable } from './page/UsersTable';
import {
  useAddUserModal,
  useAdminUsers,
  useDeleteUserModal,
  useResetPasswordModal,
  useRoleChange,
} from './page/useAdminUsers';

function AdminPageContent() {
  const { user: currentUser } = useAuth();
  const state = useAdminUsers();
  const addModal = useAddUserModal(state);
  const deleteModal = useDeleteUserModal(state);
  const resetPwModal = useResetPasswordModal(state);
  const roleChange = useRoleChange(state);
  const { users, loading, selectedUser, successMessage } = state;

  return (
    <>
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8 px-4 sm:px-6 lg:px-8">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-slate-500">
            {users.length} {users.length === 1 ? 'account' : 'accounts'} · roles control who can
            open Payroll and this page
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Success banner */}
        {successMessage && (
          <div className="animate-fadeIn px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {roleChange.error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {roleChange.error}
          </div>
        )}

        {/* Main table card */}
        <UsersTable
          users={users}
          loading={loading.initial}
          currentUserId={currentUser?.id}
          roleSaving={loading.role}
          onAdd={addModal.open}
          onRoleChange={(user, role) => {
            void roleChange.changeRole(user, role);
          }}
          onResetPassword={resetPwModal.open}
          onDelete={deleteModal.open}
        />

        <RolePermissionsCard />
      </div>

      {/* Add User Modal */}
      <AddUserModal modal={addModal} loading={loading.add} />

      {/* Delete Confirmation Modal */}
      <DeleteUserModal modal={deleteModal} selectedUser={selectedUser} loading={loading.delete} />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        modal={resetPwModal}
        selectedUser={selectedUser}
        loading={loading.resetPw}
      />
    </>
  );
}

export default function AdminPage() {
  const { isOpen } = useSidebarStore();
  const router = useRouter();
  return (
    <ProtectedRoute ownerOnly>
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
