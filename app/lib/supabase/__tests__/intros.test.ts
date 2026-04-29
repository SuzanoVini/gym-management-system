import { toggleFollowUpDone } from '@/lib/supabase/intros';

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
