import { render, screen } from '@testing-library/react';
import type { Intro } from '@/types';
import SpamStrip from '../SpamStrip';

const spam = [
  { id: 'a1', name: 'Sample Spammer', email: 's1@example.com', phone: '03001112222' },
  { id: 'b2', name: 'Other Sample', email: 's2@example.com', phone: null },
] as Intro[];

it('renders nothing when the search is empty', () => {
  const { container } = render(<SpamStrip spamIntros={spam} searchTerm="" onRestore={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

it('renders nothing when spam is not loaded yet', () => {
  const { container } = render(
    <SpamStrip spamIntros={null} searchTerm="sample" onRestore={jest.fn()} />
  );
  expect(container).toBeEmptyDOMElement();
});

it('shows only matching spam rows with a Spam tag and count', () => {
  render(<SpamStrip spamIntros={spam} searchTerm="spamer" onRestore={jest.fn()} />);
  expect(screen.getByText('Marked as spam (1)')).toBeInTheDocument();
  expect(screen.getByText('Sample Spammer')).toBeInTheDocument();
  expect(screen.queryByText('Other Sample')).not.toBeInTheDocument();
  expect(screen.getByText('Spam')).toBeInTheDocument();
});
