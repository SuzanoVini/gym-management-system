import { Trash2 } from 'lucide-react';
import PaginationBar from '@/components/ui/PaginationBar';
import type { Hold } from '@/types';
import HoldsTable from './HoldsTable';

interface HoldsGridProps {
  holds: Hold[];
  loading: boolean;
  selectedIds: Set<string>;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<void>;
  onSelectId: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelectedIds: (ids: string[]) => void;
  onEdit: (hold: Hold) => void;
  onDelete: (hold: Hold) => void;
}

export default function HoldsGrid(props: HoldsGridProps) {
  const {
    holds,
    loading,
    selectedIds,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
  } = props;
  return (
    <>
      <PaginationBar
        id="holds-items-per-page"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={props.onPageChange}
        onItemsPerPageChange={props.onItemsPerPageChange}
        selectedCount={selectedIds.size}
        onClearSelection={props.onClearSelection}
      />
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">All Holds ({totalItems})</h3>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                void props.onDeleteSelected();
              }}
              className="btn btn-primary"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
        <HoldsTable
          holds={holds}
          loading={loading}
          selectedIds={selectedIds}
          onSelectId={props.onSelectId}
          onSelectAll={props.onSelectAll}
          onClearSelection={props.onClearSelectedIds}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      </div>
    </>
  );
}
