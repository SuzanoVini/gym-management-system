import { fireEvent, render, screen } from '@testing-library/react';
import type { Intro } from '@/types';
import SpamConfirmDialog from '../SpamConfirmDialog';
import SpamReviewPopover from '../SpamReviewPopover';

jest.mock('focus-trap-react', () => {
  const FocusTrap = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  FocusTrap.displayName = 'FocusTrap';
  return FocusTrap;
});

beforeEach(() => {
  const root = document.createElement('div');
  root.setAttribute('id', 'modal-root');
  document.body.appendChild(root);
});

afterEach(() => {
  document.getElementById('modal-root')?.remove();
});

const intro = {
  id: 'a1',
  name: 'Sample Person',
  month: 'Sep',
  class: 'GB1',
  staff: 'Staff Member 1',
  created_at: '',
  spam_signals: ['phone_foreign_format', 'name_single_word'],
} as Intro;

it('popover lists reasons in plain words and fires the actions', () => {
  const onNotSpam = jest.fn();
  const onMarkSpam = jest.fn();
  render(
    <SpamReviewPopover
      intro={intro}
      onClose={jest.fn()}
      onNotSpam={onNotSpam}
      onMarkSpam={onMarkSpam}
    />
  );
  expect(screen.getByText(/foreign format/i)).toBeInTheDocument();
  expect(screen.getByText(/single word/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /not spam/i }));
  expect(onNotSpam).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /mark as spam/i }));
  expect(onMarkSpam).toHaveBeenCalled();
});

it('confirm dialog shows loading, then the group count, and confirms while loading', () => {
  const onConfirm = jest.fn();
  const { rerender } = render(
    <SpamConfirmDialog
      mode="mark"
      name="Sample Person"
      count={null}
      busy={false}
      onConfirm={onConfirm}
      onCancel={jest.fn()}
    />
  );
  expect(screen.getByText(/checking matching bookings/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark as spam' }));
  expect(onConfirm).toHaveBeenCalled();
  rerender(
    <SpamConfirmDialog
      mode="mark"
      name="Sample Person"
      count={3}
      busy={false}
      onConfirm={onConfirm}
      onCancel={jest.fn()}
    />
  );
  expect(screen.getByText(/hides 3 bookings/i)).toBeInTheDocument();
});
