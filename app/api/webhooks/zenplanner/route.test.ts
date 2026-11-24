/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/jobs/zenplannerWebhook', () => ({
  ...jest.requireActual('@/lib/jobs/zenplannerWebhook'),
  storeZenPlannerWebhook: jest.fn().mockResolvedValue({ error: null }),
  applyAttendanceWebhook: jest.fn().mockResolvedValue(null),
}));

import { storeZenPlannerWebhook } from '@/lib/jobs/zenplannerWebhook';
import { POST } from './route';

const post = (body: string) =>
  POST(
    new NextRequest('http://localhost/api/webhooks/zenplanner?feed=people&key=url-key', {
      method: 'POST',
      body,
    })
  );

describe('POST /api/webhooks/zenplanner body secret', () => {
  beforeEach(() => {
    process.env.ZENPLANNER_WEBHOOK_SECRET = 'url-key';
    delete process.env.ZENPLANNER_BODY_SECRET;
    jest.clearAllMocks();
  });

  it('ignores the body secret until it is configured', async () => {
    expect((await post('firstName=Jamie')).status).toBe(200);
  });

  it('rejects a wrong or missing body secret once configured, without storing', async () => {
    process.env.ZENPLANNER_BODY_SECRET = 'zp-secret';
    expect((await post('firstName=Jamie')).status).toBe(401);
    expect((await post('firstName=Jamie&SECRET=nope')).status).toBe(401);
    expect(storeZenPlannerWebhook).not.toHaveBeenCalled();
    expect((await post('firstName=Jamie&SECRET=zp-secret')).status).toBe(200);
    expect(storeZenPlannerWebhook).toHaveBeenCalledTimes(1);
  });
});
