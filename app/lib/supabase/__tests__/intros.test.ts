import { deleteFollowUpNote, toggleFollowUpDone, updateFollowUpNote } from '@/lib/supabase/intros';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase/client';

const mockFrom = supabase.from as jest.Mock;

function mockChain(resolveWith: { error: unknown }) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(resolveWith),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

function mockFullChain(resolveWith: { data: unknown; error: unknown }) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolveWith),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('toggleFollowUpDone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets follow_up_status to Done when currentStatus is null', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', null);
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: 'Done' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('sets follow_up_status to Done when currentStatus is undefined', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', undefined);
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: 'Done' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('sets follow_up_status to Done when currentStatus is empty string', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', '');
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: 'Done' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('sets follow_up_status to null when currentStatus is Done', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', 'Done');
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: null });
  });

  it('sets follow_up_status to null when currentStatus is Contacted', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', 'Contacted');
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: null });
  });

  it('throws when Supabase returns an error', async () => {
    const dbError = new Error('DB failure');
    mockChain({ error: dbError });
    await expect(toggleFollowUpDone('abc-123', null)).rejects.toThrow('DB failure');
  });
});

describe('updateFollowUpNote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates note text and returns data', async () => {
    const updated = {
      id: 'note-1',
      note: 'updated text',
      staff_name: 'Vini',
      created_at: '2026-05-25T00:00:00Z',
      intro_id: 'intro-1',
    };
    const chain = mockFullChain({ data: updated, error: null });
    const result = await updateFollowUpNote('note-1', 'updated text');
    expect(chain.update).toHaveBeenCalledWith({ note: 'updated text' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'note-1');
    expect(result).toEqual(updated);
  });

  it('throws when Supabase returns an error', async () => {
    mockFullChain({ data: null, error: new Error('DB fail') });
    await expect(updateFollowUpNote('note-1', 'text')).rejects.toThrow('DB fail');
  });
});

describe('deleteFollowUpNote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls delete and eq with the note id', async () => {
    const chain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);
    await deleteFollowUpNote('note-1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'note-1');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: new Error('DB fail') }),
    };
    mockFrom.mockReturnValue(chain);
    await expect(deleteFollowUpNote('note-1')).rejects.toThrow('DB fail');
  });
});
