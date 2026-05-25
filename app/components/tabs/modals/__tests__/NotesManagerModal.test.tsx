import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesManagerModal from '@/components/tabs/modals/NotesManagerModal';
import {
  createFollowUpNote,
  deleteFollowUpNote,
  fetchFollowUpNotes,
  updateFollowUpNote,
} from '@/lib/supabase/intros';
import { resolveStaffName } from '@/lib/supabase/profiles';
import type { FollowUpNote, Intro } from '@/types';

jest.mock('@/lib/supabase/intros', () => ({
  fetchFollowUpNotes: jest.fn(),
  createFollowUpNote: jest.fn().mockResolvedValue({}),
  updateFollowUpNote: jest.fn().mockResolvedValue({}),
  deleteFollowUpNote: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/supabase/profiles', () => ({
  resolveStaffName: jest.fn(),
}));
jest.mock('@/components/ui/Modal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    children,
    title,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    ) : null,
}));

const mockFetchNotes = fetchFollowUpNotes as jest.Mock;
const mockCreateNote = createFollowUpNote as jest.Mock;
const mockUpdateNote = updateFollowUpNote as jest.Mock;
const mockDeleteNote = deleteFollowUpNote as jest.Mock;
const mockResolveStaffName = resolveStaffName as jest.Mock;

const mockIntro: Intro = {
  id: 'intro-1',
  name: 'Jane Doe',
  month: 'May',
  class: 'BJJ',
  staff: 'Vini',
  created_at: '2026-05-01T00:00:00Z',
};

const mockNote: FollowUpNote = {
  id: 'note-1',
  intro_id: 'intro-1',
  note: 'Called, left voicemail',
  staff_name: 'Vinicius',
  created_at: '2026-05-25T10:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveStaffName.mockResolvedValue('Vinicius');
  mockFetchNotes.mockResolvedValue([]);
});

describe('NotesManagerModal', () => {
  it('renders nothing when intro is null', () => {
    const { container } = render(
      <NotesManagerModal isOpen={true} onClose={jest.fn()} intro={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <NotesManagerModal isOpen={false} onClose={jest.fn()} intro={mockIntro} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows modal title with intro name', async () => {
    render(<NotesManagerModal isOpen={true} onClose={jest.fn()} intro={mockIntro} />);
    await waitFor(() => {
      expect(screen.getByText('Notes - Jane Doe')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notes', async () => {
    mockFetchNotes.mockResolvedValue([]);
    render(<NotesManagerModal isOpen={true} onClose={jest.fn()} intro={mockIntro} />);
    await waitFor(() => {
      expect(screen.getByText('No notes yet.')).toBeInTheDocument();
    });
  });

  it('shows notes with text and attribution', async () => {
    mockFetchNotes.mockResolvedValue([mockNote]);
    render(<NotesManagerModal isOpen={true} onClose={jest.fn()} intro={mockIntro} />);
    await waitFor(() => {
      expect(screen.getByText('Called, left voicemail')).toBeInTheDocument();
      expect(screen.getByText(/Vinicius/)).toBeInTheDocument();
    });
  });

  it('can add a note and refreshes the list', async () => {
    mockFetchNotes.mockResolvedValueOnce([]).mockResolvedValueOnce([mockNote]);
    render(<NotesManagerModal isOpen={true} onClose={jest.fn()} intro={mockIntro} />);
    await waitFor(() => screen.getByText('No notes yet.'));
    await userEvent.type(screen.getByPlaceholderText('Add a note...'), 'Called, left voicemail');
    await userEvent.click(screen.getByRole('button', { name: /add note/i }));
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({ note: 'Called, left voicemail', staff_name: 'Vinicius' })
      );
      expect(screen.getByText('Called, left voicemail')).toBeInTheDocument();
    });
  });

  it('can edit a note inline', async () => {
    mockFetchNotes
      .mockResolvedValueOnce([mockNote])
      .mockResolvedValueOnce([{ ...mockNote, note: 'Updated note text' }]);
    render(<NotesManagerModal isOpen={true} onClose={jest.fn()} intro={mockIntro} />);
    await waitFor(() => screen.getByText('Called, left voicemail'));
    await userEvent.click(screen.getByRole('button', { name: /edit note/i }));
    const editArea = screen.getByDisplayValue('Called, left voicemail');
    await userEvent.clear(editArea);
    await userEvent.type(editArea, 'Updated note text');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith('note-1', 'Updated note text');
      expect(screen.getByText('Updated note text')).toBeInTheDocument();
    });
  });

  it('can delete a note after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockFetchNotes.mockResolvedValueOnce([mockNote]).mockResolvedValueOnce([]);
    render(<NotesManagerModal isOpen={true} onClose={jest.fn()} intro={mockIntro} />);
    await waitFor(() => screen.getByText('Called, left voicemail'));
    await userEvent.click(screen.getByRole('button', { name: /delete note/i }));
    await waitFor(() => {
      expect(mockDeleteNote).toHaveBeenCalledWith('note-1');
      expect(screen.getByText('No notes yet.')).toBeInTheDocument();
    });
  });

  it('calls onChanged after note operations', async () => {
    const onChanged = jest.fn();
    mockFetchNotes.mockResolvedValue([]);
    render(
      <NotesManagerModal
        isOpen={true}
        onClose={jest.fn()}
        intro={mockIntro}
        onChanged={onChanged}
      />
    );
    await waitFor(() => screen.getByText('No notes yet.'));
    await userEvent.type(screen.getByPlaceholderText('Add a note...'), 'Test');
    await userEvent.click(screen.getByRole('button', { name: /add note/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});
