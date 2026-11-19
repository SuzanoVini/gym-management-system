import { type NextRequest, NextResponse } from 'next/server';
import { isValidWebhookKey, storeZenPlannerWebhook } from '@/lib/jobs/zenplannerWebhook';

const FEEDS = new Set(['people', 'class-sessions', 'attendance']);

// Capture-only endpoint. Zen Planner's webhook format is undocumented, so the URL
// carries our own key (?key=) and every delivery is stored raw for inspection.
export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (!isValidWebhookKey(searchParams.get('key'), process.env.ZENPLANNER_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feed = searchParams.get('feed') ?? '';
  if (!FEEDS.has(feed)) {
    return NextResponse.json({ error: 'Unknown feed' }, { status: 400 });
  }

  const { error } = await storeZenPlannerWebhook(
    feed,
    Object.fromEntries(req.headers),
    await req.text()
  );

  // A non-2xx lets Zen Planner retry, if it does retries, instead of losing the event.
  if (error) {
    return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
