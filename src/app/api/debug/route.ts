import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAirtableBase, TABLE_NAME } from '@/lib/airtable/client';

export async function GET() {
  let accessToken = '';
  try {
    const records = await getAirtableBase()(TABLE_NAME).select({ maxRecords: 1 }).firstPage();
    const f = records[0]?.fields as Record<string, string>;
    accessToken = f['Access_Token'] ?? '';
  } catch (e) {
    return NextResponse.json({ error: 'Airtable failed', detail: String(e) });
  }

  const results: Record<string, unknown> = {};
  const headers = { Authorization: `Bearer ${accessToken}` };
  const profileId = '6cc59976-d411-11e8-9fed-0242ac110002';
  const publisherId = '293045';

  // LTK IDs from real posts
  const ltkIds = '841178cf-1246-11f1-bf53-0242ac11002b,1f999880-1238-11f1-a990-0242ac110007,65781b58-1235-11f1-b2f3-0242ac11001a';
  const productIds = '865f5030-1246-11f1-9111-0242ac110024,22ac4c4d-1238-11f1-8130-0242ac110023,6744a450-1235-11f1-8cef-0242ac110020';

  const tests = [
    // Click data for specific LTK IDs
    { key: 'ltk_clicks', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?ids=${ltkIds}` },
    { key: 'ltk_clicks_range', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/clicks?ids=${ltkIds}&range=last_30_days` },
    // Try analytics per ltk
    { key: 'ltk_analytics', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks/analytics?ids=${ltkIds}` },
    // Date range filtering on ltks
    { key: 'ltks_date_filter', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=10&status=PUBLISHED&date_published_start=2026-01-26&date_published_end=2026-02-25` },
    // Publisher analytics endpoint
    { key: 'pub_analytics_v2', url: `https://api-gateway.rewardstyle.com/api/pub/v2/analytics?publisher_id=${publisherId}&range=last_30_days` },
    { key: 'pub_v2_earnings', url: `https://api-gateway.rewardstyle.com/api/pub/v2/earnings?publisher_id=${publisherId}&range=last_30_days` },
    // Try product clicks
    { key: 'product_clicks', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/products/clicks?ids=${productIds}&range=last_30_days` },
    // Try the rstyle link analytics
    { key: 'link_stats', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/links/stats?publisher_id=${publisherId}&range=last_30_days` },
    // Try with ?include=analytics
    { key: 'ltks_with_analytics', url: `https://api-gateway.rewardstyle.com/api/ltk/v2/ltks?profile_id=${profileId}&limit=3&include=analytics` },
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(test.url, { headers, timeout: 8000 });
      results[test.key] = { status: res.status, sample: JSON.stringify(res.data).slice(0, 400) };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        results[test.key] = { status: e.response?.status ?? 'NO_RESPONSE', sample: JSON.stringify(e.response?.data ?? '').slice(0, 200) };
      } else {
        results[test.key] = { error: String(e).slice(0, 100) };
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
