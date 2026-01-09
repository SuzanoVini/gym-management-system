'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Clean card container matching good example */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-2xl">GB</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">GB Kitsilano</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {isResetMode ? 'Reset Your Password' : 'Gym Management System'}
            </p>
          </div>
        <form className="space-y-6" onSubmit={isResetMode ? handlePasswordReset : handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {!isResetMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
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
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
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
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
