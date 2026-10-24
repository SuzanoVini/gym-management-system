import { Edit2, FileText, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import OverflowMenu from '@/components/ui/OverflowMenu';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { formatDate } from '@/lib/supabase/utils';
import type { Cancellation, Intro, Member } from '@/types';

interface Props {
  cancellations: Cancellation[];
  members: Member[];
  intros: Intro[];
  loading: boolean;
  selectedIds: Set<string>;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  paginated: Cancellation[];
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  clearSelection: (tab: 'cancellations') => void;
  toggleSelection: (tab: 'cancellations', id: string) => void;
  selectAll: (tab: 'cancellations', ids: string[]) => void;
  clearSelectionIds: (tab: 'cancellations', ids?: string[]) => void;
  onDeleteSelected: () => void;
  onViewNote: Dispatch<SetStateAction<string | null>>;
  onEdit: (cancellation: Cancellation) => void;
  onDelete: (id: string, name: string) => void | Promise<void>;
}

function monthsBetween(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function abbreviatedName(full: string): string {
  const parts = full.trim().split(' ');
  return parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
}

function getIntroLabel(date?: string): string | null {
  if (!date) {
    return null;
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  return `${parsedDate.toLocaleString('default', { month: 'short' })} ${parsedDate.getFullYear()}`;
}

function CancellationBadges({
  durationMonths,
  introLabel,
}: {
  durationMonths: number;
  introLabel: string | null;
}) {
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {durationMonths > 0 && (
        <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
          Member {durationMonths} month{durationMonths === 1 ? '' : 's'}
        </span>
      )}
      {introLabel && (
        <span className="inline-block bg-[var(--raised)] text-[var(--gb-dark-gray)] text-xs px-2 py-0.5 rounded-full">
          From intro {introLabel}
        </span>
      )}
    </div>
  );
}

function CancellationName({
  cancellation,
  members,
  intros,
}: Pick<Props, 'members' | 'intros'> & { cancellation: Cancellation }) {
  const full = cancellation.name || '';
  const display = abbreviatedName(full);
  const member = members.find((m) => m.name.toLowerCase().trim() === full.toLowerCase().trim());
  const intro = intros.find((i) => i.name.toLowerCase().trim() === full.toLowerCase().trim());
  const durationMonths =
    member?.join_date && cancellation.date ? monthsBetween(member.join_date, cancellation.date) : 0;
  const introLabel = getIntroLabel(intro?.date);
  const name =
    display !== full ? (
      <Tooltip content={full}>
        <div className="font-medium text-gray-900 cursor-default">{display}</div>
      </Tooltip>
    ) : (
      <div className="font-medium text-gray-900">{full}</div>
    );

  return (
    <div>
      {name}
      {cancellation.source === 'cron' && (
        <CancellationBadges durationMonths={durationMonths} introLabel={introLabel} />
      )}
    </div>
  );
}

function CancellationActions({
  cancellation,
  onViewNote,
  onEdit,
  onDelete,
}: Pick<Props, 'onViewNote' | 'onEdit' | 'onDelete'> & { cancellation: Cancellation }) {
  return (
    <OverflowMenu
      items={[
        ...(cancellation.notes
          ? [
              {
                label: 'Notes',
                icon: FileText,
                onClick: () => onViewNote(cancellation.notes ?? ''),
              },
            ]
          : []),
        { label: 'Edit', icon: Edit2, onClick: () => onEdit(cancellation) },
        {
          label: 'Delete',
          icon: Trash2,
          variant: 'danger',
          onClick: () => {
            void onDelete(cancellation.id, cancellation.name);
          },
        },
      ]}
    />
  );
}

export default function CancellationsTable(props: Props) {
  const columns = [
    {
      key: 'month' as keyof Cancellation,
      label: 'Month',
      render: (value: unknown) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Cancellation,
      label: 'Name',
      render: (_value: unknown, item: Cancellation) => (
        <CancellationName cancellation={item} members={props.members} intros={props.intros} />
      ),
    },
    {
      key: 'date' as keyof Cancellation,
      label: 'Date',
      render: (value: unknown) => <div>{formatDate(value as string)}</div>,
    },
    {
      key: 'reason' as keyof Cancellation,
      label: 'Reason',
      render: (value: unknown) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'age_group' as keyof Cancellation,
      label: 'Age Group',
      render: (value: unknown) => <div className="text-sm">{(value as string) || '-'}</div>,
    },
    {
      key: 'year' as keyof Cancellation,
      label: 'Year',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Cancellation,
      label: '',
      render: (_value: unknown, item: Cancellation) => (
        <CancellationActions
          cancellation={item}
          onViewNote={props.onViewNote}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      ),
    },
  ];

  return (
    <>
      <PaginationBar
        id="cancellations-items-per-page"
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        itemsPerPage={props.itemsPerPage}
        totalItems={props.totalItems}
        startIndex={props.startIndex}
        endIndex={props.endIndex}
        onPageChange={props.setCurrentPage}
        onItemsPerPageChange={props.setItemsPerPage}
        selectedCount={props.selectedIds.size}
        onClearSelection={() => props.clearSelection('cancellations')}
      />
      <div className="bg-white rounded-[var(--radius-card)] border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">All Cancellations ({props.totalItems})</h2>
          {props.selectedIds.size > 0 && (
            <button
              type="button"
              onClick={props.onDeleteSelected}
              className="btn btn-primary text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({props.selectedIds.size})</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table
            data={props.paginated}
            columns={columns}
            loading={props.loading}
            selectedIds={props.selectedIds}
            onSelectId={(id) => props.toggleSelection('cancellations', id)}
            onSelectAll={(ids) => props.selectAll('cancellations', ids)}
            onClearSelection={(ids) => props.clearSelectionIds('cancellations', ids)}
            emptyMessage="No cancellations found matching your criteria"
          />
        </div>
      </div>
    </>
  );
}
