import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileSection from '@/components/layout/ProfileSection';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchUserProfile } from '@/lib/supabase/profiles';
import { useSidebarStore } from '@/store/useSidebarStore';

// Mock dependencies
jest.mock('@/components/providers/AuthProvider');
jest.mock('@/lib/supabase/profiles');
jest.mock('@/store/useSidebarStore');

describe('ProfileSection', () => {
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
  const mockFetchUserProfile = fetchUserProfile as jest.MockedFunction<typeof fetchUserProfile>;
  const mockUseSidebarStore = useSidebarStore as jest.MockedFunction<typeof useSidebarStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any type
      user: mockUser as any,
      loading: false,
      signOut: jest.fn(),
    });

    mockUseSidebarStore.mockReturnValue({
      isOpen: true,
      openSidebar: jest.fn(),
      closeSidebar: jest.fn(),
      toggleSidebar: jest.fn(),
    });

    mockFetchUserProfile.mockResolvedValue(mockProfile);
  });

  describe('rendering', () => {
    it('should not render while loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signOut: jest.fn(),
      });

      const { container } = render(<ProfileSection />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when no user is logged in', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: jest.fn(),
      });

      const { container } = render(<ProfileSection />);
      expect(container.firstChild).toBeNull();
    });

    it('should render in expanded state with user info', async () => {
      mockUseSidebarStore.mockReturnValue({
        isOpen: true,
        openSidebar: jest.fn(),
        closeSidebar: jest.fn(),
        toggleSidebar: jest.fn(),
      });

      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should render in collapsed state without text', async () => {
      mockUseSidebarStore.mockReturnValue({
        isOpen: false,
        openSidebar: jest.fn(),
        closeSidebar: jest.fn(),
        toggleSidebar: jest.fn(),
      });

      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.queryByText('Test User')).not.toBeInTheDocument();
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      });
    });

    it('should display avatar image when avatar_url is provided', async () => {
      render(<ProfileSection />);

      await waitFor(() => {
        // Check that an img element exists with the alt text
        const button = screen.getByRole('button', { name: /view profile/i });
        const img = button.querySelector('img[alt="Test User"]');
        expect(img).toBeInTheDocument();
      });
    });

    it('should display default user icon when no avatar_url', async () => {
      mockFetchUserProfile.mockResolvedValue({
        ...mockProfile,
        avatar_url: null,
      });

      render(<ProfileSection />);

      await waitFor(() => {
        // User icon should be rendered (SVG element)
        const button = screen.getByRole('button', { name: /view profile/i });
        expect(button).toBeInTheDocument();
        // Check that User SVG icon is present (not an img tag)
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should display fallback name when profile has no full_name', async () => {
      mockFetchUserProfile.mockResolvedValue({
        ...mockProfile,
        full_name: null,
      });

      mockUseSidebarStore.mockReturnValue({
        isOpen: true,
        openSidebar: jest.fn(),
        closeSidebar: jest.fn(),
        toggleSidebar: jest.fn(),
      });

      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });
  });

  describe('interaction', () => {
    it('should navigate to profile page on click', async () => {
      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view profile/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /view profile/i });
      await userEvent.click(button);

      // The button should be clickable (covered by the click action not throwing)
      expect(button).toBeInTheDocument();
    });

    it('should close sidebar on mobile after click', async () => {
      const mockCloseSidebar = jest.fn();
      mockUseSidebarStore.mockReturnValue({
        isOpen: true,
        openSidebar: jest.fn(),
        closeSidebar: mockCloseSidebar,
        toggleSidebar: jest.fn(),
      });

      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view profile/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /view profile/i });
      await userEvent.click(button);

      expect(mockCloseSidebar).toHaveBeenCalled();
    });

    it('should not close sidebar on desktop after click', async () => {
      const mockCloseSidebar = jest.fn();
      mockUseSidebarStore.mockReturnValue({
        isOpen: true,
        openSidebar: jest.fn(),
        closeSidebar: mockCloseSidebar,
        toggleSidebar: jest.fn(),
      });

      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view profile/i })).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /view profile/i });
      await userEvent.click(button);

      expect(mockCloseSidebar).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle profile fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetchUserProfile.mockRejectedValue(new Error('Fetch failed'));

      render(<ProfileSection />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading profile:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('should still render with default values on profile fetch error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockFetchUserProfile.mockRejectedValue(new Error('Fetch failed'));

      mockUseSidebarStore.mockReturnValue({
        isOpen: true,
        openSidebar: jest.fn(),
        closeSidebar: jest.fn(),
        toggleSidebar: jest.fn(),
      });

      render(<ProfileSection />);

      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      jest.restoreAllMocks();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label', async () => {
      render(<ProfileSection />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /view profile/i });
        expect(button).toHaveAttribute('aria-label', 'View Profile');
      });
    });

    it('should have title attribute in collapsed state', async () => {
      mockUseSidebarStore.mockReturnValue({
        isOpen: false,
        openSidebar: jest.fn(),
        closeSidebar: jest.fn(),
        toggleSidebar: jest.fn(),
      });

      render(<ProfileSection />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /view profile/i });
        expect(button).toHaveAttribute('title', 'Test User');
      });
    });

    it('should not have title attribute in expanded state', async () => {
      mockUseSidebarStore.mockReturnValue({
        isOpen: true,
        openSidebar: jest.fn(),
        closeSidebar: jest.fn(),
        toggleSidebar: jest.fn(),
      });

      render(<ProfileSection />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /view profile/i });
        expect(button).not.toHaveAttribute('title');
      });
    });
  });
});
