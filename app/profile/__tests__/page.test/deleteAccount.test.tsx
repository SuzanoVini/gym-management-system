import type { User } from '@supabase/supabase-js';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/components/providers/AuthProvider';
import ProfilePage from '@/profile/page';

// Mock dependencies
jest.mock('focus-trap-react', () => {
  const FocusTrap = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  FocusTrap.displayName = 'FocusTrap';
  return FocusTrap;
});
jest.mock('@/components/providers/AuthProvider');
jest.mock('@/components/providers/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('next/navigation');

// Create a mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
  auth: {
    signInWithPassword: jest.fn(),
    updateUser: jest.fn(),
  },
};

// Mock the Supabase module
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient,
}));

describe('ProfilePage', () => {
  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  };

  const mockProfile = {
    id: mockUser.id,
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  // Helper to setup Supabase mocks
  const setupSupabaseMocks = (
    profileData: typeof mockProfile | null = mockProfile,
    profileError: { message: string; code: string } | null = null
  ) => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: profileData,
      error: profileError,
    });

    const mockEq = jest.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      upsert: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockSupabaseClient.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/new-avatar.jpg' },
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabaseClient.auth.updateUser.mockResolvedValue({ error: null });
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isOwner: false,
      loading: false,
      signOut: jest.fn(),
    });

    // Mock window.alert for tests
    window.alert = jest.fn();

    // Create modal-root div for Modal component
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);

    // Default successful profile load
    setupSupabaseMocks();
  });

  afterEach(() => {
    // Clean up modal-root
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      document.body.removeChild(modalRoot);
    }
  });

  describe('delete account flow', () => {
    it('should open first confirmation modal on delete button click', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(
        () => {
          expect(
            screen.getByText(/are you sure you want to delete your account/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should close first modal on cancel', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0];
      if (cancelButton) {
        await user.click(cancelButton);
      }

      await waitFor(
        () => {
          expect(
            screen.queryByText(/are you sure you want to delete your account/i)
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should show second confirmation modal on continue', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(
        () => {
          expect(screen.getByPlaceholderText(/type delete to confirm/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should enable delete button only when DELETE is typed', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      });

      // Open first modal
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      // Continue to second modal
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(
        () => {
          expect(screen.getByPlaceholderText(/type delete to confirm/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const confirmInput = screen.getByPlaceholderText(/type delete to confirm/i);
      const finalDeleteButton = screen.getByRole('button', { name: /delete my account/i });

      // Button should be disabled initially
      expect(finalDeleteButton).toBeDisabled();

      // Type incorrect text
      await user.type(confirmInput, 'delete');
      expect(finalDeleteButton).toBeDisabled();

      // Clear and type correct text
      await user.clear(confirmInput);
      await user.type(confirmInput, 'DELETE');
      expect(finalDeleteButton).not.toBeDisabled();
    });

    it('should call delete API on final confirmation', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      });

      // Open first modal
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      // Continue to second modal
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Type DELETE and confirm
      await waitFor(
        () => {
          expect(screen.getByPlaceholderText(/type delete to confirm/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const confirmInput = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(confirmInput, 'DELETE');

      const finalDeleteButton = screen.getByRole('button', { name: /delete my account/i });
      await user.click(finalDeleteButton);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith('/api/profile/delete', {
            method: 'DELETE',
          });
        },
        { timeout: 3000 }
      );
    });
  });
});
