import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/components/providers/AuthProvider';
import ProfilePage from '@/profile/page';

// Mock dependencies
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
    updateUser: jest.fn(),
  },
};

// Mock the Supabase module
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient,
}));

describe('ProfilePage', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any type
      user: mockUser as any,
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

  describe('rendering', () => {
    it('should show loading spinner initially', () => {
      // Mock unresolved promise for loading state
      const mockSingle = jest.fn().mockImplementation(
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Empty promise is intentional for loading state test
        () => new Promise(() => {})
      );

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      render(<ProfilePage />);

      // Look for the loading spinner element
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should render profile form after loading', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });
    });

    it('should render password change section', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument();
      });
    });

    it('should render danger zone section', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      });
    });

    it('should display user email as read-only', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue('test@example.com');
        expect(emailInput).toBeDisabled();
        expect(screen.getByText('Email cannot be changed')).toBeInTheDocument();
      });
    });
  });

  describe('profile form', () => {
    it('should update profile on form submission', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/full name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save profile/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
      });
    });

    it('should show validation error for empty name', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/full name/i);
      await userEvent.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save profile/i });
      await userEvent.click(saveButton);

      await waitFor(
        () => {
          expect(screen.getByText(/name.+required/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should handle file selection for avatar', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const uploadButton = screen.getByLabelText(/upload avatar/i);
      const fileInput = uploadButton.parentElement?.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        await userEvent.upload(fileInput, file);
        expect(fileInput.files?.[0]).toBe(file);
      }
    });

    it('should show error for invalid file type', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const uploadButton = screen.getByLabelText(/upload avatar/i);
      const fileInput = uploadButton.parentElement?.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);

        await waitFor(() => {
          expect(screen.getByText(/please select a valid image file/i)).toBeInTheDocument();
        });
      }
    });

    it('should show error for file too large', async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });

      // Create a file larger than 2MB
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const uploadButton = screen.getByLabelText(/upload avatar/i);
      const fileInput = uploadButton.parentElement?.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [largeFile],
          writable: false,
        });

        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);

        await waitFor(() => {
          expect(screen.getByText(/file size must be less than 2mb/i)).toBeInTheDocument();
        });
      }
    });
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

      await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass123');
      await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass123');

      const updateButton = screen.getByRole('button', { name: /update password/i });
      await userEvent.click(updateButton);

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
          expect(screen.getByText(/type delete to confirm/i)).toBeInTheDocument();
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
        json: async () => ({ success: true }),
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
