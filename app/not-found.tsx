import Link from 'next/link';
import { brand } from '@/lib/brand';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--ground)] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="page-title">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--gb-dark-gray)]">
          This address isn't part of {brand.name}. It may have moved, or the link was mistyped.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Go to Overview
        </Link>
      </div>
    </main>
  );
}
