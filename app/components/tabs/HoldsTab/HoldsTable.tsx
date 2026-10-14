import { Edit2, Trash2 } from 'lucide-react';
import OverflowMenu from '@/components/ui/OverflowMenu';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { formatDate } from '@/lib/supabase/utils';
import type { Hold } from '@/types';
import { getHoldStatus } from './hold-data';

interface HoldsTableProps {
  holds: Hold[];
  loading: boolean;
  selectedIds: Set<string>;
  onSelectId: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: (ids: string[]) => void;
  onEdit: (hold: Hold) => void;
  onDelete: (hold: Hold) => void;
}

export default function HoldsTable({
  holds,
  loading,
  selectedIds,
  onSelectId,
  onSelectAll,
  onClearSelection,
  onEdit,
  onDelete,
}: HoldsTableProps) {
  const columns = [
    {
      key: 'month' as keyof Hold,
      label: 'Month',
      render: (value: unknown) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Hold,
      label: 'Name',
      render: (value: unknown) => {
        const full = (value as string) || '';
        const parts = full.trim().split(' ');
        const display =
          parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
        return display !== full ? (
          <Tooltip content={full}>
            <div className="font-medium text-gray-900 cursor-default">{display}</div>
          </Tooltip>
        ) : (
          <div className="font-medium text-gray-900">{full}</div>
        );
      },
    },
    {
      key: 'start' as keyof Hold,
      label: 'Start',
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: 'end' as keyof Hold,
      label: 'End',
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: 'reason' as keyof Hold,
      label: 'Reason',
      render: (value: unknown) => <div className="text-sm">{(value as string) || '-'}</div>,
    },
    {
      key: 'fee' as keyof Hold,
      label: 'Fee',
      render: (value: unknown) => <div className="text-sm">{(value as string) || '-'}</div>,
    },
    {
      key: 'status' as keyof Hold,
      label: 'Status',
      render: (_value: unknown, hold: Hold) => {
        const status = getHoldStatus(hold.start, hold.end);
        const statusClass =
          status === 'active'
            ? 'bg-green-100 text-green-800'
            : status === 'upcoming'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'year' as keyof Hold,
      label: 'Year',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Hold,
      label: '',
      render: (_value: unknown, hold: Hold) => (
        <OverflowMenu
          items={[
            { label: 'Edit', icon: Edit2, onClick: () => onEdit(hold) },
            { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => onDelete(hold) },
          ]}
        />
      ),
    },
  ];

  return (
    <Table
      data={holds}
      columns={columns}
      loading={loading}
      selectedIds={selectedIds}
      onSelectId={onSelectId}
      onSelectAll={onSelectAll}
      onClearSelection={onClearSelection}
      emptyMessage="No holds found matching your criteria"
    />
  );
}
