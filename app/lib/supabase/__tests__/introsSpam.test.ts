import {
  buildSpamGroupFilter,
  markSpamGroup,
  restoreSpamGroup,
  undoSpamMark,
} from '@/lib/supabase/intros';

jest.mock('@/lib/supabase/client', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '@/lib/supabase/client';

const mockFrom = supabase.from as jest.Mock;

function chain(result: unknown) {
  const c = {
    update: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValue(c);
  return c;
}

describe('buildSpamGroupFilter', () => {
  it('always includes the id and quotes every value', () => {
    expect(buildSpamGroupFilter({ id: 'a1', email_normalized: null, phone_normalized: null })).toBe(
      'id.eq."a1"'
    );
  });

  it('adds email and 7+ digit phone', () => {
    expect(
      buildSpamGroupFilter({
        id: 'a1',
        email_normalized: 'x@example.com',
        phone_normalized: '6045550142',
      })
    ).toBe('id.eq."a1",email_normalized.eq."x@example.com",phone_normalized.eq."6045550142"');
  });

  it('skips short phones', () => {
    expect(
      buildSpamGroupFilter({ id: 'a1', email_normalized: null, phone_normalized: '12345' })
    ).toBe('id.eq."a1"');
  });

  it('escapes backslashes and quotes', () => {
    expect(
      buildSpamGroupFilter({
        id: 'a1',
        email_normalized: 'a"b\\c,(d)@example.com',
        phone_normalized: null,
      })
    ).toBe('id.eq."a1",email_normalized.eq."a\\"b\\\\c,(d)@example.com"');
  });
});

describe('markSpamGroup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates only non-spam group rows and returns changed ids', async () => {
    const c = chain({ data: [{ id: 'a1' }, { id: 'b2' }], error: null });
    const ids = await markSpamGroup({
      id: 'a1',
      email_normalized: 'x@example.com',
      phone_normalized: null,
    });
    expect(c.update).toHaveBeenCalledWith(expect.objectContaining({ is_spam: true }));
    expect(c.or).toHaveBeenCalledWith('id.eq."a1",email_normalized.eq."x@example.com"');
    expect(c.eq).toHaveBeenCalledWith('is_spam', false);
    expect(ids).toEqual(['a1', 'b2']);
  });
});

describe('undoSpamMark', () => {
  it('reverts exactly the changed ids and leaves the dismissed timestamp alone', async () => {
    const c = chain({ data: [], error: null });
    await undoSpamMark(['a1', 'b2']);
    expect(c.update).toHaveBeenCalledWith({ is_spam: false, spam_marked_at: null });
    expect(c.in).toHaveBeenCalledWith('id', ['a1', 'b2']);
  });

  it('does nothing for an empty list', async () => {
    mockFrom.mockClear();
    await undoSpamMark([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('restoreSpamGroup', () => {
  it('restores spam rows of the group and records the dismissal', async () => {
    const c = chain({ data: [{ id: 'a1' }], error: null });
    await restoreSpamGroup({ id: 'a1', email_normalized: null, phone_normalized: '6045550142' });
    expect(c.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_spam: false,
        spam_marked_at: null,
        spam_warning_dismissed_at: expect.any(String),
      })
    );
    expect(c.eq).toHaveBeenCalledWith('is_spam', true);
  });
});
