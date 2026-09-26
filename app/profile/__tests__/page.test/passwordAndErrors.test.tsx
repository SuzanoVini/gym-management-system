import type { User } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  describe('password form', () => {
    it('should update password on form submission', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass123');
      await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass123');
      await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass123');

      const updateButton = screen.getByRole('button', { name: /update password/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'OldPass123',
        });
        expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
          password: 'NewPass123',
        });
      });
    });

    it('should show validation error for missing current password', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/^new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });

      const passwordForm = newPasswordInput.closest('form') as HTMLFormElement;
      fireEvent.submit(passwordForm);

      await waitFor(
        () => {
          expect(screen.getByText(/current password.+required/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should show validation error for password mismatch', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass123');
      await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass123');
      await userEvent.type(screen.getByLabelText(/confirm new password/i), 'DifferentPass123');

      const updateButton = screen.getByRole('button', { name: /update password/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should show password strength indicator', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText(/^new password/i);
      await userEvent.type(newPasswordInput, 'WeakPass123!');

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('should clear password fields after successful update', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });

      const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
      const newPasswordInput = screen.getByLabelText(/^new password/i) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText(
        /confirm new password/i
      ) as HTMLInputElement;

      await userEvent.type(currentPasswordInput, 'OldPass123');
      await userEvent.type(newPasswordInput, 'NewPass123');
      await userEvent.type(confirmPasswordInput, 'NewPass123');

      const updateButton = screen.getByRole('button', { name: /update password/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(currentPasswordInput.value).toBe('');
        expect(newPasswordInput.value).toBe('');
        expect(confirmPasswordInput.value).toBe('');
      });
    });
  });

  describe('error handling', () => {
    it('should handle profile load error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      setupSupabaseMocks(null, { message: 'Load failed', code: 'ERROR' });

      render(<ProfilePage />);

      await waitFor(
        () => {
          expect(consoleErrorSpy).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle profile update error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Mock upsert to fail
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
        upsert: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        }),
      });

      const saveButton = screen.getByRole('button', { name: /save profile/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle password update error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce({
        error: { message: 'Password update failed' },
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass123');
      await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass123');
      await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass123');

      const updateButton = screen.getByRole('button', { name: /update password/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
