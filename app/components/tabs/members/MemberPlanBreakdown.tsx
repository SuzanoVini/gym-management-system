import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { summarizeMemberPlans } from '@/lib/members/memberRoster';

function PlanBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-gray-700 w-28 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-2.5 overflow-hidden">
        <div className="h-full bg-red-600 rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-500 w-16 text-right">
        {count} ({pct}%)
      </span>
    </div>
  );
}

function PlanSummarySection({ title, rows }: { title: string; rows: [string, number][] }) {
  if (rows.length === 0) {
    return null;
  }

  const sectionTotal = rows.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      {rows.map(([label, count]) => (
        <PlanBar key={label} label={label} count={count} total={sectionTotal} />
      ))}
    </div>
  );
}

export default function MemberPlanBreakdown({
  planCounts,
  planSummary,
  memberCount,
  showPlanDetails,
  setShowPlanDetails,
}: {
  planCounts: [string, number][];
  planSummary: ReturnType<typeof summarizeMemberPlans>;
  memberCount: number;
  showPlanDetails: boolean;
  setShowPlanDetails: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      {planCounts.length > 0 && (
        <div className="section-container">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Membership Plan Breakdown</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PlanSummarySection title="Program" rows={planSummary.program} />
            <PlanSummarySection title="Age" rows={planSummary.age} />
            <PlanSummarySection title="Duration" rows={planSummary.duration} />
            <PlanSummarySection title="Class Packs" rows={planSummary.classPacks} />
          </div>

          <div className="mt-5 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowPlanDetails((value) => !value)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
              aria-expanded={showPlanDetails}
            >
              {showPlanDetails ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Per-plan detail
            </button>
            {showPlanDetails && (
              <div className="space-y-2.5 mt-3">
                {planCounts.map(([plan, count]) => (
                  <PlanBar key={plan} label={plan} count={count} total={memberCount} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
