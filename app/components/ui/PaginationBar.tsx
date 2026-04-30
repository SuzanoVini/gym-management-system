'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationBarProps {
  id: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
  selectedCount?: number;
  onClearSelection?: () => void;
}

export default function PaginationBar({
  id,
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  selectedCount = 0,
  onClearSelection,
}: PaginationBarProps) {
  const navBtn =
    'h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer';

  return (
    <div className="section-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: per-page select + selection badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor={id}
              className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest select-none"
            >
              Show
            </label>
            <div className="relative">
              <select
                id={id}
                value={itemsPerPage}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value));
                  onPageChange(1);
                }}
                className="h-8 pl-2.5 pr-7 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer transition-colors duration-150 appearance-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
              <ChevronLeft className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 rotate-[-90deg]" />
            </div>
          </div>

          {selectedCount > 0 && onClearSelection && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-900 text-white text-[11px] font-semibold tracking-wide">
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors duration-150 cursor-pointer font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Center: count */}
        <span className="text-xs text-gray-400 tabular-nums font-medium">
          {totalItems === 0 ? '0' : `${startIndex + 1}–${Math.min(endIndex, totalItems)}`} of{' '}
          {totalItems}
        </span>

        {/* Right: nav controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={navBtn}
            aria-label="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={navBtn}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="px-3 h-8 rounded-lg bg-gray-900 text-white text-xs font-semibold flex items-center tabular-nums min-w-[56px] justify-center tracking-wide">
            {currentPage} / {Math.max(1, totalPages)}
          </div>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={navBtn}
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className={navBtn}
            aria-label="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
