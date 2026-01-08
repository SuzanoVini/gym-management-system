'use client';

import { ChevronDown } from 'lucide-react';

interface TableProps<T> {
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
  emptyMessage?: string;
}

export default function Table<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  onSort,
  onRowClick,
  selectedIds,
  onSelectId,
  emptyMessage = 'No data available',
}: TableProps<T>) {
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
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds?.size === data.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      data.forEach((item) => {
                        onSelectId((item as Record<string, unknown>).id as string);
                      });
                    } else {
                      selectedIds?.forEach((id) => {
                        onSelectId(id);
                      });
                    }
                  }}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
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
              key={((item as Record<string, unknown>).id as string) || index}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {onSelectId && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds?.has((item as Record<string, unknown>).id as string)}
                    onChange={() => onSelectId((item as Record<string, unknown>).id as string)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
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
