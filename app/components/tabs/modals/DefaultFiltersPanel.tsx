'use client';

import { useEffect, useId, useState } from 'react';
import { useDefaultFilters } from '@/hooks/useDefaultFilters';
import {
  CURRENT,
  type DefaultFilterPreferences,
  type StoredTabFilters,
} from '@/lib/preferences/defaultFilters';
import type { FilterTabKey } from '@/store/useFilterStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export type DefaultFilterScope = FilterTabKey | 'overview';

type Option = { value: string; label: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const OVERVIEW_RANGES: Option[] = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last 12 months' },
];

const HOLD_STATUSES: Option[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
];

const SCOPE_LABELS: Record<DefaultFilterScope, string> = {
  intros: 'Intros',
  signups: 'Signups',
  cancellations: 'Cancellations',
  holds: 'Holds',
  overview: 'Overview',
};

const asOptions = (values: string[], allLabel: string): Option[] => [
  { value: 'all', label: allLabel },
  ...values.map((v) => ({ value: v, label: v })),
];

function yearOptions(now: Date): Option[] {
  return [
    { value: CURRENT, label: 'Current year (always today)' },
    { value: 'all', label: 'All years' },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = String(now.getFullYear() - i);
      return { value: year, label: year };
    }),
  ];
}

const MONTH_OPTIONS: Option[] = [
  { value: CURRENT, label: 'Current month (always today)' },
  { value: 'all', label: 'All months' },
  ...MONTHS.map((m) => ({ value: m, label: m })),
];

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The filters that only exist on one tab, kept out of the main component's branching. */
function ScopeFields({
  scope,
  draft,
  set,
}: {
  scope: Exclude<DefaultFilterScope, 'overview'>;
  draft: StoredTabFilters;
  set: (key: keyof StoredTabFilters, value: string) => void;
}) {
  const { staffMembers, classTypes, membershipTypes, cancellationReasons, holdReasons } =
    useSettingsStore();

  if (scope === 'intros') {
    return (
      <>
        <SelectField
          label="Coach"
          value={draft.staff ?? 'all'}
          onChange={(v) => set('staff', v)}
          options={asOptions(staffMembers, 'All coaches')}
        />
        <SelectField
          label="Class"
          value={draft.class ?? 'all'}
          onChange={(v) => set('class', v)}
          options={asOptions(classTypes, 'All classes')}
        />
      </>
    );
  }

  if (scope === 'signups') {
    return (
      <SelectField
        label="Membership"
        value={draft.membership ?? 'all'}
        onChange={(v) => set('membership', v)}
        options={asOptions(membershipTypes, 'All memberships')}
      />
    );
  }

  if (scope === 'cancellations') {
    return (
      <SelectField
        label="Reason"
        value={draft.reason ?? 'all'}
        onChange={(v) => set('reason', v)}
        options={asOptions(cancellationReasons, 'All reasons')}
      />
    );
  }

  return (
    <>
      <SelectField
        label="Status"
        value={draft.holdStatus ?? 'all'}
        onChange={(v) => set('holdStatus', v)}
        options={HOLD_STATUSES}
      />
      <SelectField
        label="Reason"
        value={draft.reason ?? 'all'}
        onChange={(v) => set('reason', v)}
        options={asOptions(holdReasons, 'All reasons')}
      />
    </>
  );
}

export default function DefaultFiltersPanel({ scope }: { scope: DefaultFilterScope }) {
  const { preferences, loading, save } = useDefaultFilters();
  const [draft, setDraft] = useState<StoredTabFilters>({});
  const [overviewRange, setOverviewRange] = useState('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (scope === 'overview') {
      setOverviewRange(preferences?.defaultFilters?.overview?.dateRange ?? 'all');
    } else {
      setDraft(preferences?.defaultFilters?.[scope] ?? {});
    }
  }, [preferences, scope]);

  const set = (key: keyof StoredTabFilters, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        ...preferences,
        defaultFilters: {
          ...preferences?.defaultFilters,
          ...(scope === 'overview'
            ? { overview: { dateRange: overviewRange } }
            : { [scope]: draft }),
        },
      } satisfies DefaultFilterPreferences);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading your preferences...</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        These are the filters the <strong>{SCOPE_LABELS[scope]}</strong> tab starts on each time you
        open it, and what the Clear button resets to. They apply only to your account.
      </p>

      {scope === 'overview' ? (
        <SelectField
          label="Default date range"
          value={overviewRange}
          onChange={(v) => {
            setOverviewRange(v);
            setSaved(false);
          }}
          options={OVERVIEW_RANGES}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Year"
            value={draft.year ?? CURRENT}
            onChange={(v) => set('year', v)}
            options={yearOptions(new Date())}
          />
          <SelectField
            label="Month"
            value={draft.month ?? CURRENT}
            onChange={(v) => set('month', v)}
            options={MONTH_OPTIONS}
          />
          <ScopeFields scope={scope} draft={draft} set={set} />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save defaults'}
        </button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
    </div>
  );
}
