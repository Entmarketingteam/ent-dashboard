import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAirtableBase, TABLE_NAME } from '@/lib/airtable/client';

export async function GET() {
  let accessToken = '';
  let publisherId = '293045';
  try {
    const records = await getAirtableBase()(TABLE_NAME).select({ maxRecords: 1 }).firstPage();
    const f = records[0]?.fields as Record<string, string>;
    accessToken = f['Access_Token'] ?? '';
    publisherId = f['Publisher_ID'] || '293045';
  } catch (e) {
    return NextResponse.json({ error: 'Airtable failed', detail: String(e) });
  }

  const results: Record<string, unknown> = {};
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Probe all reasonable endpoint variations
  const tests = [
    // RewardStyle gateway - analytics variants
    { key: 'hero_7d', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=last_7_days&publisher_id=${publisherId}` },
    { key: 'hero_this_month', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=this_month&publisher_id=${publisherId}` },
    { key: 'top_7d', url: `https://api-gateway.rewardstyle.com/analytics/top_performers/links?range=last_7_days&publisher_id=${publisherId}&page=1&per_page=5` },
    { key: 'earnings_rs', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1/earnings?range=last_30_days&publisher_id=${publisherId}` },
    { key: 'clicks_rs', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1/clicks?range=last_30_days&publisher_id=${publisherId}` },
    { key: 'orders_rs', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v1/orders?range=last_30_days&publisher_id=${publisherId}` },
    // Try ltk.com domain
    { key: 'ltk_earnings', url: `https://api-gateway.rewardstyle.com/earnings/summary?range=last_30_days` },
    { key: 'ltk_engagement', url: `https://api-gateway.rewardstyle.com/engagement/summary?range=last_30_days` },
    // Alternative creator gateway hostnames
    { key: 'creator_ltk', url: `https://creator-api.ltk.com/v1/earnings/summary?range=last_30_days` },
    { key: 'ltk_api', url: `https://api.ltk.com/v1/earnings/summary?range=last_30_days` },
    // Try the analytics with no publisher_id (uses token sub)
    { key: 'hero_no_pid', url: `https://api-gateway.rewardstyle.com/analytics/hero_chart?range=last_30_days` },
    // v2 analytics
    { key: 'analytics_v2', url: `https://api-gateway.rewardstyle.com/api/creator-analytics/v2/performance_summary?range=last_30_days&publisher_id=${publisherId}` },
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(test.url, { headers, timeout: 8000 });
      results[test.key] = { status: res.status, dataKeys: Object.keys(res.data ?? {}), sample: JSON.stringify(res.data).slice(0, 200) };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        results[test.key] = { status: e.response?.status ?? 'NO_RESPONSE', error: e.message.slice(0, 100) };
      } else {
        results[test.key] = { error: String(e).slice(0, 100) };
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
