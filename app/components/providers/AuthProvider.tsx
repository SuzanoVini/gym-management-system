'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { isSessionExpired } from '@/lib/auth/session';

// How often an open tab re-checks its own session age.
const SESSION_CHECK_INTERVAL_MS = 60_000;

interface AuthContextType {
  user: User | null;
  isOwner: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
      setIsOwner(data?.role === 'owner');
    } catch {
      setIsOwner(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-once subscription effect; fetchRole only closes over stable client state
  useEffect(() => {
    // Signing out is enough to bounce the user: ProtectedRoute redirects to /login
    // once `user` goes null, so the redirect lives in one place.
    const signOutIfExpired = async (): Promise<boolean> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && isSessionExpired(session.user?.last_sign_in_at)) {
        await supabase.auth.signOut();
        return true;
      }
      return false;
    };

    const getSession = async () => {
      try {
        if (await signOutIfExpired()) {
          setUser(null);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await fetchRole(sessionUser.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const expiryTimer = setInterval(() => {
      signOutIfExpired().catch((error) => console.error('Session expiry check failed:', error));
    }, SESSION_CHECK_INTERVAL_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        fetchRole(sessionUser.id);
      } else {
        setIsOwner(false);
      }
    });

    return () => {
      clearInterval(expiryTimer);
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isOwner, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
