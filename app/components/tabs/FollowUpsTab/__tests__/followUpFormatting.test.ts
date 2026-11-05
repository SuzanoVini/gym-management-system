import { formatDate } from '../followUpFormatting';

describe('formatDate', () => {
  it('shows a bare intro date on its own day, not the day before', () => {
    expect(formatDate('2026-10-27')).toBe('Oct 27');
  });
});
