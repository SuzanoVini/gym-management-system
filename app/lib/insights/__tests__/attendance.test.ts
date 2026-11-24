import type { Member } from '@/types';
import type { InsightRuleInput } from '../rules';
import { attendanceDropOff } from '../rules/attendance';

const NOW = new Date('2026-12-20T12:00:00Z');
const COVERED = '2026-11-19T02:31:54Z';

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: `m-${Math.random()}`,
    created_at: '2026-01-01',
    name: 'Alex Sample',
    status: 'Active',
    join_date: '10-Jul-2023',
    ...overrides,
  } as Member;
}

function input(overrides: Partial<InsightRuleInput> = {}): InsightRuleInput {
  return {
    intros: [],
    signups: [],
    cancellations: [],
    holds: [],
    now: NOW,
    revenuePerMember: 180,
    attendanceCoveredSince: COVERED,
    ...overrides,
  };
}

describe('attendanceDropOff', () => {
  it('flags active members whose last check-in is 21+ days old, and those never seen', () => {
    const insight = attendanceDropOff(
      input({
        members: [
          member({ name: 'Stale Sam', last_checkin_date: '2026-11-25' }),
          member({ name: 'Never Nia', last_checkin_date: null }),
          member({ name: 'Recent Rae', last_checkin_date: '2026-12-15' }),
        ],
      })
    );
    expect(insight?.title).toBe('2 Active Members Not Training');
    expect(insight?.message).toContain('Never Nia (no check-in since');
    expect(insight?.message).toContain('Stale Sam (last in');
    expect(insight?.message).not.toContain('Recent Rae');
  });

  it('stays hidden until the feed has 21 days of unbroken coverage', () => {
    const members = [member({ last_checkin_date: null })];
    expect(attendanceDropOff(input({ members, attendanceCoveredSince: '2026-12-10' }))).toBeNull();
    expect(attendanceDropOff(input({ members, attendanceCoveredSince: null }))).toBeNull();
    expect(attendanceDropOff(input({ members: undefined }))).toBeNull();
  });

  it('skips inactive and on-hold members, and gives new members 21 days from joining', () => {
    const insight = attendanceDropOff(
      input({
        members: [
          member({ status: 'Inactive' }),
          member({ status: 'On Hold' }),
          member({ join_date: '10-Dec-2026' }),
        ],
      })
    );
    expect(insight).toBeNull();
  });
});
