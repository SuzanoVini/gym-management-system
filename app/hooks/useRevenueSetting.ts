'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_MONTHLY_MEMBERSHIP_REVENUE } from '@/lib/insights/rules';
import { fetchNumberSetting } from '@/lib/supabase/settings';

/** Avg monthly revenue per member, editable from the settings modal. */
export function useRevenueSetting(): number {
  const [revenuePerMember, setRevenuePerMember] = useState(DEFAULT_MONTHLY_MEMBERSHIP_REVENUE);

  useEffect(() => {
    fetchNumberSetting('avg_monthly_membership_revenue', DEFAULT_MONTHLY_MEMBERSHIP_REVENUE).then(
      setRevenuePerMember
    );
  }, []);

  return revenuePerMember;
}
