'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface TableProps<T extends { id: string }> {
  data: T[];
  columns: {
    key: keyof T;
    label: string;
    render?: (value: unknown, item: T) => React.ReactNode;
    sortable?: boolean;
  }[];
  loading?: boolean;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onRowClick?: (item: T) => void;
  selectedIds?: Set<string>;
  onSelectId?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  onClearSelection?: (ids: string[]) => void;
  emptyMessage?: string;
  getRowClassName?: (item: T) => string;
}

export default function Table<T extends { id: string }>({
  data,
  columns,
  loading = false,
  onSort,
  onRowClick,
  selectedIds,
  onSelectId,
  onSelectAll,
  onClearSelection,
  emptyMessage = 'No data available',
  getRowClassName,
}: TableProps<T>) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const pageIds = data.map((item) => item.id);
  const selectedCount = selectedIds
    ? pageIds.reduce((count, id) => (selectedIds.has(id) ? count + 1 : count), 0)
    : 0;
  const allSelected = selectedCount > 0 && selectedCount === pageIds.length;
  const someSelected = selectedCount > 0 && selectedCount < pageIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onSelectId && (
              <th className="px-4 py-3 text-left w-8">
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectAll?.(pageIds);
                    } else {
                      onClearSelection?.(pageIds);
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-red-600 cursor-pointer"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.key, 'asc')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>{column.label}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={item.id || index}
              className={`${getRowClassName ? getRowClassName(item) : 'hover:bg-gray-50'} ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {onSelectId && (
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(item.id)}
                    onChange={() => onSelectId(item.id)}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-red-600 cursor-pointer"
                  />
                </td>
              )}
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {column.render
                    ? column.render(item[column.key], item)
                    : (item[column.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
