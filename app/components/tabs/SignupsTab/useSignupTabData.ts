import { useIntros } from '@/hooks/useIntros';
import { useSignups } from '@/hooks/useSignups';
import { type TabFilters, useFilterStore } from '@/store/useFilterStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useSignupListModel } from './useSignupListModel';

export function useSignupTabData(sortOrder: 'newest' | 'oldest') {
  const signupState = useSignups();
  const { intros } = useIntros();
  const ui = useUIStore();
  const filters = useFilterStore((state) => state.filtersByTab.signups);
  const setFiltersForTab = useFilterStore((state) => state.setFilters);
  const clearFiltersForTab = useFilterStore((state) => state.clearFilters);
  const membershipTypes = useSettingsStore((state) => state.membershipTypes);
  const listModel = useSignupListModel({
    signups: signupState.signups,
    filters,
    sortOrder,
  });

  return {
    ...signupState,
    intros,
    modals: ui.modals,
    openModal: ui.openModal,
    closeModal: ui.closeModal,
    filters,
    setFilters: (partial: Partial<TabFilters>) => setFiltersForTab('signups', partial),
    clearFilters: () => clearFiltersForTab('signups'),
    membershipTypes,
    ...listModel,
  };
}
