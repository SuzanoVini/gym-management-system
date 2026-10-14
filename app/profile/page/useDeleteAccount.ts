import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';

export function useDeleteAccount(user: User | null) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      errorHandler.notify('Account deleted successfully', 'success');

      router.push('/login');
    } catch (err) {
      errorHandler.handle(err, 'deleteAccount');
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteModalOpen(true);
  };

  const confirmFirstStep = () => {
    setDeleteModalOpen(false);
    setConfirmDeleteModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmDeleteModalOpen(false);
    setDeleteConfirmText('');
  };

  return {
    deleting,
    deleteModalOpen,
    setDeleteModalOpen,
    confirmDeleteModalOpen,
    deleteConfirmText,
    setDeleteConfirmText,
    handleDeleteAccount,
    openDeleteModal,
    confirmFirstStep,
    closeConfirmModal,
  };
}

export type DeleteAccountState = ReturnType<typeof useDeleteAccount>;
