import { pickDedupSurvivor } from '../dedupSurvivor';

const row = (id: string, email: string | null, phone: string | null, is_spam: boolean) => ({
  id,
  email,
  phone,
  is_spam,
});

describe('pickDedupSurvivor', () => {
  it('keeps the spam row even when it has fewer contact details', () => {
    const prior = row('a', null, null, true);
    const current = row('b', 'x@example.com', '555-0142', false);
    expect(pickDedupSurvivor(prior, current)).toEqual({ keep: prior, drop: current });
    expect(pickDedupSurvivor(current, prior)).toEqual({ keep: prior, drop: current });
  });

  it('otherwise keeps the row with more contact details', () => {
    const prior = row('a', null, null, false);
    const current = row('b', 'x@example.com', null, false);
    expect(pickDedupSurvivor(prior, current)).toEqual({ keep: current, drop: prior });
  });

  it('keeps the earlier row on a tie', () => {
    const prior = row('a', 'x@example.com', null, false);
    const current = row('b', 'y@example.com', null, false);
    expect(pickDedupSurvivor(prior, current)).toEqual({ keep: prior, drop: current });
  });
});
