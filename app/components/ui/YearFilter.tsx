'use client';

interface YearFilterProps {
  availableYears: number[];
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export default function YearFilter({
  availableYears,
  selectedYear,
  onYearChange,
}: YearFilterProps) {
  return (
    <div className="flex items-center gap-2 pb-4 mb-2 border-b border-gray-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onYearChange('all')}
        className={[
          'whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-semibold cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          selectedYear === 'all'
            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-200/70'
            : 'bg-white text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50/50',
        ].join(' ')}
      >
        All
      </button>

      {availableYears.map((year) => {
        const isActive = selectedYear === String(year);
        return (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(String(year))}
            className={[
              'whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-semibold cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
              isActive
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-200/70'
                : 'bg-white text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50/50',
            ].join(' ')}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
