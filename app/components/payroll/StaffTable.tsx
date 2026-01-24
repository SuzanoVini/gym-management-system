'use client';

import { Edit2, UserCheck, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import Table from '@/components/ui/Table';
import type { StaffMember } from '@/types';

interface StaffTableProps {
  staff: StaffMember[];
  loading?: boolean;
  onEdit: (staff: StaffMember) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  searchTerm?: string;
  filterStatus?: 'all' | 'active' | 'inactive';
}

export default function StaffTable({
  staff,
  loading = false,
  onEdit,
  onToggleActive,
  searchTerm = '',
  filterStatus = 'active',
}: StaffTableProps) {
  const [sortKey, setSortKey] = useState<keyof StaffMember>('full_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = staff;

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((s) => s.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((s) => !s.is_active);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(term) ||
          s.employee_id.toLowerCase().includes(term) ||
          s.job_title.toLowerCase().includes(term)
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

      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
      }

      return 0;
    });

    return filtered;
  }, [staff, searchTerm, filterStatus, sortKey, sortDirection]);

  const handleSort = (key: keyof StaffMember) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const columns = [
    {
      key: 'employee_id' as keyof StaffMember,
      label: 'Payroll ID',
      sortable: true,
      render: (value: unknown) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'full_name' as keyof StaffMember,
      label: 'Name',
      sortable: true,
      render: (value: unknown) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'job_title' as keyof StaffMember,
      label: 'Title',
      sortable: true,
      render: (value: unknown) => <div className="text-gray-700">{value as string}</div>,
    },
    {
      key: 'is_active' as keyof StaffMember,
      label: 'Status',
      sortable: true,
      render: (value: unknown) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions' as keyof StaffMember,
      label: 'Actions',
      render: (_value: unknown, staff: StaffMember) => (
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(staff);
            }}
            className="btn-icon hover:text-blue-600"
            title="Edit"
            aria-label={`Edit ${staff.full_name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const action = staff.is_active ? 'deactivate' : 'activate';
              if (
                confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${staff.full_name}?`)
              ) {
                onToggleActive(staff.id, !staff.is_active);
              }
            }}
            className={`btn-icon ${
              staff.is_active ? 'hover:text-red-600' : 'hover:text-green-600'
            }`}
            title={staff.is_active ? 'Deactivate' : 'Activate'}
            aria-label={`${staff.is_active ? 'Deactivate' : 'Activate'} ${staff.full_name}`}
          >
            {staff.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
      emptyMessage="No staff members found"
    />
  );
}
