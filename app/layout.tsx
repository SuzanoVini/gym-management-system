import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './components/providers/AuthProvider';
import Portal from './components/ui/portal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GB Kitsilano - Gym Management',
  description: 'Comprehensive gym management system for GB Kitsilano',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
        <Portal />
      </body>
    </html>
  );
}
