import { NextRequest, NextResponse } from 'next/server';
import { createLTKClient } from '@/lib/ltk/api-client';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { endpoints } from '@/lib/ltk/endpoints';
import { cacheGet, cacheSet } from '@/lib/cache';
import { isAuthError } from '@/lib/errors';
import type { LTKEarningsResponse } from '@/lib/ltk/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;
  const range = req.nextUrl.searchParams.get('range') ?? 'last_30_days';
  const cacheKey = `earnings:${creatorSlug}:${range}`;

  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    if (creator.status === 'needs_reauth') {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }

    const client = createLTKClient(creatorSlug);
    const res = await client.get<LTKEarningsResponse>(endpoints.earnings(range));

    const data = {
      commissions: res.data.commissions ?? 0,
      pendingPayment: res.data.pending_payment ?? 0,
      currency: res.data.currency ?? 'USD',
    };

    cacheSet(cacheKey, data, 15 * 60 * 1000);
    return NextResponse.json(data);
  } catch (err) {
    if (isAuthError(err)) {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }
    console.error(`[earnings:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
