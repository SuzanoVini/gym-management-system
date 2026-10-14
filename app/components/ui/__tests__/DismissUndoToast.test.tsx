import { render, screen } from '@testing-library/react';
import DismissUndoToast from '../DismissUndoToast';

it('shows the default message', () => {
  render(<DismissUndoToast onUndo={jest.fn()} onExpire={jest.fn()} />);
  expect(screen.getByText('Follow-up dismissed')).toBeInTheDocument();
});

it('shows a custom message', () => {
  render(<DismissUndoToast message="Marked as spam" onUndo={jest.fn()} onExpire={jest.fn()} />);
  expect(screen.getByText('Marked as spam')).toBeInTheDocument();
});
