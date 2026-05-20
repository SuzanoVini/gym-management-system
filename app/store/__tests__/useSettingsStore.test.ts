import { useSettingsStore } from '../useSettingsStore';

const mockIn = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const DB_DATA = [
  { key: 'hold_reasons', value: ['Injury', 'Travel'] },
  { key: 'membership_types', value: ['Integrity', 'Legacy'] },
  { key: 'class_types', value: ['GB1', 'GB2'] },
  { key: 'staff_members', value: ['Staff 1', 'Staff 2'] },
  { key: 'cancellation_reasons', value: ['Moving', 'Injury'] },
];

function resetStore() {
  useSettingsStore.setState({
    holdReasons: [],
    membershipTypes: [],
    classTypes: [],
    staffMembers: [],
    cancellationReasons: [],
    loaded: false,
    loading: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSelect.mockReturnValue({ in: mockIn });
  mockFrom.mockReturnValue({ select: mockSelect });
  resetStore();
});

describe('useSettingsStore.load()', () => {
  it('populates store from DB and sets loaded: true', async () => {
    mockIn.mockResolvedValue({ data: DB_DATA, error: null });
    await useSettingsStore.getState().load();
    const state = useSettingsStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.holdReasons).toEqual(['Injury', 'Travel']);
    expect(state.membershipTypes).toEqual(['Integrity', 'Legacy']);
  });

  it('is idempotent — second call skips DB fetch', async () => {
    mockIn.mockResolvedValue({ data: DB_DATA, error: null });
    await useSettingsStore.getState().load();
    await useSettingsStore.getState().load();
    expect(mockIn).toHaveBeenCalledTimes(1);
  });

  it('on DB error: applies defaults and keeps loaded: false', async () => {
    mockIn.mockResolvedValue({ data: null, error: new Error('DB unavailable') });
    await useSettingsStore.getState().load();
    const state = useSettingsStore.getState();
    expect(state.loaded).toBe(false);
    expect(state.holdReasons).toEqual(expect.arrayContaining(['Injury', 'Illness', 'Travel']));
  });

  it('on DB error: allows retry on next load() call', async () => {
    mockIn
      .mockResolvedValueOnce({ data: null, error: new Error('transient') })
      .mockResolvedValueOnce({ data: DB_DATA, error: null });
    await useSettingsStore.getState().load(); // fails
    await useSettingsStore.getState().load(); // retries because loaded: false
    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(mockIn).toHaveBeenCalledTimes(2);
  });

  it('uses defaults for keys missing from DB response', async () => {
    mockIn.mockResolvedValue({
      data: [{ key: 'hold_reasons', value: ['Custom'] }],
      error: null,
    });
    await useSettingsStore.getState().load();
    const state = useSettingsStore.getState();
    expect(state.holdReasons).toEqual(['Custom']);
    expect(state.membershipTypes).toEqual(
      expect.arrayContaining(['Integrity', 'Legacy', 'Special', 'ASP'])
    );
  });
});

describe('useSettingsStore.refresh()', () => {
  it('re-fetches even when already loaded', async () => {
    mockIn.mockResolvedValue({ data: DB_DATA, error: null });
    await useSettingsStore.getState().load();
    expect(mockIn).toHaveBeenCalledTimes(1);

    await useSettingsStore.getState().refresh();
    expect(mockIn).toHaveBeenCalledTimes(2);
  });
});
