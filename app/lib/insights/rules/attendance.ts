import { buildMemberRoster } from '@/lib/members/memberRoster';
import { parseRecordDate } from '@/lib/utils/recordDate';
import type { InsightRule } from '../rules';

export const ATTENDANCE_GAP_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

const shortDate = (date: Date) =>
  date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

/**
 * Active members who haven't checked in for 21+ days: the leading churn signal.
 * Absence is only trusted inside the window where the attendance webhook has been
 * delivering without a break (attendanceCoveredSince), so a dead feed hides this
 * card instead of flagging everyone.
 */
export const attendanceDropOff: InsightRule = ({
  members,
  attendanceCoveredSince,
  signups,
  cancellations,
  holds,
  now,
}) => {
  const coveredSince = parseRecordDate(attendanceCoveredSince);
  if (!members?.length || !coveredSince) {
    return null;
  }
  const cutoff = now.getTime() - ATTENDANCE_GAP_DAYS * DAY_MS;
  if (coveredSince.getTime() > cutoff) {
    return null;
  }

  const absent = buildMemberRoster({ members, signups, cancellations, holds, now })
    .filter((member) => member.derivedStatus === 'Active')
    .map((member) => {
      const lastSeen = parseRecordDate(member.last_checkin_date);
      const joined = parseRecordDate(member.join_date);
      // Absent since the later of: last check-in, joining, or the start of coverage.
      const since = Math.max(
        lastSeen?.getTime() ?? 0,
        joined?.getTime() ?? 0,
        coveredSince.getTime()
      );
      return { name: member.name, lastSeen, since };
    })
    .filter((member) => member.since <= cutoff)
    .sort((a, b) => a.since - b.since);

  if (absent.length === 0) {
    return null;
  }

  const names = absent
    .slice(0, 8)
    .map(
      (m) =>
        `• ${m.name} (${m.lastSeen ? `last in ${shortDate(m.lastSeen)}` : `no check-in since ${shortDate(coveredSince)}`})`
    )
    .join('\n');
  const more = absent.length > 8 ? `\n…and ${absent.length - 8} more` : '';
  const count = absent.length;

  return {
    id: 'attendance-drop-off',
    title: `${count} Active Member${count === 1 ? '' : 's'} Not Training`,
    message: `${count} active member${count === 1 ? ' has' : 's have'} not checked in for ${ATTENDANCE_GAP_DAYS}+ days:\n\n${names}${more}\n\nMembers stop coming before they cancel, so this is the earliest point to reach out.`,
    icon: 'UserMinus',
    color: 'orange',
    priority: 'high',
    impact: 'Check-ins are matched to the roster by email or phone plus first name',
    standard: 'Zen Planner attendance',
    actions: [
      'Message each person: ask how they are, not why they stopped',
      'Offer a hold if travel, injury or schedule is the reason',
      'Confirm in Zen Planner before reaching out, in case their contact details differ',
    ],
    category: 'retention',
  };
};
