import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAirtableBase, TABLE_NAME } from '@/lib/airtable/client';

export async function GET() {
  // Get token from Airtable
  let accessToken = '';
  let publisherId = '';
  try {
    const records = await getAirtableBase()(TABLE_NAME).select({ maxRecords: 1 }).firstPage();
    const f = records[0]?.fields as Record<string, string>;
    accessToken = f['Access_Token'] ?? '';
    publisherId = f['Publisher_ID'] ?? '293045';
  } catch (e) {
    return NextResponse.json({ error: 'Airtable failed', detail: String(e) });
  }

  const results: Record<string, unknown> = {};
  const headers = { Authorization: `Bearer ${accessToken}` };

  const tests = [
    { key: 'earnings', url: `https://creator-api-gateway.shopltk.com/v1/earnings/summary?range=last_30_days` },
    { key: 'engagement', url: `https://creator-api-gateway.shopltk.com/v1/engagement/summary?range=last_30_days` },
    { key: 'followers', url: `https://creator-api-gateway.shopltk.com/v1/community/followers?range=last_30_days` },
    { key: 'analytics_summary', url: `https://creator-api-gateway.shopltk.com/v1/analytics/summary?range=last_30_days` },
    { key: 'hero_chart', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=last_30_days&publisher_id=${publisherId}` },
    { key: 'top_products', url: `https://api-gateway.rewardstyle.com/analytics/top_performers/links?range=last_30_days&publisher_id=${publisherId}&page=1&per_page=5` },
    { key: 'perf_summary', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1/performance_summary?range=last_30_days&publisher_id=${publisherId}` },
    { key: 'commissions', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1/commissions_summary?range=last_30_days&publisher_id=${publisherId}` },
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(test.url, { headers, timeout: 10000 });
      results[test.key] = { status: res.status, data: res.data };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        results[test.key] = { status: e.response?.status ?? 'NO_RESPONSE', error: e.message, data: e.response?.data };
      } else {
        results[test.key] = { error: String(e) };
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
