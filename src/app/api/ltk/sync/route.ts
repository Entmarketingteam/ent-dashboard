import { NextRequest, NextResponse } from 'next/server';
import { getAllCreators } from '@/lib/airtable/tokens';
import { getValidToken } from '@/lib/ltk/token-manager';

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creators = await getAllCreators();
  const results: Record<string, string> = {};

  for (const creator of creators) {
    if (creator.status === 'needs_reauth') {
      results[creator.slug] = 'skipped (needs_reauth)';
      continue;
    }
    try {
      await getValidToken(creator.slug);
      results[creator.slug] = 'synced';
    } catch (err) {
      results[creator.slug] = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
