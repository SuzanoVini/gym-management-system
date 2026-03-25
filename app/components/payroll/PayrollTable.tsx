'use client';

import { Edit2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import Table from '@/components/ui/Table';
import type { StaffHours, StaffMember } from '@/types';
import EditableHoursCell from './EditableHoursCell';

interface PayrollTableProps {
  hours: StaffHours[];
  staff: StaffMember[];
  loading?: boolean;
  onEdit: (hours: StaffHours) => void;
  onDelete: (id: string) => void;
  onUpdateHours?: (
    staffHoursId: string,
    field: 'regular_hours' | 'overtime_hours' | 'vacation_hours' | 'sick_hours',
    value: number
  ) => Promise<void>;
  selectedIds?: Set<string>;
  onSelectId?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  onClearSelection?: (ids: string[]) => void;
  searchTerm?: string;
}

interface PayrollRow extends StaffHours {
  staff_name: string;
}

export default function PayrollTable({
  hours,
  staff,
  loading = false,
  onEdit,
  onDelete,
  onUpdateHours,
  selectedIds,
  onSelectId,
  onSelectAll,
  onClearSelection,
  searchTerm = '',
}: PayrollTableProps) {
  const [sortKey, setSortKey] = useState<keyof PayrollRow>('staff_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Merge hours with staff names
  const payrollData = useMemo(() => {
    const staffMap = new Map(staff.map((s) => [s.id, s]));

    return hours.map((h) => {
      const staffMember = staffMap.get(h.staff_id);
      return {
        ...h,
        staff_name: staffMember?.full_name || 'Unknown',
      };
    });
  }, [hours, staff]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = payrollData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        row.staff_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Sorting logic is inherently complex
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return filtered;
  }, [payrollData, searchTerm, sortKey, sortDirection]);

  const handleSort = (key: keyof PayrollRow) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const columns = [
    {
      key: 'staff_name' as keyof PayrollRow,
      label: 'Staff Name',
      sortable: true,
      render: (value: unknown) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'regular_hours' as keyof PayrollRow,
      label: 'Regular',
      sortable: true,
      render: (value: unknown, row: PayrollRow) =>
        onUpdateHours ? (
          <EditableHoursCell
            value={value as number}
            onSave={(newValue) => onUpdateHours(row.id, 'regular_hours', newValue)}
            disabled={loading}
          />
        ) : (
          <div className="text-right">{(value as number).toFixed(2)}</div>
        ),
    },
    {
      key: 'overtime_hours' as keyof PayrollRow,
      label: 'OT',
      sortable: true,
      render: (value: unknown, row: PayrollRow) =>
        onUpdateHours ? (
          <EditableHoursCell
            value={value as number}
            onSave={(newValue) => onUpdateHours(row.id, 'overtime_hours', newValue)}
            disabled={loading}
          />
        ) : (
          <div className="text-right">{(value as number).toFixed(2)}</div>
        ),
    },
    {
      key: 'vacation_hours' as keyof PayrollRow,
      label: 'Vacation',
      sortable: true,
      render: (value: unknown, row: PayrollRow) =>
        onUpdateHours ? (
          <EditableHoursCell
            value={value as number}
            onSave={(newValue) => onUpdateHours(row.id, 'vacation_hours', newValue)}
            disabled={loading}
          />
        ) : (
          <div className="text-right">{(value as number).toFixed(2)}</div>
        ),
    },
    {
      key: 'sick_hours' as keyof PayrollRow,
      label: 'Sick',
      sortable: true,
      render: (value: unknown, row: PayrollRow) =>
        onUpdateHours ? (
          <EditableHoursCell
            value={value as number}
            onSave={(newValue) => onUpdateHours(row.id, 'sick_hours', newValue)}
            disabled={loading}
          />
        ) : (
          <div className="text-right">{(value as number).toFixed(2)}</div>
        ),
    },
    {
      key: 'mat_cleaning_count' as keyof PayrollRow,
      label: 'Mat Cleaning',
      sortable: true,
      render: (value: unknown) => <div className="text-right">{value as number}</div>,
    },
    {
      key: 'total_hours' as keyof PayrollRow,
      label: 'Total Hours',
      sortable: true,
      render: (value: unknown) => (
        <div className="text-right font-semibold text-gray-900">{(value as number).toFixed(2)}</div>
      ),
    },
    {
      key: 'actions' as keyof PayrollRow,
      label: 'Actions',
      render: (_value: unknown, row: PayrollRow) => (
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            className="btn-icon hover:text-blue-600"
            title="Edit"
            aria-label={`Edit hours for ${row.staff_name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete hours for ${row.staff_name}?`)) {
                onDelete(row.id);
              }
            }}
            className="btn-icon hover:text-red-600"
            title="Delete"
            aria-label={`Delete hours for ${row.staff_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Table
      data={filteredData}
      columns={columns}
      loading={loading}
      onSort={handleSort}
      {...(selectedIds && { selectedIds })}
      {...(onSelectId && { onSelectId })}
      {...(onSelectAll && { onSelectAll })}
      {...(onClearSelection && { onClearSelection })}
      emptyMessage="No payroll hours recorded for this period"
    />
  );
}
