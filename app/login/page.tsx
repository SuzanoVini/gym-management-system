'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BrandLogo from '@/components/ui/BrandLogo';
import { brand } from '@/lib/brand';

function LoginHeader({ isResetMode }: { isResetMode: boolean }) {
  return (
    <div className="mb-8 text-center">
      <BrandLogo
        className="mx-auto block h-28 w-auto max-w-[160px] object-contain"
        width={160}
        height={112}
      />
      <h1 className="page-title mt-4">{isResetMode ? 'Reset your password' : 'Sign in'}</h1>
      <p className="page-subtitle">
        {isResetMode ? "We'll email you a link to set a new one." : `${brand.name} staff workspace`}
      </p>
    </div>
  );
}

function StatusMessages({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && (
        <div className="rounded-md bg-[var(--accent-50)] border border-[var(--accent-100)] p-4">
          <p className="text-sm text-red-800 font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800 font-medium">{success}</p>
        </div>
      )}
    </>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Reset link sent. Check your inbox.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--navy)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-[var(--surface)] rounded-[var(--radius-card)] p-8 border border-[var(--border)]">
          <LoginHeader isResetMode={isResetMode} />
          <form
            className="space-y-6"
            onSubmit={(e) => {
              void (isResetMode ? handlePasswordReset(e) : handleLogin(e));
            }}
          >
            <StatusMessages error={error} success={success} />
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="form-label">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {!isResetMode && (
                <div>
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {!isResetMode && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full text-base cursor-pointer"
              >
                {loading
                  ? isResetMode
                    ? 'Sending...'
                    : 'Signing in...'
                  : isResetMode
                    ? 'Send reset link'
                    : 'Sign in'}
              </button>
            </div>

            {isResetMode && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
