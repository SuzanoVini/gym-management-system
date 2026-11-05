import type { InsightRule } from '../rules';

function cancellationReasonAdvice(reasonLower: string): { advice: string; actions: string[] } {
  if (reasonLower.includes('time') || reasonLower.includes('schedule')) {
    return {
      advice:
        'Plans are a monthly class limit with no fixed days, so busy weeks can often be worked around.',
      actions: [
        'Remind them there is nothing to book and no fixed days',
        'Talk priorities, then show the class times that could work',
        'Offer a smaller plan, a class pack or a hold before they cancel',
      ],
    };
  }
  if (
    reasonLower.includes('financial') ||
    reasonLower.includes('money') ||
    reasonLower.includes('expensive')
  ) {
    return {
      advice: 'Price sensitivity. Go back to why they started before talking numbers.',
      actions: [
        'Ask about their original reason for training, then break the cost down per class',
        'Check whether a family, student or military discount applies',
        'Offer the entry-level plan or a class pack',
      ],
    };
  }
  if (reasonLower.includes('injury') || reasonLower.includes('medical')) {
    return {
      advice:
        "A medical hold should come before a cancellation. With a doctor's note, hold fees are waived.",
      actions: [
        "Offer a medical hold, and ask for a doctor's note",
        'Keep in touch during recovery and invite them back when cleared',
        'Review warm-ups, pairing and sparring intensity for injury risk',
      ],
    };
  }
  if (reasonLower.includes('moving') || reasonLower.includes('relocation')) {
    return {
      advice: 'Moving is rarely something the gym can change. Leave a good last impression.',
      actions: [
        'Thank them and tell them they are welcome back any time',
        'Ask whether anyone they know nearby would like to try a class',
      ],
    };
  }
  return { advice: 'Pattern detected, needs investigation.', actions: [] };
}

export const topCancellationReason: InsightRule = ({ cancellations, revenuePerMember }) => {
  // Grouped case-insensitively, the same as the Overview reasons chart
  const reasons = new Map<string, { label: string; count: number }>();
  for (const { reason } of cancellations) {
    const label = reason?.trim();
    if (label) {
      const key = label.toLowerCase();
      const existing = reasons.get(key);
      reasons.set(key, { label: existing?.label ?? label, count: (existing?.count ?? 0) + 1 });
    }
  }

  const top = [...reasons.values()].sort((a, b) => b.count - a.count)[0];
  if (!top || top.count < 5) {
    return null;
  }

  const { label: reason, count } = top;
  const reasonLower = reason.toLowerCase();
  const { advice, actions } = cancellationReasonAdvice(reasonLower);
  const specificActions =
    actions.length > 0
      ? actions
      : [
          `Call members who left for "${reason}" and ask what would have changed it`,
          'Track this reason monthly to spot trends',
        ];

  return {
    // One id per reason: dismissing one reason must not hide a different one later
    id: `top-cancellation-reason-${reasonLower.replace(/[^a-z0-9]+/g, '-')}`,
    title: `Top Cancellation Reason: "${reason}" (${count} cancellations)`,
    message: `${count} members cancelled due to "${reason}".\n\n${advice}`,
    icon: 'UserMinus',
    color: 'orange',
    priority: 'high',
    impact: `Each member kept is about $${revenuePerMember.toLocaleString()}/month`,
    standard: 'Sales: objections and cancellation call',
    actions: specificActions,
    category: 'retention',
  };
};
