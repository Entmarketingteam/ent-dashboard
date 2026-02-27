import { NextRequest, NextResponse } from 'next/server';
import { getCreatorBySlug } from '@/lib/airtable/tokens';
import { getValidToken } from '@/lib/ltk/token-manager';
import axios from 'axios';

const LTK_API = 'https://api-gateway.rewardstyle.com/api/co-api/v1';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorSlug: string }> }
) {
  const { creatorSlug } = await params;
  const url = new URL(req.url);

  const today = new Date();
  const endDate = url.searchParams.get('end') ?? today.toISOString().split('T')[0];
  const startDate =
    url.searchParams.get('start') ??
    new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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

    const [commissionsRes, performanceRes, itemsSoldRes] = await Promise.allSettled([
      axios.get(`${LTK_API}/creator-analytics/v1/commissions_summary?currency=USD`, { headers }),
      axios.get(
        `${LTK_API}/creator-analytics/v1/performance_summary?start_date=${startDate}&end_date=${endDate}&timezone=UTC`,
        { headers }
      ),
      axios.get(
        `${LTK_API}/creator-analytics/v1/items_sold/?limit=100&start=${startDate}&end=${endDate}&currency=USD`,
        { headers }
      ),
    ]);

    const commissions =
      commissionsRes.status === 'fulfilled' ? commissionsRes.value.data : null;
    const performance =
      performanceRes.status === 'fulfilled' ? performanceRes.value.data : null;
    const itemsSold =
      itemsSoldRes.status === 'fulfilled' ? itemsSoldRes.value.data : null;

    // Normalize commissions
    const commissionData = commissions
      ? {
          total_earned: commissions.total_earned ?? commissions.total ?? null,
          total_paid: commissions.total_paid ?? null,
          pending: commissions.pending ?? null,
          currency: commissions.currency ?? 'USD',
          period: commissions.period ?? null,
        }
      : null;

    // Normalize performance
    const performanceData = performance
      ? {
          clicks: performance.clicks ?? performance.total_clicks ?? null,
          orders: performance.orders ?? performance.total_orders ?? null,
          revenue: performance.revenue ?? performance.total_revenue ?? null,
          conversion_rate: performance.conversion_rate ?? null,
          avg_order_value: performance.avg_order_value ?? null,
        }
      : null;

    // Normalize items sold — top products by revenue
    const items: Array<Record<string, unknown>> = Array.isArray(itemsSold?.items_sold)
      ? itemsSold.items_sold
      : Array.isArray(itemsSold)
      ? itemsSold
      : [];

    const topProducts = items
      .map((item) => ({
        title: item.product_title ?? item.title ?? 'Unknown',
        retailer: item.retailer_display_name ?? item.retailer ?? '',
        revenue: parseFloat(String(item.commission ?? item.revenue ?? 0)),
        orders: item.order_count ?? item.quantity ?? 1,
        image: item.hero_image ?? item.image ?? null,
        url: item.share_url ?? item.url ?? null,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      slug: creatorSlug,
      date_range: { start: startDate, end: endDate },
      commissions: commissionData,
      performance: performanceData,
      top_products: topProducts,
      items_sold_count: items.length,
    });
  } catch (err) {
    console.error(`[ltk:earnings:${creatorSlug}]`, err);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
