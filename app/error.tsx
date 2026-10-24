'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { reportConsoleError } from '@/lib/logger';

// Route-level error screen. The details go to the console for whoever is debugging; staff see a
// plain sentence and two ways forward.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportConsoleError(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--ground)] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="page-title">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--gb-dark-gray)]">
          This screen couldn't load. Your data is safe; try again, and if it keeps happening, note
          what you clicked and send it to the owner.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Go to Overview
          </Link>
        </div>
      </div>
    </main>
  );
}
