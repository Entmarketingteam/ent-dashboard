import { NextRequest, NextResponse } from 'next/server';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { getValidToken } from '@/lib/ltk/token-manager';
import { endpoints } from '@/lib/ltk/endpoints';
import axios from 'axios';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;
  const url = new URL(req.url);

  const range = url.searchParams.get('range') ?? 'last_30_days';

  try {
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });

    let token: string;
    try {
      token = await getValidToken(creatorSlug);
    } catch {
      return NextResponse.json({ error: 'needs_reauth', slug: creatorSlug }, { status: 401 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'x-id-token': creator.idToken ?? '',
      'Content-Type': 'application/json',
    };

    const [earningsRes, engagementRes] = await Promise.allSettled([
      axios.get(endpoints.earnings(range), { headers }),
      axios.get(endpoints.engagement(range), { headers }),
    ]);

    const earnings = earningsRes.status === 'fulfilled' ? earningsRes.value.data : null;
    const engagement = engagementRes.status === 'fulfilled' ? engagementRes.value.data : null;

    // commissions field may be a number or nested object
    const commissionValue = earnings
      ? typeof earnings.commissions === 'object'
        ? (earnings.commissions?.total ?? earnings.commissions?.amount ?? earnings.commissions)
        : earnings.commissions
      : null;

    const commissionData = earnings
      ? {
          total_earned: commissionValue ?? null,
          pending: earnings.pending_payment ?? null,
          currency: earnings.currency ?? 'USD',
        }
      : null;

    const performanceData = engagement
      ? {
          clicks: engagement.product_clicks ?? null,
          orders: engagement.orders ?? null,
          revenue: engagement.total_sales ?? null,
          items_sold: engagement.items_sold ?? null,
          total_visits: engagement.total_visits ?? null,
        }
      : null;

    return NextResponse.json({
      slug: creatorSlug,
      range,
      commissions: commissionData,
      performance: performanceData,
      top_products: [],
      items_sold_count: engagement?.items_sold ?? 0,
    });
  } catch (err) {
    console.error(`[ltk:earnings:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
