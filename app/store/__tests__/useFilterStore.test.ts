import { isDefaultFilters, type TabFilters, useFilterStore } from '../useFilterStore';

const makeDefaults = (overrides: Partial<TabFilters> = {}): TabFilters => ({
  year: '2026',
  month: 'Aug',
  staff: 'all',
  class: 'all',
  reason: 'all',
  ageGroup: 'all',
  membership: 'all',
  holdStatus: 'all',
  searchTerm: '',
  ...overrides,
});

const allTabs = (overrides: Partial<Record<string, TabFilters>> = {}) => ({
  intros: makeDefaults(),
  signups: makeDefaults(),
  cancellations: makeDefaults(),
  holds: makeDefaults(),
  ...overrides,
});

const reset = () =>
  useFilterStore.setState({
    filtersByTab: allTabs(),
    defaultsByTab: allTabs(),
    hydrated: false,
  });

describe('useFilterStore hydration', () => {
  beforeEach(reset);

  it('seeds active filters on the first hydration', () => {
    const saved = allTabs({ intros: makeDefaults({ staff: 'Alpha Instructor' }) });
    useFilterStore.getState().applyDefaults(saved);
    expect(useFilterStore.getState().filtersByTab.intros.staff).toBe('Alpha Instructor');
  });

  it('does not wipe filters the user already set when hydrating again', () => {
    useFilterStore.getState().applyDefaults(allTabs());
    useFilterStore.getState().setFilters('intros', { searchTerm: 'in progress' });

    // Overview mounting, or the settings panel opening, hydrates a second time.
    useFilterStore.getState().applyDefaults(allTabs());

    expect(useFilterStore.getState().filtersByTab.intros.searchTerm).toBe('in progress');
  });

  it('applies immediately when the user explicitly saves new defaults', () => {
    useFilterStore.getState().applyDefaults(allTabs());
    useFilterStore.getState().setFilters('intros', { searchTerm: 'in progress' });

    const saved = allTabs({ intros: makeDefaults({ staff: 'Bravo Instructor' }) });
    useFilterStore.getState().applyDefaults(saved, true);

    expect(useFilterStore.getState().filtersByTab.intros.staff).toBe('Bravo Instructor');
    expect(useFilterStore.getState().filtersByTab.intros.searchTerm).toBe('');
  });

  it('clears back to that tab’s own defaults, not another tab’s', () => {
    useFilterStore
      .getState()
      .applyDefaults(allTabs({ holds: makeDefaults({ holdStatus: 'active' }) }));
    useFilterStore.getState().setFilters('holds', { holdStatus: 'ended' });

    useFilterStore.getState().clearFilters('holds');

    expect(useFilterStore.getState().filtersByTab.holds.holdStatus).toBe('active');
  });
});

describe('isDefaultFilters', () => {
  beforeEach(reset);

  it('compares against the given tab rather than a shared baseline', () => {
    useFilterStore
      .getState()
      .applyDefaults(allTabs({ holds: makeDefaults({ holdStatus: 'active' }) }));

    const holdsFilters = useFilterStore.getState().filtersByTab.holds;
    expect(isDefaultFilters(holdsFilters, 'holds')).toBe(true);
    // The same values are NOT default for intros, whose baseline leaves holdStatus at "all".
    expect(isDefaultFilters(holdsFilters, 'intros')).toBe(false);
  });

  it('reports non-default once a filter is changed', () => {
    useFilterStore.getState().applyDefaults(allTabs());
    useFilterStore.getState().setFilters('signups', { membership: 'Legacy' });
    expect(isDefaultFilters(useFilterStore.getState().filtersByTab.signups, 'signups')).toBe(false);
  });
});
