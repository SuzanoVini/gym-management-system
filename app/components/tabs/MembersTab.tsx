'use client';

import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCancellations } from '@/hooks/useCancellations';
import { useHolds } from '@/hooks/useHolds';
import { useMembers } from '@/hooks/useMembers';
import { useSignups } from '@/hooks/useSignups';
import { supabase } from '@/lib/supabase/client';
import { isActiveHold } from '@/lib/utils/holds';
import { escapeIlike } from '@/lib/utils/normalizePersonKey';
import type { Cancellation, Hold, Intro, Member, Signup } from '@/types';

interface JourneyEvent {
  date: string;
  label: string;
  sublabel?: string | undefined;
  color: string;
}

const MONTHS_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const ITEMS_PER_PAGE = 50;
type DerivedMemberStatus = 'Active' | 'On Hold' | 'Alumni';
type DisplayMember = Member & { derivedStatus: DerivedMemberStatus };

function nameKey(row: { name: string; name_normalized?: string | null }) {
  return (row.name_normalized ?? row.name).toLowerCase().trim();
}

function parseLifecycleDate(primary?: string | null, fallback?: string | null): number | null {
  const primaryTime = primary ? new Date(primary).getTime() : Number.NaN;
  if (!Number.isNaN(primaryTime)) {
    return primaryTime;
  }
  const fallbackTime = fallback ? new Date(fallback).getTime() : Number.NaN;
  return Number.isNaN(fallbackTime) ? null : fallbackTime;
}

function fallbackStatus(status?: Member['status']): DerivedMemberStatus {
  if (status === 'Active' || status === 'On Hold') {
    return status;
  }
  return 'Alumni';
}

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Timeline combines four record types into one ordered journey.
function buildJourneyEvents(
  intros: Intro[],
  signups: Signup[],
  holds: Hold[],
  cancellations: Cancellation[]
): JourneyEvent[] {
  const nextEvents: JourneyEvent[] = [];

  for (const row of intros) {
    if (row.date) {
      nextEvents.push({
        date: row.date,
        label: 'Intro class',
        sublabel: row.class || undefined,
        color: 'bg-red-600',
      });
    }
  }

  for (const row of signups) {
    if (row.membership_date) {
      nextEvents.push({
        date: row.membership_date,
        label: `Signed up - ${row.membership}`,
        color: 'bg-green-600',
      });
    }
  }

  for (const row of holds) {
    if (row.start) {
      nextEvents.push({
        date: row.start,
        label: 'Membership hold',
        sublabel: row.end ? `Until ${row.end}` : 'Open-ended',
        color: 'bg-orange-500',
      });
    }
  }

  for (const row of cancellations) {
    if (row.date) {
      nextEvents.push({
        date: row.date,
        label: 'Cancelled',
        sublabel: row.reason || undefined,
        color: 'bg-gray-700',
      });
    }
  }

  return nextEvents.sort((a, b) => a.date.localeCompare(b.date));
}

function JourneyPanel({ member, onClose }: { member: DisplayMember; onClose: () => void }) {
  const [events, setEvents] = useState<JourneyEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = (member.name_normalized ?? member.name).toLowerCase().trim();
    const escapedName = escapeIlike(member.name);

    Promise.all([
      supabase.from('intros').select('*').ilike('name', escapedName),
      supabase.from('signups').select('*').ilike('name', escapedName),
      supabase.from('holds').select('*').eq('name_normalized', key),
      supabase.from('cancellations').select('*').eq('name_normalized', key),
    ]).then(([intros, signups, holds, cancellations]) => {
      if (!cancelled) {
        setEvents(
          buildJourneyEvents(
            (intros.data ?? []) as Intro[],
            (signups.data ?? []) as Signup[],
            (holds.data ?? []) as Hold[],
            (cancellations.data ?? []) as Cancellation[]
          )
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [member.name, member.name_normalized]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-journey-title"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 id="member-journey-title" className="font-semibold text-gray-900">
              {member.name}
            </h2>
            <p className="text-xs text-gray-500">
              {member.membership_type || 'No plan'} - {member.derivedStatus}
              {member.join_date ? ` - Since ${member.join_date}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          {events === null ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">No records found for this member.</p>
          ) : (
            <div className="border-l-2 border-gray-200 pl-4 space-y-4">
              {events.map((event) => (
                <div key={`${event.date}-${event.label}`} className="relative">
                  <div
                    className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${event.color} border-2 border-white`}
                  />
                  <p className="text-[10px] text-gray-400">{event.date}</p>
                  <p className="text-sm font-medium text-gray-800">{event.label}</p>
                  {event.sublabel && <p className="text-xs text-gray-500">{event.sublabel}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MembersTab() {
  const { members, lastSyncAt, loading, error, refresh } = useMembers();
  const { signups } = useSignups();
  const { cancellations } = useCancellations();
  const { holds } = useHolds();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<DisplayMember | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  const [now] = useState(() => new Date());
  const currentMonthAbbr = MONTHS_ABBR[now.getMonth()];
  const currentYear = now.getFullYear();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Derives member lifecycle state across signups, cancellations, and holds in one memoized pass.
  const derivedMembers = useMemo<DisplayMember[]>(() => {
    const latestSignupByName = new Map<string, number>();
    const latestCancellationByName = new Map<string, number>();
    const activeHoldKeys = new Set<string>();

    for (const signup of signups) {
      const effectiveDate = parseLifecycleDate(signup.membership_date, signup.created_at);
      if (effectiveDate === null) {
        continue;
      }
      const key = nameKey(signup);
      const current = latestSignupByName.get(key);
      if (current === undefined || effectiveDate > current) {
        latestSignupByName.set(key, effectiveDate);
      }
    }

    for (const cancellation of cancellations) {
      const effectiveDate = parseLifecycleDate(cancellation.date, cancellation.created_at);
      if (effectiveDate === null) {
        continue;
      }
      const key = nameKey(cancellation);
      const current = latestCancellationByName.get(key);
      if (current === undefined || effectiveDate > current) {
        latestCancellationByName.set(key, effectiveDate);
      }
    }

    for (const hold of holds) {
      if (isActiveHold(hold, now)) {
        activeHoldKeys.add(nameKey(hold));
      }
    }

    return members.map((member) => {
      const key = nameKey(member);
      const latestSignup = latestSignupByName.get(key);
      const latestCancellation = latestCancellationByName.get(key);

      let derivedStatus: DerivedMemberStatus;
      if (
        latestCancellation !== undefined &&
        (latestSignup === undefined || latestCancellation > latestSignup)
      ) {
        derivedStatus = 'Alumni';
      } else if (activeHoldKeys.has(key)) {
        derivedStatus = 'On Hold';
      } else if (latestSignup !== undefined) {
        derivedStatus = 'Active';
      } else {
        derivedStatus = fallbackStatus(member.status);
      }

      return { ...member, derivedStatus };
    });
  }, [cancellations, holds, members, now, signups]);

  const activeMembers = useMemo(
    () => derivedMembers.filter((member) => member.derivedStatus === 'Active'),
    [derivedMembers]
  );

  const nonAlumniMembers = useMemo(
    () => derivedMembers.filter((member) => member.derivedStatus !== 'Alumni'),
    [derivedMembers]
  );

  const signupsThisMonth = signups.filter(
    (signup) => signup.month === currentMonthAbbr && signup.year === currentYear
  ).length;

  const cancellationsThisMonth = cancellations.filter(
    (cancellation) => cancellation.month === currentMonthAbbr && cancellation.year === currentYear
  ).length;

  const onHoldCount = derivedMembers.filter((member) => member.derivedStatus === 'On Hold').length;

  const retentionRate =
    activeMembers.length > 0
      ? Math.max(0, 1 - cancellationsThisMonth / activeMembers.length) * 100
      : 0;

  const planCounts = useMemo(() => {
    const counts = nonAlumniMembers.reduce<Record<string, number>>((acc, member) => {
      const plan = member.membership_type || 'Unknown';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [nonAlumniMembers]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Classifies active membership plan strings into independent summary groups.
  const planSummary = useMemo(() => {
    const program = { Legacy: 0, Integrity: 0, Special: 0 };
    const age = { Adults: 0, Kids: 0 };
    const duration = { Annual: 0, 'Semi-Annual': 0 };
    const classPacks = { 'Flex 10': 0, 'Flex 20': 0 };

    for (const member of nonAlumniMembers) {
      const plan = member.membership_type?.toLowerCase() ?? '';
      if (plan.includes('legacy')) {
        program.Legacy++;
      }
      if (plan.includes('integrity')) {
        program.Integrity++;
      }
      if (plan.includes('special')) {
        program.Special++;
      }
      if (plan.includes('adult')) {
        age.Adults++;
      }
      if (plan.includes('kids') || plan.includes('youth')) {
        age.Kids++;
      }
      if (plan.includes('semi-annual') || plan.includes('semi annual')) {
        duration['Semi-Annual']++;
      } else if (plan.includes('annual')) {
        duration.Annual++;
      }
      if (plan.includes('flex 10')) {
        classPacks['Flex 10']++;
      }
      if (plan.includes('flex 20')) {
        classPacks['Flex 20']++;
      }
    }

    const nonZeroEntries = (counts: Record<string, number>) =>
      Object.entries(counts).filter(([, count]) => count > 0) as [string, number][];

    return {
      program: nonZeroEntries(program),
      age: nonZeroEntries(age),
      duration: nonZeroEntries(duration),
      classPacks: nonZeroEntries(classPacks),
    };
  }, [nonAlumniMembers]);

  const plans = useMemo(
    () =>
      Array.from(
        new Set(derivedMembers.map((member) => member.membership_type).filter(Boolean))
      ).sort(),
    [derivedMembers]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return derivedMembers.filter((member) => {
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query);
      const matchesPlan = planFilter === 'all' || member.membership_type === planFilter;
      const matchesStatus = statusFilter === 'all' || member.derivedStatus === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [derivedMembers, planFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch('/api/members/import', { method: 'POST', body });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'CSV sync failed');
      }

      setUploadResult(`Synced ${json.upserted} members, ${json.markedInactive} marked inactive`);
      await refresh();
    } catch (err) {
      setUploadResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500 text-sm">Loading members...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button type="button" onClick={refresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const netGrowth = signupsThisMonth - cancellationsThisMonth;
  const lastSyncLabel = lastSyncAt
    ? `${format(new Date(lastSyncAt), 'MMM d, yyyy')} - ${members.length} members`
    : 'Never synced';

  return (
    <div className="space-y-6">
      <div className="section-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Members</h2>
            <p className="text-xs text-gray-500 mt-1">Last synced: {lastSyncLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {uploadResult && <span className="text-xs text-gray-600">{uploadResult}</span>}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-primary"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Syncing...' : 'Sync from CSV'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="section-container border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Active Members</div>
          <div className="text-3xl font-bold mt-1 text-red-600">{activeMembers.length}</div>
        </div>
        <div className="section-container border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Net This Month</div>
          <div className="text-3xl font-bold mt-1 text-green-600">
            {netGrowth >= 0 ? `+${netGrowth}` : netGrowth}
          </div>
        </div>
        <div className="section-container border-l-4 border-orange-600">
          <div className="text-sm text-gray-600">On Hold</div>
          <div className="text-3xl font-bold mt-1 text-orange-600">{onHoldCount}</div>
        </div>
        <div className="section-container border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Retention Rate</div>
          <div className="text-3xl font-bold mt-1 text-blue-600">{retentionRate.toFixed(1)}%</div>
        </div>
      </div>

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
                  <PlanBar key={plan} label={plan} count={count} total={nonAlumniMembers.length} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            className="form-input"
          />
          <select
            value={planFilter}
            onChange={(event) => {
              setPlanFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
          >
            <option value="all">All Plans</option>
            {plans.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Alumni">Alumni</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Roster ({filtered.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member Since
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    No members match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.membership_type || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.join_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                          member.derivedStatus === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : member.derivedStatus === 'On Hold'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {member.derivedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedMember(member)}
                        className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filtered.length} members</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedMember &&
        createPortal(
          <JourneyPanel member={selectedMember} onClose={() => setSelectedMember(null)} />,
          document.body
        )}
    </div>
  );
}
