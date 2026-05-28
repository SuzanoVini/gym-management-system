import { parseHoldEmail } from './hold-parser';

const FULL_EMAIL = `Membership hold details:

Name: Sarah Chen
Start date: May 15, 2026
End date: June 15, 2026
Reason: Travel
Hold Status: Approved`;

const CRLF_EMAIL = `Membership hold details:\r\n\r\nName: Marcus Webb\r\nStart date: January 10, 2026\r\nEnd date: February 10, 2026\r\nReason: Injury\r\nHold Status: Pending`;

const NO_END_DATE_EMAIL = `Membership hold details:

Name: Priya Nair
Start date: March 1, 2026
End date: 
Reason: Personal
Hold Status: Approved`;

const NUMERIC_DATES_EMAIL = `Membership hold details:

Name: Daniel Ko
Start date: 04/01/2026
End date: 05/01/2026
Reason: Surgery
Hold Status: Active`;

describe('parseHoldEmail', () => {
  it('extracts all fields from a full email', () => {
    const result = parseHoldEmail(FULL_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Sarah Chen');
    expect(result?.start).toBe('2026-05-15');
    expect(result?.end).toBe('2026-06-15');
    expect(result?.reason).toBe('Travel');
    expect(result?.hold_status).toBe('Approved');
    expect(result?.month).toBe('May');
    expect(result?.year).toBe(2026);
  });

  it('handles CRLF line endings', () => {
    const result = parseHoldEmail(CRLF_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Marcus Webb');
    expect(result?.start).toBe('2026-01-10');
    expect(result?.hold_status).toBe('Pending');
  });

  it('returns null end when end date is blank', () => {
    const result = parseHoldEmail(NO_END_DATE_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.end).toBeNull();
    expect(result?.start).toBe('2026-03-01');
  });

  it('handles numeric date format MM/DD/YYYY', () => {
    const result = parseHoldEmail(NUMERIC_DATES_EMAIL);
    expect(result).not.toBeNull();
    expect(result?.start).toBe('2026-04-01');
    expect(result?.end).toBe('2026-05-01');
    expect(result?.hold_status).toBe('Active');
  });

  it('handles abbreviated month names', () => {
    const result = parseHoldEmail(
      `Membership hold details:\n\nName: Alex Kim\nStart date: Jun 15, 2026\nEnd date: Aug 1, 2026\nReason: Travel\nHold Status: Approved`
    );
    expect(result).not.toBeNull();
    expect(result?.start).toBe('2026-06-15');
    expect(result?.end).toBe('2026-08-01');
    expect(result?.month).toBe('Jun');
    expect(result?.year).toBe(2026);
  });

  it('returns null for unparseable input (no name)', () => {
    expect(parseHoldEmail('')).toBeNull();
    expect(parseHoldEmail('no name field here')).toBeNull();
  });

  it('returns null start for unparseable start date', () => {
    const result = parseHoldEmail(
      `Membership hold details:\n\nName: Test\nStart date: \nHold Status: Approved`
    );
    expect(result).toBeNull();
  });
});
