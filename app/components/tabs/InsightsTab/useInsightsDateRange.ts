import { useState } from 'react';

export function useInsightsDateRange() {
  const [dateRange, setDateRange] = useState('3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const handleApplyCustomDates = () => {
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
  };

  return {
    dateRange,
    setDateRange,
    customStartDate,
    customEndDate,
    tempStartDate,
    setTempStartDate,
    tempEndDate,
    setTempEndDate,
    handleApplyCustomDates,
  };
}
