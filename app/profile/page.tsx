'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/providers/ProtectedRoute';
import { DangerZone, DeleteAccountModals } from './page/DeleteAccountSection';
import PasswordSection from './page/PasswordSection';
import ProfileInfoSection from './page/ProfileInfoSection';
import { useDeleteAccount } from './page/useDeleteAccount';
import { usePasswordForm } from './page/usePasswordForm';
import { useProfileForm } from './page/useProfileForm';

export default function ProfilePage() {
  const { user } = useAuth();
  const profileForm = useProfileForm(user);
  const passwordForm = usePasswordForm(user);
  const deleteAccount = useDeleteAccount(user);

  if (profileForm.initialLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--ground)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>

          <h1 className="page-title mb-8">Profile Settings</h1>

          {/* Profile Information Section */}
          <ProfileInfoSection form={profileForm} email={user?.email} />

          {/* Password Change Section */}
          <PasswordSection form={passwordForm} />

          {/* Danger Zone Section */}
          <DangerZone onDelete={deleteAccount.openDeleteModal} />
        </div>
      </div>

      <DeleteAccountModals state={deleteAccount} />
    </ProtectedRoute>
  );
}
