import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FollowUpModal from '@/components/tabs/modals/FollowUpModal';
import { createFollowUpNote } from '@/lib/supabase/intros';
import { resolveStaffName } from '@/lib/supabase/profiles';
import type { Intro } from '@/types';

jest.mock('@/lib/supabase/intros', () => ({
  createFollowUpNote: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/supabase/profiles', () => ({
  resolveStaffName: jest.fn(),
}));
jest.mock('@/lib/errorHandler', () => ({
  errorHandler: { notify: jest.fn(), handle: jest.fn() },
}));
jest.mock('@/components/ui/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

const mockCreateNote = createFollowUpNote as jest.Mock;
const mockResolveStaffName = resolveStaffName as jest.Mock;

const mockIntro: Intro = {
  id: 'intro-1',
  name: 'Jane Doe',
  month: 'May',
  class: 'BJJ',
  staff: 'Vini',
  created_at: '2026-05-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveStaffName.mockResolvedValue('Vinicius');
});

describe('FollowUpModal', () => {
  it('does not render a staff name input field', () => {
    render(<FollowUpModal isOpen intro={mockIntro} onClose={jest.fn()} />);
    expect(screen.queryByLabelText(/staff name/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter your name/i)).not.toBeInTheDocument();
  });

  it('submits with staff name resolved from auth profile', async () => {
    render(<FollowUpModal isOpen intro={mockIntro} onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/enter follow-up notes/i), 'Great call');
    await userEvent.click(screen.getByRole('button', { name: /add note/i }));
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({ staff_name: 'Vinicius', note: 'Great call' })
      );
    });
  });

  it('falls back to Unknown when staff name resolution is unavailable', async () => {
    mockResolveStaffName.mockResolvedValue('Unknown');
    render(<FollowUpModal isOpen intro={mockIntro} onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/enter follow-up notes/i), 'Test note');
    await userEvent.click(screen.getByRole('button', { name: /add note/i }));
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({ staff_name: 'Unknown' })
      );
    });
  });
});
