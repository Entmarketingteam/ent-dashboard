import { NextRequest, NextResponse } from 'next/server';
import { getAllCreators } from '@/lib/airtable/tokens';
import { createLTKClient } from '@/lib/ltk/api-client';
import { endpoints } from '@/lib/ltk/endpoints';
import { cacheSet } from '@/lib/cache';
import type { LTKHeroChartResponse, LTKEarningsResponse, LTKEngagementResponse } from '@/lib/ltk/types';

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creators = await getAllCreators();
  const results: Record<string, string> = {};
  const range = 'last_30_days';

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

      results[creator.slug] = 'synced';
    } catch (err) {
      results[creator.slug] = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
