import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';

const SETTINGS_KEYS = [
  'hold_reasons',
  'membership_types',
  'class_types',
  'staff_members',
  'cancellation_reasons',
] as const;

type SettingsKey = (typeof SETTINGS_KEYS)[number];

const DEFAULTS: Record<SettingsKey, string[]> = {
  hold_reasons: ['Injury', 'Illness', 'Travel', 'Break Time', 'Work', 'No reason', 'Other'],
  membership_types: ['Integrity', 'Legacy', 'Special', 'ASP', 'Flex 10', 'Flex 20'],
  class_types: [
    'GB1',
    'GB 1/2',
    'GB2',
    'No Gi',
    'Kids 3 - 6 yo',
    'Kids 6 - 8 yo',
    'Kids 7 - 9 yo',
    'Kids All Ages',
    'Kids & Parents',
    'Juniors & Teens',
    "Women's",
    'MUAY THAI',
    'Wrestling',
    'Judo',
    'Jiu-Jitsu Drills',
  ],
  staff_members: [
    'Staff 1',
    'Staff 2',
    'Staff 3',
    'Staff 4',
    'Staff 5',
    'Staff 6',
    'Staff 7',
    'Staff 8',
    'Staff 9',
    'Staff 10',
    'Staff 11',
    'Staff 12',
  ],
  cancellation_reasons: [
    'No time',
    'Moving',
    'Injury',
    'Medical reason',
    'Financial',
    'No interest',
    'Try new sport',
    'Other Gym',
    'Distance from home',
    'Distance from work',
    'Overdue',
    'Other',
    'No reason',
  ],
};

interface SettingsState {
  holdReasons: string[];
  membershipTypes: string[];
  classTypes: string[];
  staffMembers: string[];
  cancellationReasons: string[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function fetchFromDB(): Promise<Partial<Record<SettingsKey, string[]>> | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [...SETTINGS_KEYS]);
  if (error) {
    return null;
  }
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value as string[]])) as Partial<
    Record<SettingsKey, string[]>
  >;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      holdReasons: [],
      membershipTypes: [],
      classTypes: [],
      staffMembers: [],
      cancellationReasons: [],
      loaded: false,
      loading: false,

      async load() {
        if (get().loaded || get().loading) {
          return;
        }
        set({ loading: true });
        const map = await fetchFromDB();
        if (!map) {
          set({
            holdReasons: DEFAULTS.hold_reasons,
            membershipTypes: DEFAULTS.membership_types,
            classTypes: DEFAULTS.class_types,
            staffMembers: DEFAULTS.staff_members,
            cancellationReasons: DEFAULTS.cancellation_reasons,
            loading: false,
          });
          return; // loaded stays false — retry possible
        }
        set({
          holdReasons: map.hold_reasons ?? DEFAULTS.hold_reasons,
          membershipTypes: map.membership_types ?? DEFAULTS.membership_types,
          classTypes: map.class_types ?? DEFAULTS.class_types,
          staffMembers: map.staff_members ?? DEFAULTS.staff_members,
          cancellationReasons: map.cancellation_reasons ?? DEFAULTS.cancellation_reasons,
          loaded: true,
          loading: false,
        });
      },

      async refresh() {
        set({ loaded: false });
        await get().load();
      },
    }),
    { name: 'settings-store' }
  )
);
