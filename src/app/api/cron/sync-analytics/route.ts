import { NextRequest, NextResponse } from 'next/server';
import { getAllCreators } from '@/lib/airtable/tokens';
import { createLTKClient } from '@/lib/ltk/api-client';
import { endpoints } from '@/lib/ltk/endpoints';
import { cacheSet } from '@/lib/cache';
import { ensurePostsTable } from '@/lib/airtable/posts';
import { syncCreatorPosts } from '@/lib/ltk/sync';
import { getValidToken } from '@/lib/ltk/token-manager';
import type { LTKHeroChartResponse, LTKEarningsResponse, LTKEngagementResponse } from '@/lib/ltk/types';

const NICKI_PROFILE_ID = '6cc59976-d411-11e8-9fed-0242ac110002';

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creators = await getAllCreators();
  const results: Record<string, string> = {};
  const range = 'last_30_days';

  const today = new Date();
  const syncEnd = today.toISOString().split('T')[0];
  const syncStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  await ensurePostsTable();

  for (const creator of creators) {
    if (creator.status === 'needs_reauth') {
      results[creator.slug] = 'skipped';
      continue;
    }
    try {
      const client = createLTKClient(creator.slug);
      const [heroChart, earnings, engagement] = await Promise.allSettled([
        client.get<LTKHeroChartResponse>(endpoints.heroChart(creator.publisherId, range)),
        client.get<LTKEarningsResponse>(endpoints.earnings(range)),
        client.get<LTKEngagementResponse>(endpoints.engagement(range)),
      ]);

      if (heroChart.status === 'fulfilled') {
        cacheSet(`hero-chart:${creator.slug}:${range}`, { data: heroChart.value.data.data ?? [] }, 4 * 60 * 60 * 1000);
      }
      if (earnings.status === 'fulfilled') {
        cacheSet(`earnings:${creator.slug}:${range}`, earnings.value.data, 4 * 60 * 60 * 1000);
      }
      if (engagement.status === 'fulfilled') {
        cacheSet(`engagement:${creator.slug}:${range}`, engagement.value.data, 4 * 60 * 60 * 1000);
      }

      // Sync last 7 days of posts to keep cache fresh
      try {
        const token = await getValidToken(creator.slug);
        const profileId = creator.profileId ?? NICKI_PROFILE_ID;
        await syncCreatorPosts(creator.slug, profileId, token, syncStart, syncEnd);
      } catch {
        // Non-fatal — analytics sync continues even if post sync fails
      }

      results[creator.slug] = 'synced';
    } catch (err) {
      results[creator.slug] = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
