import type { User } from '@supabase/supabase-js';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@/components/providers/AuthProvider';
import ProtectedRoute from '@/components/providers/ProtectedRoute';

jest.mock('@/components/providers/AuthProvider');
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace }) }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const signedIn = (isOwner: boolean) =>
  mockUseAuth.mockReturnValue({
    user: { id: 'u1' } as User,
    isOwner,
    loading: false,
    signOut: jest.fn(),
  });

describe('ProtectedRoute ownerOnly', () => {
  beforeEach(() => replace.mockClear());

  it('sends staff back to the dashboard without rendering the page', () => {
    signedIn(false);
    render(<ProtectedRoute ownerOnly>payroll</ProtectedRoute>);
    expect(screen.queryByText('payroll')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('renders the page for owners', () => {
    signedIn(true);
    render(<ProtectedRoute ownerOnly>payroll</ProtectedRoute>);
    expect(screen.getByText('payroll')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
