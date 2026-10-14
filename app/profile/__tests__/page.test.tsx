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
      fireEvent.change(nameInput, { target: { value: '' } });

      const profileForm = nameInput.closest('form') as HTMLFormElement;
      fireEvent.submit(profileForm);

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
});
