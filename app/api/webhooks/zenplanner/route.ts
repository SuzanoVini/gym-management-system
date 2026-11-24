import { type NextRequest, NextResponse } from 'next/server';
import {
  applyAttendanceWebhook,
  isValidWebhookKey,
  storeZenPlannerWebhook,
} from '@/lib/jobs/zenplannerWebhook';
import { reportConsoleError } from '@/lib/logger';

const FEEDS = new Set(['people', 'class-sessions', 'attendance']);

// The URL carries our own key (?key=). Every delivery is stored raw first; attendance
// check-ins are then matched to intros and members.
export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (!isValidWebhookKey(searchParams.get('key'), process.env.ZENPLANNER_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feed = searchParams.get('feed') ?? '';
  if (!FEEDS.has(feed)) {
    return NextResponse.json({ error: 'Unknown feed' }, { status: 400 });
  }

  const body = await req.text();
  const { error } = await storeZenPlannerWebhook(feed, Object.fromEntries(req.headers), body);

  // A non-2xx lets Zen Planner retry, if it does retries, instead of losing the event.
  if (error) {
    return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
  }

  // The raw row is safe, and the import-intros cron replays recent rows, so a matching
  // failure here is logged rather than failing the delivery.
  if (feed === 'attendance') {
    try {
      await applyAttendanceWebhook(body);
    } catch (err) {
      reportConsoleError('Zen Planner attendance matching failed', err);
    }
  }
  return NextResponse.json({ ok: true });
}
