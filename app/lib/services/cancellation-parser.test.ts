import { parseCancellationEmail } from './cancellation-parser';

const BASIC_EMAIL = `Cancellation details:

Name: John Smith
Reason: Pricing
Effective date: May 15, 2026`;

const CRLF_EMAIL = `Cancellation details:\r\n\r\nName: Jane Doe\r\nReason: Moving\r\nEffective date: January 3, 2026`;

const NUMERIC_DATE_EMAIL = `Cancellation details:

Name: Bob Jones
Reason: Financial
Effective date: 03/20/2026`;

const BLANK_DATE_EMAIL = `Cancellation details:

Name: Alice Wu
Reason: Travel
Effective date: `;

const NO_REASON_EMAIL = `Cancellation details:

Name: Carlos Rivera
Effective date: June 1, 2026`;

describe('parseCancellationEmail', () => {
  it('extracts name, reason, and text-format date', () => {
    const result = parseCancellationEmail(BASIC_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('John Smith');
    expect(result?.reason).toBe('Pricing');
    expect(result?.date).toBe('2026-05-15');
    expect(result?.month).toBe('May');
    expect(result?.year).toBe(2026);
  });

  it('handles CRLF line endings', () => {
    const result = parseCancellationEmail(CRLF_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Jane Doe');
    expect(result?.date).toBe('2026-01-03');
    expect(result?.month).toBe('Jan');
  });

  it('handles numeric date format MM/DD/YYYY', () => {
    const result = parseCancellationEmail(NUMERIC_DATE_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.date).toBe('2026-03-20');
    expect(result?.month).toBe('Mar');
  });

  it('returns null date when effective date is blank', () => {
    const result = parseCancellationEmail(BLANK_DATE_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.date).toBeNull();
    expect(result?.month).toBe('');
    expect(result?.year).toBeNull();
  });

  it('returns null reason when reason line is absent', () => {
    const result = parseCancellationEmail(NO_REASON_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.reason).toBeNull();
    expect(result?.date).toBe('2026-06-01');
  });

  it('returns null for completely unparseable input', () => {
    expect(parseCancellationEmail('')).toBeNull();
    expect(parseCancellationEmail('not an email')).toBeNull();
  });
});
