'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

interface YearFilterProps {
  availableYears: number[];
  selectedYear: string;
  onYearChange: (year: string) => void;
}

const pillBase =
  'whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-semibold cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400';
const pillActive =
  'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-200/70';
const pillInactive =
  'bg-white text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50/50';

const ARROW_THRESHOLD = 8;
const SCROLL_AMOUNT = 180;

export default function YearFilter({
  availableYears,
  selectedYear,
  onYearChange,
}: YearFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (availableYears.length === 0) {
    return null;
  }

  const useArrows = availableYears.length >= ARROW_THRESHOLD;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
      behavior: 'smooth',
    });
  };

  const arrowBtn =
    'shrink-0 rounded-full w-7 h-7 flex items-center justify-center border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400';

  const pills = (
    <>
      <button
        type="button"
        onClick={() => onYearChange('all')}
        className={`${pillBase} ${selectedYear === 'all' ? pillActive : pillInactive}`}
      >
        All
      </button>
      {availableYears.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onYearChange(String(year))}
          className={`${pillBase} ${selectedYear === String(year) ? pillActive : pillInactive}`}
        >
          {year}
        </button>
      ))}
    </>
  );

  return (
    <div className="flex items-center gap-2 pb-4 mb-2 border-b border-gray-100">
      {useArrows ? (
        <>
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className={arrowBtn}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-[28rem] sm:max-w-lg"
          >
            {pills}
          </div>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className={arrowBtn}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pills}
        </div>
      )}
    </div>
  );
}
