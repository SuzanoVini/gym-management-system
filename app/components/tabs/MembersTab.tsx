'use client';

import { format } from 'date-fns';
import { Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCancellations } from '@/hooks/useCancellations';
import { useHolds } from '@/hooks/useHolds';
import { useMembers } from '@/hooks/useMembers';
import { useSignups } from '@/hooks/useSignups';
import { toRosterStatus } from '@/lib/members/derivedStatus';
import {
  buildMemberRoster,
  type DisplayMember,
  summarizeMemberPlans,
} from '@/lib/members/memberRoster';
import MemberJourneyPanel from './members/MemberJourneyPanel';
import MemberPlanBreakdown from './members/MemberPlanBreakdown';
import MemberRosterTable from './members/MemberRosterTable';
import MemberSummaryCards from './members/MemberSummaryCards';

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

  const derivedMembers = useMemo(
    () => buildMemberRoster({ members, signups, cancellations, holds, now }),
    [cancellations, holds, members, now, signups]
  );

  const activeMembers = useMemo(
    () => derivedMembers.filter((member) => member.derivedStatus === 'Active'),
    [derivedMembers]
  );

  const nonAlumniMembers = useMemo(
    () => derivedMembers.filter((member) => toRosterStatus(member.derivedStatus) !== 'Alumni'),
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

  const planSummary = useMemo(() => summarizeMemberPlans(nonAlumniMembers), [nonAlumniMembers]);

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
      const matchesStatus =
        statusFilter === 'all' || toRosterStatus(member.derivedStatus) === statusFilter;
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

      <MemberSummaryCards
        activeCount={activeMembers.length}
        netGrowth={netGrowth}
        onHoldCount={onHoldCount}
        retentionRate={retentionRate}
      />
      <MemberPlanBreakdown
        planCounts={planCounts}
        planSummary={planSummary}
        memberCount={nonAlumniMembers.length}
        showPlanDetails={showPlanDetails}
        setShowPlanDetails={setShowPlanDetails}
      />

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

      <MemberRosterTable
        filteredCount={filtered.length}
        paginated={paginated}
        setSelectedMember={setSelectedMember}
      />

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
          <MemberJourneyPanel member={selectedMember} onClose={() => setSelectedMember(null)} />,
          document.body
        )}
    </div>
  );
}
