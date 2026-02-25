import { NextRequest, NextResponse } from 'next/server';
import { createLTKClient } from '@/lib/ltk/api-client';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { endpoints } from '@/lib/ltk/endpoints';
import { cacheGet, cacheSet } from '@/lib/cache';
import { isAuthError } from '@/lib/errors';
import type { LTKEngagementResponse } from '@/lib/ltk/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;
  const range = req.nextUrl.searchParams.get('range') ?? 'last_30_days';
  const cacheKey = `engagement:${creatorSlug}:${range}`;

  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    if (creator.status === 'needs_reauth') {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }

    const client = createLTKClient(creatorSlug);
    const res = await client.get<LTKEngagementResponse>(endpoints.engagement(range));

    const data = {
      totalVisits: res.data.total_visits ?? 0,
      productClicks: res.data.product_clicks ?? 0,
      orders: res.data.orders ?? 0,
      itemsSold: res.data.items_sold ?? 0,
      totalSales: res.data.total_sales ?? 0,
      returns: res.data.returns ?? 0,
    };

    cacheSet(cacheKey, data, 15 * 60 * 1000);
    return NextResponse.json(data);
  } catch (err) {
    if (isAuthError(err)) {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }
    console.error(`[engagement:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch engagement' }, { status: 500 });
  }
}
