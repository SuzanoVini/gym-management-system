/**
 * @jest-environment node
 */
import { isValidWebhookKey } from '@/lib/jobs/zenplannerWebhook';

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
