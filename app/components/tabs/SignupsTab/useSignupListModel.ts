import { useMemo } from 'react';
import type { TabFilters } from '@/store/useFilterStore';
import type { Signup } from '@/types';

interface SignupListModelOptions {
  signups: Signup[];
  filters: TabFilters;
  sortOrder: 'newest' | 'oldest';
}

function getSortTimestamp(signup: Signup) {
  const dateValue = signup.membership_date ? new Date(signup.membership_date).getTime() : 0;
  if (dateValue) {
    return dateValue;
  }
  return signup.created_at ? new Date(signup.created_at).getTime() : 0;
}

export function useSignupListModel({ signups, filters, sortOrder }: SignupListModelOptions) {
  const filteredSignups = useMemo(() => {
    let filtered = signups.filter((signup) => {
      const matchesMonth = filters.month === 'all' || signup.month === filters.month;
      const matchesMembership =
        filters.membership === 'all' ||
        (signup.membership && signup.membership === filters.membership);
      const matchesYear = filters.year === 'all' || String(signup.year) === filters.year;
      return matchesMonth && matchesMembership && matchesYear;
    });

    if (filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (signup) =>
          signup.name.toLowerCase().includes(search) ||
          signup.membership?.toLowerCase().includes(search) ||
          signup.membership_date?.includes(search) ||
          signup.first_payment_date?.includes(search) ||
          signup.notes?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [signups, filters]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const signup of signups) {
      if (signup.year) {
        years.add(signup.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [signups]);

  const sortedSignups = useMemo(
    () =>
      [...filteredSignups].sort((a, b) => {
        const dateA = getSortTimestamp(a);
        const dateB = getSortTimestamp(b);
        if (dateA === dateB) {
          return 0;
        }
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      }),
    [filteredSignups, sortOrder]
  );

  const metrics = {
    total: filteredSignups.length,
    integrity: filteredSignups.filter((signup) => signup.membership === 'Integrity').length,
    legacy: filteredSignups.filter((signup) => signup.membership === 'Legacy').length,
    special: filteredSignups.filter((signup) => signup.membership === 'Special').length,
    asp: filteredSignups.filter((signup) => signup.membership === 'ASP').length,
    withPackage: filteredSignups.filter((signup) => signup.signup_package).length,
  };

  return { filteredSignups, sortedSignups, availableYears, metrics };
}
