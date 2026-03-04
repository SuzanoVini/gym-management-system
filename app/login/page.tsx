'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      setSuccess('Password reset email sent! Check your inbox.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Modern glassmorphism card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-lg p-8 border border-slate-200/50">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl inline-block mb-4 shadow-soft">
              <Image
                src="/brand/gb-logo-title.png"
                alt="GB Kitsilano"
                className="mx-auto h-28 w-auto max-w-[160px] object-contain"
                width={160}
                height={112}
                priority
              />
            </div>
            <p className="mt-4 text-center text-sm text-slate-600 font-medium">
              {isResetMode ? 'Reset Your Password' : 'Gym Management System'}
            </p>
          </div>
          <form className="space-y-6" onSubmit={isResetMode ? handlePasswordReset : handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 animate-slideUp">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 animate-slideUp">
                <p className="text-sm text-green-800 font-medium">{success}</p>
              </div>
            )}
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
                    ? 'Send Reset Link'
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
                  Back to Sign In
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
