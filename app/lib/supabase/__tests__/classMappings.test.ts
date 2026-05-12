jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

import {
  fetchClassMappings,
  updateSystemNameInMappings,
  upsertClassMapping,
} from '@/lib/supabase/classMappings';
import { supabase } from '@/lib/supabase/client';

const mockFrom = supabase.from as jest.Mock;

function mockSelect(data: unknown[], error: unknown = null) {
  mockFrom.mockReturnValue({ select: jest.fn().mockResolvedValue({ data, error }) });
}

function mockUpsert(error: unknown = null) {
  mockFrom.mockReturnValue({ upsert: jest.fn().mockResolvedValue({ error }) });
}

function mockUpdate(error: unknown = null) {
  const eq = jest.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ update: jest.fn().mockReturnValue({ eq }) });
}

beforeEach(() => jest.clearAllMocks());

describe('fetchClassMappings', () => {
  it('returns lookup object keyed by zenplanner_name', async () => {
    mockSelect([
      { zenplanner_name: 'Muay Thai (Adults)', system_name: 'MUAY THAI' },
      { zenplanner_name: 'Judo (Adults)', system_name: 'Judo' },
    ]);
    const result = await fetchClassMappings();
    expect(result).toEqual({
      'Muay Thai (Adults)': 'MUAY THAI',
      'Judo (Adults)': 'Judo',
    });
  });

  it('returns empty object on DB error', async () => {
    mockSelect([], new Error('DB error'));
    const result = await fetchClassMappings();
    expect(result).toEqual({});
  });
});

describe('upsertClassMapping', () => {
  it('calls upsert with onConflict on zenplanner_name', async () => {
    mockUpsert();
    await upsertClassMapping('Muay Thai (Adults)', 'MUAY THAI');
    expect(mockFrom).toHaveBeenCalledWith('class_mappings');
  });

  it('throws on DB error', async () => {
    mockUpsert(new Error('upsert failed'));
    await expect(upsertClassMapping('X', 'Y')).rejects.toThrow('upsert failed');
  });
});

describe('updateSystemNameInMappings', () => {
  it('updates system_name where old name matches', async () => {
    mockUpdate();
    await updateSystemNameInMappings('Old Name', 'New Name');
    expect(mockFrom).toHaveBeenCalledWith('class_mappings');
  });
});
