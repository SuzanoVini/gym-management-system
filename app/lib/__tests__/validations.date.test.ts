import { cancellationSchema, holdSchema, signupSchema } from '../validations';

describe('signupSchema — membership_date required', () => {
  const base = { month: 'Jan', name: 'Test User', membership: 'Integrity' };

  it('rejects empty membership_date', () => {
    const result = signupSchema.safeParse({ ...base, membership_date: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing membership_date', () => {
    const result = signupSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it('accepts a valid date', () => {
    const result = signupSchema.safeParse({ ...base, membership_date: '2025-03-15' });
    expect(result.success).toBe(true);
  });
});

describe('cancellationSchema — date required', () => {
  const base = { month: 'Jan', name: 'Test User', reason: 'Moving' };

  it('rejects empty date', () => {
    const result = cancellationSchema.safeParse({ ...base, date: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const result = cancellationSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it('accepts a valid date', () => {
    const result = cancellationSchema.safeParse({ ...base, date: '2025-03-15' });
    expect(result.success).toBe(true);
  });
});

describe('holdSchema — start required', () => {
  const base = { month: 'Jan', name: 'Test User', reason: 'Travel' };

  it('rejects empty start', () => {
    const result = holdSchema.safeParse({ ...base, start: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing start', () => {
    const result = holdSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it('accepts a valid start date', () => {
    const result = holdSchema.safeParse({ ...base, start: '2025-03-15' });
    expect(result.success).toBe(true);
  });
});
