import type { InsightRule } from '../rules';

function cancellationReasonAdvice(reasonLower: string): { advice: string; actions: string[] } {
  if (reasonLower.includes('time') || reasonLower.includes('schedule')) {
    return {
      advice: 'Schedule conflicts are fixable - offer more class times or online options.',
      actions: [
        'Survey cancelled members about preferred class times',
        'Consider adding early morning (6AM) or late evening (8PM) classes',
        'Test virtual/online class options',
        'Offer flexible scheduling for busy members',
      ],
    };
  }
  if (
    reasonLower.includes('financial') ||
    reasonLower.includes('money') ||
    reasonLower.includes('expensive')
  ) {
    return {
      advice: 'Price sensitivity - create more accessible options.',
      actions: [
        'Introduce budget-friendly membership tier',
        'Offer payment plans (bi-weekly instead of monthly)',
        'Create student/family discounts',
        'Emphasize value in member communications',
      ],
    };
  }
  if (reasonLower.includes('injury') || reasonLower.includes('medical')) {
    return {
      advice: 'Medical holds should be offered, not cancellations.',
      actions: [
        'Create injury hold program (reduced rate during recovery)',
        'Offer modified training during recovery',
        'Partner with physical therapist for rehab programs',
        'Emphasize injury prevention in classes',
      ],
    };
  }
  if (reasonLower.includes('moving') || reasonLower.includes('relocation')) {
    return {
      advice: 'Moving members may return — keep the relationship warm.',
      actions: [
        'Offer a farewell freeze instead of cancellation',
        'Ask for a referral to friends/family staying in the area',
        'Send a "welcome back" offer if they return to the city',
        'Connect them with a partner gym in their new location',
      ],
    };
  }
  return { advice: 'Pattern detected - needs investigation.', actions: [] };
}

export const topCancellationReason: InsightRule = ({ cancellations, revenuePerMember }) => {
  const reasonCounts = cancellations.reduce<Record<string, number>>((acc, cancel) => {
    if (cancel.reason) {
      acc[cancel.reason] = (acc[cancel.reason] || 0) + 1;
    }
    return acc;
  }, {});

  const top = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 5) {
    return null;
  }

  const [reason, count] = top;
  const reasonLower = reason.toLowerCase();
  const { advice, actions } = cancellationReasonAdvice(reasonLower);
  const specificActions =
    actions.length > 0
      ? actions
      : [
          `Schedule exit interviews to understand "${reason}" better`,
          'Track this reason monthly to spot trends',
          'Create retention offer for this specific reason',
          'Review what competitors offer for similar situations',
        ];

  return {
    id: 'top-cancellation-reason',
    title: `Top Cancellation Reason: "${reason}" (${count} cancellations)`,
    message: `${count} members cancelled due to "${reason}".\n\n${advice}\n\nThis is a fixable pattern that's costing you members.`,
    icon: 'UserMinus',
    color: 'orange',
    priority: 'high',
    impact: `Reducing this by 50% = ${Math.round(count / 2)} retained members = $${(Math.round(count / 2) * revenuePerMember).toLocaleString()}/month`,
    actions: specificActions,
    category: 'retention',
  };
};
