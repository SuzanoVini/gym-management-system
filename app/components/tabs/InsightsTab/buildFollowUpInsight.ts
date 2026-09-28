import type { FollowUpRow } from '@/hooks/useFollowUps';
import { addBusinessDays } from '@/lib/utils/businessDays';
import type { Insight } from '@/types';

export interface FollowUpsSummary {
  rows: FollowUpRow[];
  overdueCount: number;
  remindersDueCount: number;
}

// One source of truth for follow-up urgency: the same useFollowUps rows that
// drive the Follow Ups tab and sidebar badge, so this card disappears exactly
// when follow-up is up to date.
export function buildFollowUpInsight(followUps: FollowUpsSummary): Insight | null {
  if (followUps.overdueCount === 0 && followUps.remindersDueCount === 0) {
    return null;
  }

  if (followUps.overdueCount === 0) {
    return {
      id: 'follow-ups-due',
      title: `${followUps.remindersDueCount} Follow-Up Reminder${followUps.remindersDueCount === 1 ? '' : 's'} Due`,
      message: `${followUps.remindersDueCount} follow-up reminder${followUps.remindersDueCount === 1 ? ' is' : 's are'} due. Handle these while the lead is still warm.`,
      icon: 'Clock',
      color: 'orange',
      priority: 'medium',
      impact: 'Improves intro-to-signup follow-through',
      actions: [
        'Open the Follow Ups tab',
        'Contact due leads first',
        'Log each contact attempt',
        'Set reminders for anyone who needs more time',
      ],
      category: 'operational',
    };
  }

  const overdue = followUps.rows.filter((r) => r.tier === 1 || r.tier === 3);
  const neverContacted = overdue.filter((r) => r.tier === 1).length;
  const awaitingSecond = overdue.length - neverContacted;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const severelyOverdue = overdue.some((r) => {
    const due = r.tier === 1 ? r.firstDueDate : r.secondDueDate;
    return due !== null && addBusinessDays(due, 5) < today;
  });

  const byStaff = overdue.reduce<Record<string, number>>((acc, r) => {
    const staff = r.staff || 'Unassigned';
    acc[staff] = (acc[staff] || 0) + 1;
    return acc;
  }, {});
  const staffBreakdown = Object.entries(byStaff)
    .sort((a, b) => b[1] - a[1])
    .map(([staff, count]) => `• ${count} from ${staff}'s classes`)
    .join('\n');

  const splitParts = [
    neverContacted > 0 ? `${neverContacted} never contacted (overdue)` : null,
    awaitingSecond > 0 ? `${awaitingSecond} awaiting 2nd contact (overdue)` : null,
  ].filter(Boolean);

  return {
    id: 'follow-ups-due',
    title: `${overdue.length} Follow-Up${overdue.length === 1 ? '' : 's'} Overdue`,
    message: `${splitParts.join(' · ')}\n\n${staffBreakdown}\n\nThese are active leads that need contact before they go cold.`,
    icon: 'AlertCircle',
    color: 'red',
    priority: severelyOverdue ? 'critical' : 'high',
    impact: 'Improves intro-to-signup follow-through',
    actions: [
      'Open the Follow Ups tab',
      'Contact overdue leads first',
      'Log each contact attempt',
      'Set reminders for anyone who needs more time',
    ],
    category: 'operational',
  };
}

export function withFollowUpInsight(
  followUps: FollowUpsSummary,
  baseInsights: Insight[]
): Insight[] {
  const followUpInsight = buildFollowUpInsight(followUps);
  return followUpInsight ? [followUpInsight, ...baseInsights] : baseInsights;
}
