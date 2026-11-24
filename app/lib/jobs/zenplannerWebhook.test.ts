/**
 * @jest-environment node
 */
import { isValidWebhookKey, parseAttendanceCheckin } from '@/lib/jobs/zenplannerWebhook';

describe('isValidWebhookKey', () => {
  it('accepts the matching key', () => {
    expect(isValidWebhookKey('s3cret', 's3cret')).toBe(true);
  });

  it('rejects a wrong or differently sized key', () => {
    expect(isValidWebhookKey('nope', 's3cret')).toBe(false);
    expect(isValidWebhookKey('s3cret-extra', 's3cret')).toBe(false);
  });

  it('rejects when the key or the server secret is missing', () => {
    expect(isValidWebhookKey(null, 's3cret')).toBe(false);
    expect(isValidWebhookKey('', 's3cret')).toBe(false);
    expect(isValidWebhookKey('s3cret', undefined)).toBe(false);
    expect(isValidWebhookKey('s3cret', '')).toBe(false);
  });
});

// Shape copied from a real delivery, with every value made up.
const checkinBody = (overrides: Record<string, string> = {}) =>
  new URLSearchParams({
    firstName: 'Jamie',
    lastName: 'Example',
    email: ' Jamie.Example@Example.com ',
    phoneNumber: '+1 604 555 0100',
    attendanceId: 'ATT-1',
    personId: 'PERSON-1',
    beginDate: '2026-11-20T19:15',
    timeZone: 'America/Vancouver',
    name: 'Jiu-Jitsu No Gi (Adults | All Levels)',
    isAttendance: '1',
    isRsvp: '0',
    isFreeTrial: 'true',
    isDropIn: 'false',
    SECRET: 'not-used',
    ...overrides,
  }).toString();

describe('parseAttendanceCheckin', () => {
  it('parses a check-in into the shape matching needs', () => {
    expect(parseAttendanceCheckin(checkinBody())).toEqual({
      attendance_id: 'ATT-1',
      person_id: 'PERSON-1',
      first_name: 'Jamie',
      email: 'jamie.example@example.com',
      phone: '6045550100',
      class_name: 'Jiu-Jitsu No Gi (Adults | All Levels)',
      class_date: '2026-11-20',
      class_time: '7:15 PM',
      is_free_trial: true,
      is_drop_in: false,
    });
  });

  it('formats times the way intros store them', () => {
    const time = (t: string) =>
      parseAttendanceCheckin(checkinBody({ beginDate: `2026-11-20T${t}` }))?.class_time;
    expect(time('07:00')).toBe('7:00 AM');
    expect(time('00:30')).toBe('12:30 AM');
    expect(time('12:00')).toBe('12:00 PM');
    expect(time('16:30')).toBe('4:30 PM');
  });

  it('ignores RSVPs and deliveries missing what matching needs', () => {
    expect(parseAttendanceCheckin(checkinBody({ isAttendance: '0', isRsvp: '1' }))).toBeNull();
    expect(parseAttendanceCheckin(checkinBody({ beginDate: '' }))).toBeNull();
    expect(parseAttendanceCheckin(checkinBody({ beginDate: '2026-02-30T19:15' }))).toBeNull();
    expect(parseAttendanceCheckin(checkinBody({ beginDate: '2026-11-20T24:00' }))).toBeNull();
    expect(parseAttendanceCheckin(checkinBody({ beginDate: '2026-11-20T19:60' }))).toBeNull();
    expect(parseAttendanceCheckin(checkinBody({ attendanceId: '' }))).toBeNull();
    expect(parseAttendanceCheckin(checkinBody({ name: ' ' }))).toBeNull();
    expect(parseAttendanceCheckin('')).toBeNull();
  });

  it('stores blank contact fields as null so they never match', () => {
    const parsed = parseAttendanceCheckin(
      checkinBody({ email: '', phoneNumber: '', firstName: '' })
    );
    expect(parsed).toMatchObject({ email: null, phone: null, first_name: null });
  });
});
