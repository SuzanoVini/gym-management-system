import { act, renderHook, waitFor } from '@testing-library/react';
import type { Intro } from '@/types';
import { useFollowUps } from '../useFollowUps';

jest.mock('@/lib/supabase/intros', () => ({
  fetchRecentIntros: jest.fn(),
}));

jest.mock('@/lib/errorHandler', () => ({
  errorHandler: { handle: jest.fn(), notify: jest.fn() },
}));

import { fetchRecentIntros } from '@/lib/supabase/intros';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

function intro(overrides: { [K in keyof Intro]?: Intro[K] | undefined }): Intro {
  return {
    id: 'x',
    name: 'Someone',
    email: null,
    attended: 'Yes',
    created_at: '2020-01-01T00:00:00Z',
    ...overrides,
  } as Intro;
}

const fixtures: Intro[] = [
  // tier 5: first follow-up not yet due
  intro({ id: 'future', name: 'Future Person', date: daysAhead(30) }),
  // tier 1: first follow-up overdue, older date sorts first within tier
  intro({ id: 'overdue-new', name: 'Overdue New', date: daysAgo(20) }),
  intro({ id: 'overdue-old', name: 'Overdue Old', date: daysAgo(40) }),
  // tier 3: second follow-up overdue
  intro({
    id: 'second-overdue',
    name: 'Second Overdue',
    date: daysAgo(60),
    followup_1_at: `${daysAgo(30)}T12:00:00Z`,
  }),
  // tier 4: second follow-up not yet due
  intro({
    id: 'second-pending',
    name: 'Second Pending',
    date: daysAgo(60),
    followup_1_at: `${daysAhead(10)}T12:00:00Z`,
  }),
  // excluded: not attended / signed up / second follow-up done
  intro({ id: 'no-attend', name: 'No Attend', attended: undefined, date: daysAgo(20) }),
  intro({ id: 'signed', name: 'Signed', signed_up: 'Yes', date: daysAgo(20) }),
  intro({ id: 'done', name: 'Done', followup_2_at: '2020-01-01', date: daysAgo(20) }),
  // excluded: another intro in the same person group is dismissed
  intro({ id: 'grp-a', name: 'Group Person', email: 'g@x.com', date: daysAgo(20) }),
  intro({
    id: 'grp-b',
    name: 'group person',
    email: 'G@x.com ',
    attended: undefined,
    followup_dismissed_at: '2020-01-01T00:00:00Z',
  }),
  // reminder inherited from the earliest reminder in the person group
  intro({ id: 'rem-a', name: 'Reminder Person', email: 'r@x.com', date: daysAgo(20) }),
  intro({
    id: 'rem-b',
    name: 'reminder person',
    email: 'R@X.com',
    attended: undefined,
    followup_reminder_at: `${daysAgo(3)}T12:00:00Z`,
  }),
  // no date: falls back to created_at
  intro({
    id: 'no-date',
    name: 'No Date',
    date: undefined,
    created_at: '2020-06-01T00:00:00Z',
    follow_up_notes: [{ note: 'Called about PRICING' }] as Intro['follow_up_notes'],
  }),
];

describe('useFollowUps rows (burndown characterization)', () => {
  beforeEach(() => {
    jest.mocked(fetchRecentIntros).mockResolvedValue(fixtures);
  });

  it('filters, tiers, and sorts rows', async () => {
    const { result } = renderHook(() => useFollowUps());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows.map((r) => [r.id, r.tier, r.hasActiveReminder])).toEqual([
      ['no-date', 1, false],
      ['overdue-old', 1, false],
      ['overdue-new', 1, false],
      ['rem-a', 1, true],
      ['second-overdue', 3, false],
      ['second-pending', 4, false],
      ['future', 5, false],
    ]);
    expect(result.current.overdueCount).toBe(5);
    expect(result.current.remindersDueCount).toBe(1);
  });

  it('filters by note query case-insensitively', async () => {
    const { result } = renderHook(() => useFollowUps());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setNoteQuery('pricing'));
    expect(result.current.rows.map((r) => r.id)).toEqual(['no-date']);
  });
});
