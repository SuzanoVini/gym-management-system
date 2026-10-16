'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Staff are sent back to the dashboard; RLS still guards the data itself.
  ownerOnly?: boolean;
}

export default function ProtectedRoute({ children, ownerOnly = false }: ProtectedRouteProps) {
  const { user, isOwner, loading } = useAuth();
  const router = useRouter();
  const blocked = ownerOnly && !isOwner;

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.push('/login');
    } else if (blocked) {
      router.replace('/');
    }
  }, [user, loading, blocked, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!user || blocked) {
    return null;
  }

  return <>{children}</>;
}
