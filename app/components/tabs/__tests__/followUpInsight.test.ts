import type { FollowUpRow } from '@/hooks/useFollowUps';
import { buildFollowUpInsight } from '../InsightsTab';

function row(partial: Partial<FollowUpRow>): FollowUpRow {
  return {
    staff: 'Staff Member 3',
    tier: 1,
    firstDueDate: new Date(),
    secondDueDate: null,
    ...partial,
  } as FollowUpRow;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

describe('buildFollowUpInsight', () => {
  it('returns null when nothing is due', () => {
    expect(buildFollowUpInsight({ rows: [], overdueCount: 0, remindersDueCount: 0 })).toBeNull();
  });

  it('returns a medium reminder card when only reminders are due', () => {
    const insight = buildFollowUpInsight({ rows: [], overdueCount: 0, remindersDueCount: 2 });
    expect(insight?.priority).toBe('medium');
    expect(insight?.title).toContain('2 Follow-Up Reminders Due');
  });

  it('splits overdue counts by tier with staff breakdown', () => {
    const rows = [
      row({ tier: 1, firstDueDate: daysAgo(1) }),
      row({ tier: 1, firstDueDate: daysAgo(1), staff: '' }),
      row({ tier: 3, secondDueDate: daysAgo(2) }),
      row({ tier: 5 }),
    ];
    const insight = buildFollowUpInsight({ rows, overdueCount: 3, remindersDueCount: 0 });
    expect(insight?.title).toBe('3 Follow-Ups Overdue');
    expect(insight?.message).toContain('2 never contacted (overdue)');
    expect(insight?.message).toContain('1 awaiting 2nd contact (overdue)');
    expect(insight?.message).toContain("2 from Staff Member 3's classes");
    expect(insight?.message).toContain("1 from Unassigned's classes");
    expect(insight?.priority).toBe('high');
  });

  it('escalates to critical when a lead is more than 5 business days overdue', () => {
    const rows = [row({ tier: 1, firstDueDate: daysAgo(15) })];
    const insight = buildFollowUpInsight({ rows, overdueCount: 1, remindersDueCount: 0 });
    expect(insight?.priority).toBe('critical');
  });
});
