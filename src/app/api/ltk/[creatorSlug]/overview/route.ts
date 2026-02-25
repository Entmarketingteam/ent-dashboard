import { NextRequest, NextResponse } from 'next/server';
import { createLTKClient } from '@/lib/ltk/api-client';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { endpoints } from '@/lib/ltk/endpoints';
import { cacheGet, cacheSet } from '@/lib/cache';
import { isAuthError } from '@/lib/errors';
import type {
  LTKAnalyticsSummaryResponse,
  LTKFollowersResponse,
  LTKEarningsResponse,
  LTKEngagementResponse,
} from '@/lib/ltk/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;
  const range = req.nextUrl.searchParams.get('range') ?? 'last_30_days';
  const cacheKey = `overview:${creatorSlug}:${range}`;

  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    if (creator.status === 'needs_reauth') {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }

    const client = createLTKClient(creatorSlug);

    const [summary, followers, earnings, engagement] = await Promise.allSettled([
      client.get<LTKAnalyticsSummaryResponse>(endpoints.analyticsSummary(range)),
      client.get<LTKFollowersResponse>(endpoints.followers(range)),
      client.get<LTKEarningsResponse>(endpoints.earnings(range)),
      client.get<LTKEngagementResponse>(endpoints.engagement(range)),
    ]);

    const data = {
      impressions: summary.status === 'fulfilled' ? (summary.value.data.post_impressions ?? 0) : 0,
      postsCount: summary.status === 'fulfilled' ? (summary.value.data.posts_count ?? 0) : 0,
      followersTotal: followers.status === 'fulfilled' ? (followers.value.data.followers_total ?? 0) : 0,
      followersNetChange: followers.status === 'fulfilled' ? (followers.value.data.net_change ?? 0) : 0,
      commissions: earnings.status === 'fulfilled' ? (earnings.value.data.commissions ?? 0) : 0,
      pendingPayment: earnings.status === 'fulfilled' ? (earnings.value.data.pending_payment ?? 0) : 0,
      currency: earnings.status === 'fulfilled' ? (earnings.value.data.currency ?? 'USD') : 'USD',
      totalVisits: engagement.status === 'fulfilled' ? (engagement.value.data.total_visits ?? 0) : 0,
      productClicks: engagement.status === 'fulfilled' ? (engagement.value.data.product_clicks ?? 0) : 0,
      orders: engagement.status === 'fulfilled' ? (engagement.value.data.orders ?? 0) : 0,
      itemsSold: engagement.status === 'fulfilled' ? (engagement.value.data.items_sold ?? 0) : 0,
      totalSales: engagement.status === 'fulfilled' ? (engagement.value.data.total_sales ?? 0) : 0,
      returns: engagement.status === 'fulfilled' ? (engagement.value.data.returns ?? 0) : 0,
    };

    cacheSet(cacheKey, data, 15 * 60 * 1000); // 15 min cache
    return NextResponse.json(data);
  } catch (err) {
    if (isAuthError(err)) {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }
    console.error(`[overview:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}
