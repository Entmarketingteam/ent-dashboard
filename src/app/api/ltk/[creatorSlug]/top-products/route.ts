import { NextRequest, NextResponse } from 'next/server';
import { createLTKClient } from '@/lib/ltk/api-client';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { endpoints } from '@/lib/ltk/endpoints';
import { cacheGet, cacheSet } from '@/lib/cache';
import { isAuthError } from '@/lib/errors';
import type { LTKTopProductsResponse } from '@/lib/ltk/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;
  const range = req.nextUrl.searchParams.get('range') ?? 'last_30_days';
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const cacheKey = `top-products:${creatorSlug}:${range}:${page}`;

  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    if (creator.status === 'needs_reauth') {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }

    const client = createLTKClient(creatorSlug);
    const res = await client.get<LTKTopProductsResponse>(
      endpoints.topProducts(creator.publisherId, range, page)
    );

    const products = (res.data.data ?? []).map((item, idx) => ({
      rank: (page - 1) * 10 + idx + 1,
      title: item.title ?? 'Unknown',
      url: item.url ?? '',
      clicks: item.clicks ?? 0,
      orders: item.orders ?? 0,
      revenue: item.revenue ?? 0,
      image: item.image_url,
    }));

    const data = { products };
    cacheSet(cacheKey, data, 15 * 60 * 1000);
    return NextResponse.json(data);
  } catch (err) {
    if (isAuthError(err)) {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }
    console.error(`[top-products:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch top products' }, { status: 500 });
  }
}
