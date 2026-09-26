import {
  buildSpamContacts,
  detectSpamSignals,
  type SpamContacts,
  spamLevel,
} from '../detectSpamSignals';

const none: SpamContacts = { emails: new Set(), phones: new Set() };
const detect = (name: string, email: string | null, phone: string | null, c = none) =>
  detectSpamSignals({ name, email, phone }, c);
const SAMPLE = 'Sample Person';

describe('phone_foreign_format (strong)', () => {
  it.each(['03001112222', '0301112222', '0886000111', '0092 300 111 2222', '+92 300 1112222'])(
    'flags %s',
    (phone) => {
      expect(detect(SAMPLE, null, phone)).toContain('phone_foreign_format');
    }
  );

  it.each([
    '604-555-0142',
    '+1 604 555 0142',
    '16045550142',
    '555-0142',
    '604555014',
    '+55 61 99999 0000',
    '',
  ])('does not flag %s', (phone) => {
    expect(detect(SAMPLE, null, phone)).not.toContain('phone_foreign_format');
  });
});

describe('email_long_digit_run (strong)', () => {
  it.each([
    'person803066@example.com',
    'ab5642622@example.com',
    'x12345@example.com',
    'x123456789@example.com',
    'x604555014212@example.com',
  ])('flags %s', (email) => {
    expect(detect(SAMPLE, email, null)).toContain('email_long_digit_run');
  });

  it.each([
    'sampleperson2003@example.com',
    'sample.person@example.com',
    '6045550142@example.com',
    '16045550142@example.com',
    'princess66@example.com',
  ])('does not flag %s', (email) => {
    expect(detect(SAMPLE, email, null)).not.toContain('email_long_digit_run');
  });
});

describe('matches_spam_contact (strong)', () => {
  const contacts = buildSpamContacts([
    { email_normalized: 'spam@example.com', phone_normalized: '6045550199' },
  ]);

  it('matches on normalized email', () => {
    expect(detect(SAMPLE, ' SPAM@example.com', null, contacts)).toContain('matches_spam_contact');
  });

  it('matches on normalized phone including +1', () => {
    expect(detect(SAMPLE, null, '+1 (604) 555-0199', contacts)).toContain('matches_spam_contact');
  });

  it('ignores short phones', () => {
    const short = buildSpamContacts([{ email_normalized: null, phone_normalized: '12345' }]);
    expect(detect(SAMPLE, null, '12345', short)).not.toContain('matches_spam_contact');
  });
});

describe('name signals (weak)', () => {
  it('a normal two-word name has no signals', () => {
    expect(detect(SAMPLE, null, null)).toEqual([]);
  });

  it('flags a single-word name', () => {
    expect(detect('Sample', null, null)).toEqual(['name_single_word']);
  });

  it.each(['Sample Bg', 'Sample Bro', 'Sample Person Xx', 'Sample Li', 'Sample J', 'Test Person'])(
    'flags short/slang word in %s',
    (n) => {
      expect(detect(n, null, null)).toContain('name_short_or_slang_word');
    }
  );

  it.each(['Sample da Silva', 'Sample e Souza', 'Sample van Dyke', 'J. Sample', 'J Sample Person'])(
    'does not flag particles or initials in %s',
    (n) => {
      expect(detect(n, null, null)).not.toContain('name_short_or_slang_word');
    }
  );
});

describe('spamLevel', () => {
  it('strong when any strong code', () => {
    expect(spamLevel({ spam_signals: ['name_single_word', 'phone_foreign_format'] })).toBe(
      'strong'
    );
  });
  it('weak when only weak codes', () => {
    expect(spamLevel({ spam_signals: ['name_single_word'] })).toBe('weak');
  });
  it('null when empty, dismissed, or already spam', () => {
    expect(spamLevel({ spam_signals: [] })).toBeNull();
    expect(
      spamLevel({ spam_signals: ['phone_foreign_format'], spam_warning_dismissed_at: '2026-01-01' })
    ).toBeNull();
    expect(spamLevel({ spam_signals: ['phone_foreign_format'], is_spam: true })).toBeNull();
  });
});
